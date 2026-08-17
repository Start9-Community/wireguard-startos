import { isIP } from 'node:net'
import { enabledPublicEndpoints } from '../endpoint'
import { store } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { wireguardPort } from '../utils'
import { generateServerKeys, readStore } from './helpers'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  address: Value.dynamicSelect(async ({ effects }) => {
    const endpoints = await enabledPublicEndpoints(effects)
    const values = Object.fromEntries(
      endpoints.map(({ hostname }) => [
        hostname,
        isIP(hostname) === 6 ? `[${hostname}]` : hostname,
      ]),
    )

    return {
      name: i18n('Public address'),
      description: i18n(
        'Choose an enabled Public address for your devices to use.',
      ),
      values,
      default: endpoints[0]?.hostname ?? '',
      disabled: endpoints.length
        ? false
        : i18n('Enable a Public address under WireGuard Endpoint first.'),
    }
  }),
  port: Value.dynamicNumber(async ({ effects }) => {
    const endpoints = await enabledPublicEndpoints(effects)
    return {
      name: i18n('Public port'),
      description: i18n(
        'The UDP port your devices use outside your home. This may differ from the internal WireGuard port if your router translates it.',
      ),
      required: true,
      default: endpoints[0]?.port ?? wireguardPort,
      min: 1,
      max: 65535,
      integer: true,
      step: 1,
      placeholder: null,
      units: null,
    }
  }),
})

export const configure = sdk.Action.withInput(
  'configure',
  async ({ effects }) => {
    const endpoints = await enabledPublicEndpoints(effects)
    const needsPublicAddress = endpoints.length === 0
    return {
      name: needsPublicAddress
        ? i18n('Enable a Public Address')
        : i18n('Set Connection Address'),
      description: i18n(
        'Choose where your devices connect to this WireGuard server.',
      ),
      warning: needsPublicAddress
        ? null
        : i18n(
            'Changing this setting does not update profiles already added to your devices. View and import those profiles again after changing it.',
          ),
      allowedStatuses: 'any',
      group: i18n('Tunnel Settings'),
      visibility: needsPublicAddress
        ? {
            disabled: i18n(
              'Go to Interfaces → WireGuard Endpoint and enable a “Public” address.',
            ),
          }
        : 'enabled',
    }
  },
  inputSpec,
  async ({ effects }) => {
    const current = await readStore()
    const endpoints = await enabledPublicEndpoints(effects)
    const currentEndpoint = endpoints.find(
      ({ hostname }) => hostname === current.endpointHost,
    )
    const selected = currentEndpoint ?? endpoints[0]
    if (!selected) return { port: wireguardPort }
    return {
      address: selected.hostname,
      port: currentEndpoint ? current.endpointPort : selected.port,
    }
  },
  async ({ effects, input }) => {
    const endpoints = await enabledPublicEndpoints(effects)
    const selected = endpoints.find(
      ({ hostname }) => hostname === input.address,
    )
    if (!selected) {
      throw new Error(i18n('The selected public address is no longer enabled.'))
    }

    const current = await readStore()
    const keys =
      current.serverPrivateKey && current.serverPublicKey
        ? {
            privateKey: current.serverPrivateKey,
            publicKey: current.serverPublicKey,
          }
        : await generateServerKeys(effects)

    await store.merge(effects, {
      endpointHost: selected.hostname,
      endpointPort: input.port,
      serverPrivateKey: keys.privateKey,
      serverPublicKey: keys.publicKey,
    })
  },
)
