import { randomUUID } from 'node:crypto'
import { T } from '@start9labs/start-sdk'
import { emptyStore, store, Store } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { Device, renderDeviceConfig, WireGuardConfig } from '../utils'

type KeyPair = {
  privateKey: string
  publicKey: string
}

export async function readStore(): Promise<Store> {
  return (await store.read().once()) ?? emptyStore()
}

export function requireConfigured(config: Store): WireGuardConfig {
  if (
    !config.endpointHost ||
    !config.serverPrivateKey ||
    !config.serverPublicKey ||
    !config.dns
  ) {
    throw new Error(i18n('Complete first-time setup before managing devices.'))
  }
  return {
    endpointHost: config.endpointHost,
    endpointPort: config.endpointPort,
    ipv4Cidr: config.ipv4Cidr,
    ipv6Cidr: config.ipv6Cidr,
    serverPrivateKey: config.serverPrivateKey,
    serverPublicKey: config.serverPublicKey,
    dns: config.dns,
    devices: config.devices,
  }
}

async function generateKeys(
  effects: T.Effects,
  includePresharedKey: boolean,
): Promise<KeyPair & { presharedKey?: string }> {
  return sdk.SubContainer.withTemp(
    effects,
    { imageId: 'wireguard' },
    null,
    `generate-keys-${randomUUID()}`,
    async (sub) => {
      const result = await sub.execFail([
        'sh',
        '-c',
        includePresharedKey
          ? 'private="$(wg genkey)"; public="$(printf "%s" "$private" | wg pubkey)"; psk="$(wg genpsk)"; printf "%s\\n%s\\n%s\\n" "$private" "$public" "$psk"'
          : 'private="$(wg genkey)"; public="$(printf "%s" "$private" | wg pubkey)"; printf "%s\\n%s\\n" "$private" "$public"',
      ])
      const values = result.stdout.toString().trim().split('\n')
      if (values.length < (includePresharedKey ? 3 : 2)) {
        throw new Error('WireGuard did not return valid keys')
      }
      return {
        privateKey: values[0],
        publicKey: values[1],
        ...(includePresharedKey ? { presharedKey: values[2] } : {}),
      }
    },
  )
}

export function generateServerKeys(effects: T.Effects): Promise<KeyPair> {
  return generateKeys(effects, false)
}

export async function generateDeviceKeys(
  effects: T.Effects,
): Promise<KeyPair & { presharedKey: string }> {
  const keys = await generateKeys(effects, true)
  if (!keys.presharedKey)
    throw new Error('WireGuard did not return a shared key')
  return { ...keys, presharedKey: keys.presharedKey }
}

export function profileResult(
  title: string,
  message: string,
  config: WireGuardConfig,
  device: Device,
) {
  const profile = renderDeviceConfig(config, device)
  return {
    version: '1' as const,
    title,
    message,
    result: {
      type: 'single' as const,
      name: i18n('WireGuard profile'),
      description: i18n(
        'Scan this code with the WireGuard app, or copy the profile text.',
      ),
      value: profile,
      masked: false,
      copyable: true,
      qr: true,
    },
  }
}
