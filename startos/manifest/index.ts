import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'wireguard',
  title: 'WireGuard VPN',
  license: 'GPL-2.0-only',
  packageRepo: 'https://github.com/remcoros/wireguard-startos',
  upstreamRepo: 'https://git.zx2c4.com/wireguard-tools/',
  marketingUrl: 'https://www.wireguard.com/',
  donationUrl: null,
  description: { short, long },
  volumes: ['main'],
  images: {
    wireguard: {
      source: { dockerBuild: {} },
      arch: ['x86_64', 'aarch64'],
    },
  },
  virtualNetworking: true,
  dependencies: {},
})
