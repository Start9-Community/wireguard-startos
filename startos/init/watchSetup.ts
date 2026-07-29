import { addDevice } from '../actions/addDevice'
import { configure } from '../actions/configure'
import { enabledPublicEndpoints } from '../endpoint'
import { store } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const watchSetup = sdk.setupOnInit(async (effects) => {
  const endpoints = await enabledPublicEndpoints(effects)
  const current = await store.read().const(effects)

  await sdk.action.clearTask(
    effects,
    'wireguard:configure',
    'wireguard:add-device',
  )

  if (!endpoints.length) {
    await sdk.action.createOwnTask(effects, configure, 'critical', {
      reason: i18n('Enable a Public Address'),
    })
    return
  }

  const selectedAddressIsEnabled = endpoints.some(
    ({ hostname }) => hostname === current?.endpointHost,
  )
  if (!selectedAddressIsEnabled) {
    await sdk.action.createOwnTask(effects, configure, 'critical', {
      reason: i18n('Choose the enabled Public address your devices will use.'),
    })
    return
  }

  if (!current?.devices.length) {
    await sdk.action.createOwnTask(effects, addDevice, 'critical', {
      reason: i18n('Add a device to start using WireGuard.'),
    })
  }
})
