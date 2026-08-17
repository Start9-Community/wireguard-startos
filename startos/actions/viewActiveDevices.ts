import { T } from '@start9labs/start-sdk'
import { store } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import {
  activePeerStatistics,
  formatTraffic,
  parsePeerStatistics,
  type PeerStatistics,
} from '../statistics'
import { readStore } from './helpers'

function single(
  name: string,
  value: string,
  description: string | null = null,
): T.ActionResultMember {
  return {
    type: 'single',
    name,
    description,
    value,
    copyable: false,
    masked: false,
    qr: false,
  }
}

function relativeHandshake(peer: PeerStatistics, nowSeconds: number): string {
  const minutes = Math.floor(
    Math.max(0, nowSeconds - peer.latestHandshake) / 60,
  )
  if (minutes === 0) return i18n('Less than a minute ago')
  if (minutes === 1) return i18n('1 minute ago')
  return i18n('${minutes} minutes ago', { minutes })
}

async function readStatistics(): Promise<string | null> {
  try {
    return String(await sdk.volumes.main.readFile('/wg0.stats', 'utf8'))
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return null
    }
    throw error
  }
}

export const viewActiveDevices = sdk.Action.withoutInput(
  'view-active-devices',
  async ({ effects }) => {
    const devices = (await store.read().const(effects))?.devices ?? []
    return {
      name: i18n('View Active Devices'),
      description: i18n(
        'Show devices active within the last 10 minutes and their traffic totals.',
      ),
      warning: null,
      allowedStatuses: 'only-running',
      group: i18n('Statistics'),
      visibility: devices.length
        ? 'enabled'
        : { disabled: i18n('Add a device first.') },
    }
  },
  async () => {
    const current = await readStore()
    const snapshot = await readStatistics()
    if (snapshot === null) {
      return {
        version: '1' as const,
        title: i18n('Active Devices'),
        message: null,
        result: single(
          i18n('Active devices'),
          i18n('Statistics are not available yet. Try again in a few seconds.'),
        ),
      }
    }

    const nowSeconds = Math.floor(Date.now() / 1000)
    const names = new Map(
      current.devices.map((device) => [device.publicKey, device.name]),
    )
    const active = activePeerStatistics(
      parsePeerStatistics(snapshot),
      nowSeconds,
    ).filter((peer) => names.has(peer.publicKey))

    if (active.length === 0) {
      return {
        version: '1' as const,
        title: i18n('Active Devices'),
        message: null,
        result: single(
          i18n('Active devices'),
          i18n('No devices have been active in the last 10 minutes.'),
        ),
      }
    }

    return {
      version: '1' as const,
      title: i18n('Active Devices'),
      message: i18n(
        'Traffic is shown as download / upload. Daily, weekly, and monthly counters reset according to the server clock.',
      ),
      result: {
        type: 'group' as const,
        value: active.map((peer): T.ActionResultMember => ({
          type: 'group',
          name: names.get(peer.publicKey) ?? i18n('Device'),
          description: null,
          value: [
            single(i18n('Last active'), relativeHandshake(peer, nowSeconds)),
            single(
              i18n('Download/Upload (Daily)'),
              formatTraffic(peer.sentBytesDaily, peer.receivedBytesDaily),
            ),
            single(
              i18n('Download/Upload (Weekly)'),
              formatTraffic(peer.sentBytesWeekly, peer.receivedBytesWeekly),
            ),
            single(
              i18n('Download/Upload (Monthly)'),
              formatTraffic(peer.sentBytesMonthly, peer.receivedBytesMonthly),
            ),
            single(
              i18n('Download/Upload (Total)'),
              formatTraffic(peer.sentBytesTotal, peer.receivedBytesTotal),
            ),
          ],
        })),
      },
    }
  },
)
