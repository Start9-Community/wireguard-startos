import { store } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { readStore } from './helpers'

const { InputSpec, Value, Variants } = sdk

function accessSpec(defaults: {
  allowWan: boolean
  allowLan: boolean
  allowLocal: boolean
}) {
  return InputSpec.of({
    allowWan: Value.toggle({
      name: i18n('Allow WAN traffic'),
      description: i18n(
        'Allow this device to access the internet through WireGuard.',
      ),
      warning: null,
      default: defaults.allowWan,
    }),
    allowLan: Value.toggle({
      name: i18n('Allow LAN traffic'),
      description: i18n(
        'Allow this device to access private home-network addresses.',
      ),
      warning: null,
      default: defaults.allowLan,
    }),
    allowLocal: Value.toggle({
      name: i18n('Allow local traffic'),
      description: i18n(
        'Allow this device to access StartOS services and other WireGuard devices.',
      ),
      warning: i18n(
        'This can expose services that are not enabled on a LAN or Public address.',
      ),
      default: defaults.allowLocal,
    }),
  })
}

const inputSpec = InputSpec.of({
  device: Value.dynamicUnion(async () => {
    const devices = (await readStore()).devices
    const variants = Object.fromEntries(
      devices.map((device) => [
        device.id,
        {
          name: device.name,
          spec: accessSpec(device),
        },
      ]),
    )

    return {
      name: i18n('Device'),
      description: i18n(
        'Choose the device whose network access you want to change.',
      ),
      warning: null,
      disabled: false,
      default: devices[0]?.id ?? '',
      variants: Variants.of(variants),
    }
  }),
})

export const manageDeviceAccess = sdk.Action.withInput(
  'manage-device-access',
  async ({ effects }) => {
    const devices = (await store.read().const(effects))?.devices ?? []
    return {
      name: i18n('Manage Device Access'),
      description: i18n(
        'Change which networks a device can reach through WireGuard.',
      ),
      warning: null,
      allowedStatuses: 'any',
      group: i18n('Devices'),
      visibility: devices.length
        ? 'enabled'
        : { disabled: i18n('Add a device first.') },
    }
  },
  inputSpec,
  async () => ({}),
  async ({ effects, input }) => {
    const current = await readStore()
    const selected = current.devices.find(
      (device) => device.id === input.device.selection,
    )
    if (!selected) throw new Error(i18n('This device no longer exists.'))

    await store.merge(effects, {
      devices: current.devices.map((device) =>
        device.id === selected.id
          ? {
              ...device,
              allowWan: input.device.value.allowWan,
              allowLan: input.device.value.allowLan,
              allowLocal: input.device.value.allowLocal,
            }
          : device,
      ),
    })
  },
)
