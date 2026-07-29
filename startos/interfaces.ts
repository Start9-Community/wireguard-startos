import { i18n } from './i18n'
import { sdk } from './sdk'
import { wireguardPort } from './utils'

export const endpointHostId = 'wireguard'
export const endpointInterfaceId = 'wireguard'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const host = sdk.MultiHost.of(effects, endpointHostId)
  const origin = await host.bindPort(wireguardPort, {
    protocol: null,
    preferredExternalPort: wireguardPort,
    addSsl: null,
    secure: { ssl: false },
  })
  const wireguard = sdk.createInterface(effects, {
    name: i18n('WireGuard Endpoint'),
    id: endpointInterfaceId,
    description: i18n('Receives secure connections from your devices'),
    type: 'p2p',
    masked: false,
    schemeOverride: { ssl: null, noSsl: null },
    username: null,
    path: '',
    query: {},
  })

  return [await origin.export([wireguard])]
})
