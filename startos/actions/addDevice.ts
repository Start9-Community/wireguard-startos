import { randomUUID } from 'node:crypto'
import { store } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { allocateDeviceAddress } from '../utils'
import {
  generateDeviceKeys,
  profileResult,
  readStore,
  requireConfigured,
} from './helpers'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  name: Value.text({
    name: i18n('Device name'),
    description: i18n(
      'Use a name you will recognize later, such as “My phone”.',
    ),
    required: true,
    default: null,
    placeholder: i18n('My phone'),
    minLength: 1,
    maxLength: 32,
    patterns: [
      {
        regex: '^[A-Za-z0-9][A-Za-z0-9 _.-]{0,31}$',
        description: i18n(
          'Start with a letter or number and use only letters, numbers, spaces, dots, dashes, or underscores.',
        ),
      },
    ],
  }),
  allowWan: Value.toggle({
    name: i18n('Allow WAN traffic'),
    description: i18n(
      'Allow this device to access the internet through WireGuard.',
    ),
    warning: null,
    default: true,
  }),
  allowLan: Value.toggle({
    name: i18n('Allow LAN traffic'),
    description: i18n(
      'Allow this device to access private home-network addresses.',
    ),
    warning: null,
    default: true,
  }),
  allowLocal: Value.toggle({
    name: i18n('Allow local traffic'),
    description: i18n(
      'Allow this device to access StartOS services and other WireGuard devices.',
    ),
    warning: i18n(
      'This can expose services that are not enabled on a LAN or Public address.',
    ),
    default: false,
  }),
})

export const addDevice = sdk.Action.withInput(
  'add-device',
  async ({ effects }) => {
    const configured = Boolean(
      (await store.read().const(effects))?.endpointHost,
    )
    return {
      name: i18n('Add Device'),
      description: i18n('Create a WireGuard profile for a phone or computer.'),
      warning: null,
      allowedStatuses: 'any',
      group: i18n('Devices'),
      visibility: configured
        ? 'enabled'
        : { disabled: i18n('Complete first-time setup first.') },
    }
  },
  inputSpec,
  async () => ({}),
  async ({ effects, input }) => {
    const current = await readStore()
    const config = requireConfigured(current)
    const duplicate = current.devices.some(
      (device) => device.name.toLowerCase() === input.name.toLowerCase(),
    )
    if (duplicate) {
      throw new Error(i18n('A device with this name already exists.'))
    }
    if (current.devices.length >= 253) {
      throw new Error(i18n('This server has no free device addresses.'))
    }

    const keys = await generateDeviceKeys(effects)
    const device = {
      id: randomUUID(),
      name: input.name,
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
      presharedKey: keys.presharedKey,
      address: allocateDeviceAddress(current.ipv4Cidr, current.devices),
      createdAt: new Date().toISOString(),
      allowWan: input.allowWan,
      allowLan: input.allowLan,
      allowLocal: input.allowLocal,
    }

    await store.merge(effects, { devices: [...current.devices, device] })
    return profileResult(
      i18n('Device Added'),
      i18n(
        'Import this profile into the WireGuard app now. You can view it again later from Actions.',
      ),
      { ...config, devices: [...current.devices, device] },
      device,
    )
  },
)
