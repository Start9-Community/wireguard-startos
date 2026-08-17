import { store } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { readStore } from './helpers'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  id: Value.dynamicSelect(async () => {
    const devices = (await readStore()).devices
    return {
      name: i18n('Device'),
      description: i18n('Choose the device whose access you want to revoke.'),
      values: Object.fromEntries(
        devices.map((device) => [device.id, device.name]),
      ),
      default: devices[0]?.id ?? '',
    }
  }),
})

export const removeDevice = sdk.Action.withInput(
  'remove-device',
  async ({ effects }) => {
    const devices = (await store.read().const(effects))?.devices ?? []
    return {
      name: i18n('Remove Device'),
      description: i18n('Revoke a phone or computer’s WireGuard access.'),
      warning: i18n(
        'The selected device will stop connecting immediately. This cannot be undone; add it again to create a new profile.',
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
  async ({ effects, input }) => {
    const current = await readStore()
    const device = current.devices.find(
      (candidate) => candidate.id === input.id,
    )
    if (!device) throw new Error(i18n('This device no longer exists.'))
    await store.merge(effects, {
      devices: current.devices.filter((candidate) => candidate.id !== input.id),
    })
    return {
      version: '1',
      title: i18n('Device Removed'),
      message: i18n(
        'The device’s access has been revoked and its old profile will no longer connect.',
      ),
      result: {
        type: 'group',
        value: [
          {
            type: 'single',
            name: i18n('Removed device'),
            description: null,
            value: device.name,
            masked: false,
            copyable: false,
            qr: false,
          },
        ],
      },
    }
  },
)
