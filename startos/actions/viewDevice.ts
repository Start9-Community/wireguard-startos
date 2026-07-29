import { store } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { profileResult, readStore, requireConfigured } from './helpers'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  id: Value.dynamicSelect(async () => {
    const devices = (await readStore()).devices
    return {
      name: i18n('Device'),
      description: i18n('Choose the device whose profile you want to view.'),
      values: Object.fromEntries(
        devices.map((device) => [device.id, device.name]),
      ),
      default: devices[0]?.id ?? '',
    }
  }),
})

export const viewDevice = sdk.Action.withInput(
  'view-device',
  async ({ effects }) => {
    const devices = (await store.read().const(effects))?.devices ?? []
    return {
      name: i18n('View Device Profile'),
      description: i18n('Show a device profile as a QR code and text.'),
      warning: i18n(
        'This profile contains a private key. Only show or copy it on a device you trust.',
      ),
      allowedStatuses: 'any',
      group: i18n('Devices'),
      visibility: devices.length
        ? 'enabled'
        : { disabled: i18n('Add a device first.') },
    }
  },
  inputSpec,
  async () => ({}),
  async ({ input }) => {
    const current = await readStore()
    const config = requireConfigured(current)
    const device = current.devices.find(
      (candidate) => candidate.id === input.id,
    )
    if (!device) throw new Error(i18n('This device no longer exists.'))
    return profileResult(
      i18n('Device Profile'),
      i18n('Scan the code or copy the profile text into the WireGuard app.'),
      config,
      device,
    )
  },
)
