export const activeWindowSeconds = 10 * 60

export type PeerStatistics = {
  publicKey: string
  latestHandshake: number
  receivedBytesTotal: number
  sentBytesTotal: number
  receivedBytesDaily: number
  sentBytesDaily: number
  receivedBytesWeekly: number
  sentBytesWeekly: number
  receivedBytesMonthly: number
  sentBytesMonthly: number
}

export function parsePeerStatistics(snapshot: string): PeerStatistics[] {
  return snapshot
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const [
        publicKey,
        handshake,
        receivedTotal,
        sentTotal,
        receivedDaily,
        sentDaily,
        receivedWeekly,
        sentWeekly,
        receivedMonthly,
        sentMonthly,
      ] = line.split('\t')
      const latestHandshake = Number(handshake)
      const receivedBytesTotal = Number(receivedTotal)
      const sentBytesTotal = Number(sentTotal)
      const receivedBytesDaily = Number(receivedDaily)
      const sentBytesDaily = Number(sentDaily)
      const receivedBytesWeekly = Number(receivedWeekly)
      const sentBytesWeekly = Number(sentWeekly)
      const receivedBytesMonthly = Number(receivedMonthly)
      const sentBytesMonthly = Number(sentMonthly)

      if (
        !publicKey ||
        !Number.isFinite(latestHandshake) ||
        !Number.isFinite(receivedBytesTotal) ||
        !Number.isFinite(sentBytesTotal) ||
        !Number.isFinite(receivedBytesDaily) ||
        !Number.isFinite(sentBytesDaily) ||
        !Number.isFinite(receivedBytesWeekly) ||
        !Number.isFinite(sentBytesWeekly) ||
        !Number.isFinite(receivedBytesMonthly) ||
        !Number.isFinite(sentBytesMonthly) ||
        latestHandshake < 0 ||
        receivedBytesTotal < 0 ||
        sentBytesTotal < 0 ||
        receivedBytesDaily < 0 ||
        sentBytesDaily < 0 ||
        receivedBytesWeekly < 0 ||
        sentBytesWeekly < 0 ||
        receivedBytesMonthly < 0 ||
        sentBytesMonthly < 0
      ) {
        return []
      }

      return [
        {
          publicKey,
          latestHandshake,
          receivedBytesTotal,
          sentBytesTotal,
          receivedBytesDaily,
          sentBytesDaily,
          receivedBytesWeekly,
          sentBytesWeekly,
          receivedBytesMonthly,
          sentBytesMonthly,
        },
      ]
    })
}

export function activePeerStatistics(
  peers: PeerStatistics[],
  nowSeconds = Math.floor(Date.now() / 1000),
): PeerStatistics[] {
  return peers
    .filter((peer) => {
      if (peer.latestHandshake === 0) return false
      const age = Math.max(0, nowSeconds - peer.latestHandshake)
      return age <= activeWindowSeconds
    })
    .sort((a, b) => b.latestHandshake - a.latestHandshake)
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
  let value = bytes
  let unit = 0

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }

  if (unit === 0) return `${Math.round(value)} ${units[unit]}`
  const precision = value >= 10 ? 1 : 2
  return `${value.toFixed(precision).replace(/\.?0+$/, '')} ${units[unit]}`
}

export function formatTraffic(
  downloadedBytes: number,
  uploadedBytes: number,
): string {
  return `${formatBytes(downloadedBytes)} / ${formatBytes(uploadedBytes)}`
}
