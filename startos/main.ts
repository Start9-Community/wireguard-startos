import { emptyStore, store } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import { renderServerConfig } from './utils'
import { requireConfigured } from './actions/helpers'

export const main = sdk.setupMain(async ({ effects }) => {
  const current = await store.read().const(effects)
  const config = requireConfigured(current ?? emptyStore())
  await sdk.volumes.main.writeFile('/wg0.conf', renderServerConfig(config), {
    mode: 0o600,
  })

  const wireguard = sdk.SubContainer.of(
    effects,
    { imageId: 'wireguard' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'main',
      subpath: null,
      mountpoint: '/data',
      readonly: false,
    }),
    'wireguard',
  )

  return sdk.Daemons.of(effects)
    .addOneshot('configure-network', {
      subcontainer: wireguard,
      exec: {
        command: ['/usr/local/bin/configure-network'],
        user: 'root',
      },
      requires: [],
    })
    .addDaemon('wireguard', {
      subcontainer: wireguard,
      exec: {
        command: sdk.useEntrypoint(),
        runAsInit: true,
      },
      ready: {
        display: i18n('Secure Tunnel'),
        fn: () =>
          sdk.healthCheck.runHealthScript(['wg', 'show', 'wg0'], wireguard, {
            message: () => i18n('WireGuard is ready'),
            errorMessage: i18n('WireGuard is not ready'),
          }),
      },
      requires: ['configure-network'],
    })
})
