import assert from 'node:assert/strict'
import test from 'node:test'
import {
  activePeerStatistics,
  activeWindowSeconds,
  formatBytes,
  formatTraffic,
  parsePeerStatistics,
} from '../startos/statistics.ts'
import {
  allocateDeviceAddress,
  deviceAddressV6,
  formatEndpoint,
  isValidPublicEndpointHost,
  normalizeTunnelIpv4Cidr,
  normalizeTunnelIpv6Cidr,
  publicEndpointsFromAddresses,
  readdressDevices,
  renderDeviceConfig,
  renderServerConfig,
  type Device,
  type WireGuardConfig,
} from '../startos/utils.ts'

const device: Device = {
  id: 'phone',
  name: 'Phone',
  privateKey: 'client-private',
  publicKey: 'client-public',
  presharedKey: 'shared-key',
  address: '10.44.0.2',
  createdAt: '2026-07-28T00:00:00.000Z',
  allowWan: true,
  allowLan: true,
  allowLocal: false,
}

const config: WireGuardConfig = {
  endpointHost: 'vpn.example.com',
  endpointPort: 52820,
  ipv4Cidr: '10.44.0.0/24',
  ipv6Cidr: 'fd44:5747:5354::/64',
  serverPrivateKey: 'server-private',
  serverPublicKey: 'server-public',
  dns: '10.0.3.1',
  devices: [device],
}

test('accepts public addresses and rejects local-only addresses', () => {
  assert.equal(isValidPublicEndpointHost('1.1.1.1'), true)
  assert.equal(isValidPublicEndpointHost('2606:4700:4700::1111'), true)
  assert.equal(isValidPublicEndpointHost('2001:db8::1'), false)
  assert.equal(isValidPublicEndpointHost('vpn.example.com'), true)
  assert.equal(isValidPublicEndpointHost('10.0.3.2'), false)
  assert.equal(isValidPublicEndpointHost('192.168.1.10'), false)
  assert.equal(isValidPublicEndpointHost('fd42::1'), false)
  assert.equal(isValidPublicEndpointHost('server.local'), false)
  assert.equal(isValidPublicEndpointHost('example.onion'), false)
  assert.equal(isValidPublicEndpointHost('https://vpn.example.com'), false)
})

test('keeps only suitable enabled public endpoints and their ports', () => {
  assert.deepEqual(
    publicEndpointsFromAddresses([
      { hostname: '203.0.113.10', port: 52820, kind: 'ipv4' },
      { hostname: 'vpn.example.com.', port: 51830, kind: 'public-domain' },
      { hostname: 'vpn.example.com', port: 51900, kind: 'public-domain' },
      { hostname: 'example.onion', port: 51820, kind: 'plugin' },
      { hostname: '192.168.1.10', port: 51820, kind: 'ipv4' },
      { hostname: '2606:4700:4700::1111', port: null, kind: 'ipv6' },
    ]),
    [
      { hostname: 'vpn.example.com', port: 51830 },
      { hostname: '2606:4700:4700::1111', port: 51820 },
    ],
  )
})

test('formats IPv6 endpoints with brackets', () => {
  assert.equal(
    formatEndpoint('2606:4700:4700::1111', 51820),
    '[2606:4700:4700::1111]:51820',
  )
})

test('allocates the first available device address', () => {
  assert.equal(allocateDeviceAddress(config.ipv4Cidr, []), '10.44.0.2')
  assert.equal(allocateDeviceAddress(config.ipv4Cidr, [device]), '10.44.0.3')
  assert.equal(deviceAddressV6(device, config.ipv6Cidr), 'fd44:5747:5354::2')
})

test('validates and normalizes configurable tunnel CIDRs', () => {
  assert.equal(normalizeTunnelIpv4Cidr('172.31.42.0/24'), '172.31.42.0/24')
  assert.equal(
    normalizeTunnelIpv6Cidr('FD55:1234:ABCD::/64'),
    'fd55:1234:abcd::/64',
  )
  assert.throws(() => normalizeTunnelIpv4Cidr('10.44.0.1/24'))
  assert.throws(() => normalizeTunnelIpv4Cidr('8.8.8.0/24'))
  assert.throws(() => normalizeTunnelIpv4Cidr('10.0.3.0/24'))
  assert.throws(() => normalizeTunnelIpv6Cidr('2001:db8::/64'))
  assert.throws(() => normalizeTunnelIpv6Cidr('fd00:3::/64'))
  assert.throws(() => normalizeTunnelIpv6Cidr('fd55:1234::1/64'))
})

test('readdresses existing devices while preserving their host IDs', () => {
  const devices = readdressDevices(
    [
      device,
      {
        ...device,
        id: 'laptop',
        name: 'Laptop',
        address: '10.44.0.42',
      },
    ],
    '172.31.42.0/24',
  )

  assert.deepEqual(
    devices.map(({ address }) => address),
    ['172.31.42.2', '172.31.42.42'],
  )
})

test('renders the selected tunnel CIDRs throughout both configurations', () => {
  const customDevice = { ...device, address: '172.31.42.2' }
  const customConfig = {
    ...config,
    ipv4Cidr: '172.31.42.0/24',
    ipv6Cidr: 'fd55:1234:abcd::/64',
    devices: [customDevice],
  }
  const server = renderServerConfig(customConfig)
  const profile = renderDeviceConfig(customConfig, customDevice)

  assert.match(server, /Address = 172\.31\.42\.1\/24, fd55:1234:abcd::1\/64/)
  assert.match(
    server,
    /AllowedIPs = 172\.31\.42\.2\/32, fd55:1234:abcd::2\/128/,
  )
  assert.match(
    server,
    /iptables -A WG4_STARTOS_110 -d 172\.31\.42\.0\/24 -j REJECT/,
  )
  assert.match(
    server,
    /iptables -t nat -A POSTROUTING -s 172\.31\.42\.0\/24 -o eth0 -j MASQUERADE/,
  )
  assert.match(
    server,
    /ip6tables -t nat -A POSTROUTING -s fd55:1234:abcd::\/64 -o eth0 -j MASQUERADE/,
  )
  assert.match(profile, /Address = 172\.31\.42\.2\/32, fd55:1234:abcd::2\/128/)
})

test('keeps the internal listen port separate from the public port', () => {
  const server = renderServerConfig(config)
  const profile = renderDeviceConfig(config, device)

  assert.match(server, /ListenPort = 51820/)
  assert.match(server, /AllowedIPs = 10\.44\.0\.2\/32, fd44:5747:5354::2\/128/)
  assert.match(
    server,
    /iptables -A WG4_STARTOS -d 10\.0\.3\.1\/32 -p udp --dport 53 -j ACCEPT/,
  )
  assert.match(
    server,
    /iptables -A WG4_STARTOS_110 -d 10\.0\.3\.0\/24 -j REJECT/,
  )
  assert.match(
    server,
    /iptables -A WG4_STARTOS_110 -d 10\.44\.0\.0\/24 -j REJECT/,
  )
  assert.match(
    server,
    /iptables -A WG4_STARTOS_110 -d 192\.168\.0\.0\/16 -j ACCEPT/,
  )
  assert.match(server, /iptables -A WG4_STARTOS_110 -j ACCEPT/)
  assert.match(server, /ip6tables -A WG6_STARTOS_110 -d fd00:3::\/64 -j REJECT/)
  assert.match(server, /ip6tables -A WG6_STARTOS_110 -d fc00::\/7 -j ACCEPT/)
  assert.match(profile, /Endpoint = vpn\.example\.com:52820/)
  assert.match(profile, /DNS = 10\.0\.3\.1/)
  assert.match(profile, /AllowedIPs = 0\.0\.0\.0\/0, ::\/0/)
  assert.ok(profile.indexOf('Address =') < profile.indexOf('PrivateKey ='))
  assert.ok(profile.indexOf('DNS =') < profile.indexOf('PrivateKey ='))
})

test('generates a separate firewall policy for each access combination', () => {
  const localOnly: Device = {
    ...device,
    id: 'tablet',
    name: 'Tablet',
    address: '10.44.0.3',
    publicKey: 'tablet-public',
    allowWan: false,
    allowLan: false,
    allowLocal: true,
  }
  const server = renderServerConfig({
    ...config,
    devices: [device, localOnly],
  })

  assert.match(
    server,
    /iptables -A WG4_STARTOS -s 10\.44\.0\.2\/32 -j WG4_STARTOS_110/,
  )
  assert.match(
    server,
    /iptables -A WG4_STARTOS -s 10\.44\.0\.3\/32 -j WG4_STARTOS_001/,
  )
  assert.match(
    server,
    /iptables -A WG4_STARTOS_001 -d 10\.0\.3\.0\/24 -j ACCEPT/,
  )
  assert.match(
    server,
    /iptables -A WG4_STARTOS_001 -d 192\.168\.0\.0\/16 -j REJECT/,
  )
  assert.match(server, /iptables -A WG4_STARTOS_001 -j REJECT/)
})

test('shows only peers active within ten minutes', () => {
  const now = 2_000_000_000
  const peers = parsePeerStatistics(
    [
      `active-key\t${now - activeWindowSeconds}\t1536\t2097152\t512\t1048576\t128\t262144\t64\t131072\t1536\t2097152`,
      `stale-key\t${now - activeWindowSeconds - 1}\t10\t20`,
      'never-key\t0\t0\t0',
    ].join('\n'),
  )

  assert.deepEqual(
    activePeerStatistics(peers, now).map((peer) => peer.publicKey),
    ['active-key'],
  )
  assert.equal(formatBytes(1536), '1.5 KiB')
  assert.equal(formatBytes(2_097_152), '2 MiB')
  assert.equal(formatTraffic(2_097_152, 1536), '2 MiB / 1.5 KiB')
  assert.deepEqual(peers[0], {
    publicKey: 'active-key',
    latestHandshake: now - activeWindowSeconds,
    receivedBytesTotal: 1536,
    sentBytesTotal: 2_097_152,
    receivedBytesDaily: 512,
    sentBytesDaily: 1_048_576,
    receivedBytesWeekly: 128,
    sentBytesWeekly: 262_144,
    receivedBytesMonthly: 64,
    sentBytesMonthly: 131_072,
  })
})
