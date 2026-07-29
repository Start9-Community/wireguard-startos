import { isIP } from 'node:net'

export const wireguardPort = 51820
export const defaultClientNetwork = '10.44.0.0/24'
export const defaultClientNetworkV6 = 'fd44:5747:5354::/64'
export const clientMtu = 1420
export const startOsBridgeNetwork = '10.0.3.0/24'
export const startOsBridgeNetworkV6 = 'fd00:3::/64'

const lanNetworks = [
  '10.0.0.0/8',
  '100.64.0.0/10',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.168.0.0/16',
]
const lanNetworksV6 = ['fc00::/7']
const privateIpv4Ranges: Array<[string, number]> = [
  ['10.0.0.0', 8],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
]

export type Device = {
  id: string
  name: string
  privateKey: string
  publicKey: string
  presharedKey: string
  address: string
  createdAt: string
  allowWan: boolean
  allowLan: boolean
  allowLocal: boolean
}

export type WireGuardConfig = {
  endpointHost: string
  endpointPort: number
  ipv4Cidr: string
  ipv6Cidr: string
  serverPrivateKey: string
  serverPublicKey: string
  dns: string
  devices: Device[]
}

const ipv4ReservedRanges: Array<[number, number]> = [
  [ipv4ToNumber('0.0.0.0'), 8],
  [ipv4ToNumber('10.0.0.0'), 8],
  [ipv4ToNumber('100.64.0.0'), 10],
  [ipv4ToNumber('127.0.0.0'), 8],
  [ipv4ToNumber('169.254.0.0'), 16],
  [ipv4ToNumber('172.16.0.0'), 12],
  [ipv4ToNumber('192.0.0.0'), 24],
  [ipv4ToNumber('192.0.2.0'), 24],
  [ipv4ToNumber('192.168.0.0'), 16],
  [ipv4ToNumber('198.18.0.0'), 15],
  [ipv4ToNumber('198.51.100.0'), 24],
  [ipv4ToNumber('203.0.113.0'), 24],
  [ipv4ToNumber('224.0.0.0'), 4],
  [ipv4ToNumber('240.0.0.0'), 4],
]

function ipv4ToNumber(address: string): number {
  return address
    .split('.')
    .map(Number)
    .reduce((value, octet) => (value * 256 + octet) >>> 0, 0)
}

function numberToIpv4(value: number): string {
  return [24, 16, 8, 0]
    .map((shift) => ((value >>> shift) & 0xff).toString())
    .join('.')
}

function ipv4InRange(value: number, network: string, prefix: number): boolean {
  const mask = (0xffffffff << (32 - prefix)) >>> 0
  return (value & mask) === (ipv4ToNumber(network) & mask)
}

function parseIpv6(address: string): bigint {
  if (isIP(address) !== 6 || address.includes('.')) {
    throw new Error('IPv6 CIDR must contain a valid IPv6 address')
  }

  const halves = address.toLowerCase().split('::')
  if (halves.length > 2) {
    throw new Error('IPv6 CIDR must contain a valid IPv6 address')
  }

  const left = halves[0] ? halves[0].split(':') : []
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : []
  const missing = 8 - left.length - right.length
  if (
    (halves.length === 1 && missing !== 0) ||
    (halves.length === 2 && missing < 1)
  ) {
    throw new Error('IPv6 CIDR must contain a valid IPv6 address')
  }

  const hextets = [
    ...left,
    ...Array.from({ length: missing }, () => '0'),
    ...right,
  ]
  return hextets.reduce(
    (result, hextet) => (result << 16n) | BigInt(parseInt(hextet, 16)),
    0n,
  )
}

function formatIpv6(value: bigint): string {
  const hextets = Array.from({ length: 8 }, (_, index) =>
    Number((value >> BigInt((7 - index) * 16)) & 0xffffn).toString(16),
  )
  let bestStart = -1
  let bestLength = 0
  for (let start = 0; start < hextets.length; start += 1) {
    if (hextets[start] !== '0') continue
    let end = start
    while (end < hextets.length && hextets[end] === '0') end += 1
    const length = end - start
    if (length > bestLength && length >= 2) {
      bestStart = start
      bestLength = length
    }
    start = end - 1
  }

  if (bestStart === -1) return hextets.join(':')
  const left = hextets.slice(0, bestStart).join(':')
  const right = hextets.slice(bestStart + bestLength).join(':')
  return `${left}::${right}`
}

export function normalizeTunnelIpv4Cidr(value: string): string {
  const [address, prefix, ...extra] = value.trim().split('/')
  if (extra.length || prefix !== '24' || isIP(address) !== 4) {
    throw new Error('IPv4 CIDR must be a valid private /24 network')
  }

  const numeric = ipv4ToNumber(address)
  if ((numeric & 0xff) !== 0) {
    throw new Error('IPv4 CIDR must use the network address ending in .0')
  }
  if (
    !privateIpv4Ranges.some(([network, prefix]) =>
      ipv4InRange(numeric, network, prefix),
    )
  ) {
    throw new Error('IPv4 CIDR must be in a private address range')
  }

  const normalized = `${numberToIpv4(numeric)}/24`
  if (normalized === startOsBridgeNetwork) {
    throw new Error('IPv4 CIDR must not overlap the StartOS service network')
  }
  return normalized
}

export function normalizeTunnelIpv6Cidr(value: string): string {
  const separator = value.lastIndexOf('/')
  const address = value.slice(0, separator).trim()
  const prefix = value.slice(separator + 1).trim()
  if (separator < 0 || prefix !== '64') {
    throw new Error('IPv6 CIDR must be a valid unique-local /64 network')
  }

  const numeric = parseIpv6(address)
  if ((numeric & ((1n << 64n) - 1n)) !== 0n) {
    throw new Error('IPv6 CIDR must use the /64 network address')
  }
  const firstByte = Number(numeric >> 120n)
  if ((firstByte & 0xfe) !== 0xfc) {
    throw new Error('IPv6 CIDR must be in the fc00::/7 unique-local range')
  }

  const normalized = `${formatIpv6(numeric)}/64`
  if (normalized === startOsBridgeNetworkV6) {
    throw new Error('IPv6 CIDR must not overlap the StartOS service network')
  }
  return normalized
}

function ipv4AddressForHost(cidr: string, host: number): string {
  const network = ipv4ToNumber(normalizeTunnelIpv4Cidr(cidr).split('/')[0])
  return numberToIpv4(network + host)
}

function serverCidr(cidr: string): string {
  return `${ipv4AddressForHost(cidr, 1)}/24`
}

function serverCidrV6(cidr: string): string {
  const network = parseIpv6(normalizeTunnelIpv6Cidr(cidr).split('/')[0])
  return `${formatIpv6(network + 1n)}/64`
}

export function isPublicIp(address: string): boolean {
  const version = isIP(address)
  if (version === 4) {
    const value = ipv4ToNumber(address)
    return !ipv4ReservedRanges.some(([network, prefix]) => {
      const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
      return (value & mask) === (network & mask)
    })
  }

  if (version === 6) {
    const [firstPart = '0', secondPart = '0'] = address.split(':')
    const first = parseInt(firstPart, 16)
    const second = parseInt(secondPart, 16)
    if (first === 0x2001 && second === 0x0db8) return false
    return first >= 0x2000 && first <= 0x3fff
  }

  return false
}

export function normalizeEndpointHost(value: string): string {
  const trimmed = value.trim()
  const unbracketed =
    trimmed.startsWith('[') && trimmed.endsWith(']')
      ? trimmed.slice(1, -1)
      : trimmed
  return isIP(unbracketed)
    ? unbracketed
    : unbracketed.replace(/\.$/, '').toLowerCase()
}

export function isValidPublicEndpointHost(value: string): boolean {
  const host = normalizeEndpointHost(value)
  if (isIP(host)) return isPublicIp(host)
  if (
    host.length > 253 ||
    !host.includes('.') ||
    host.endsWith('.local') ||
    host.endsWith('.onion')
  ) {
    return false
  }

  const labels = host.split('.')
  return labels.every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label),
  )
}

export function publicEndpointsFromAddresses(
  addresses: Array<{
    hostname: string
    port: number | null
    kind: string
  }>,
): Array<{ hostname: string; port: number }> {
  const seen = new Set<string>()
  return addresses.flatMap(({ hostname, port, kind }) => {
    const normalized = normalizeEndpointHost(hostname)
    if (
      !['ipv4', 'ipv6', 'public-domain'].includes(kind) ||
      seen.has(normalized) ||
      !isValidPublicEndpointHost(normalized)
    ) {
      return []
    }
    seen.add(normalized)
    return [{ hostname: normalized, port: port ?? wireguardPort }]
  })
}

export function formatEndpoint(host: string, port: number): string {
  return `${isIP(host) === 6 ? `[${host}]` : host}:${port}`
}

export function allocateDeviceAddress(cidr: string, devices: Device[]): string {
  const used = new Set(devices.map((device) => device.address))
  for (let host = 2; host <= 254; host += 1) {
    const address = ipv4AddressForHost(cidr, host)
    if (!used.has(address)) return address
  }
  throw new Error('No device addresses are available')
}

export function readdressDevices(devices: Device[], cidr: string): Device[] {
  if (devices.length > 253) {
    throw new Error('The IPv4 CIDR does not have enough device addresses')
  }

  const usedHosts = new Set<number>()
  return devices.map((device) => {
    const parsed = isIP(device.address) === 4 ? ipv4ToNumber(device.address) : 0
    let host = parsed & 0xff
    if (host < 2 || host > 254 || usedHosts.has(host)) {
      host = 2
      while (usedHosts.has(host) && host <= 254) host += 1
    }
    usedHosts.add(host)
    return { ...device, address: ipv4AddressForHost(cidr, host) }
  })
}

export function deviceAddressV6(device: Device, cidr: string): string {
  const host = Number(device.address.split('.').at(-1))
  if (!Number.isInteger(host) || host < 2 || host > 254) {
    throw new Error('Invalid device address')
  }
  const network = parseIpv6(normalizeTunnelIpv6Cidr(cidr).split('/')[0])
  return formatIpv6(network + BigInt(host))
}

type AccessPolicy = Pick<Device, 'allowWan' | 'allowLan' | 'allowLocal'>

function policyId(device: AccessPolicy): string {
  return `${Number(device.allowWan)}${Number(device.allowLan)}${Number(
    device.allowLocal,
  )}`
}

function accessRule(
  command: 'iptables' | 'ip6tables',
  chain: string,
  destination: string,
  allowed: boolean,
): string {
  return `${command} -A ${chain} -d ${destination} -j ${
    allowed ? 'ACCEPT' : 'REJECT'
  }`
}

function firewallCommands(
  config: WireGuardConfig,
  command: 'iptables' | 'ip6tables',
): { up: string[]; down: string[] } {
  const ipv6 = command === 'ip6tables'
  const mainChain = ipv6 ? 'WG6_STARTOS' : 'WG4_STARTOS'
  const source = (device: Device) =>
    ipv6
      ? `${deviceAddressV6(device, config.ipv6Cidr)}/128`
      : `${device.address}/32`
  const local = ipv6
    ? [startOsBridgeNetworkV6, config.ipv6Cidr]
    : [startOsBridgeNetwork, config.ipv4Cidr]
  const lan = ipv6 ? lanNetworksV6 : lanNetworks
  const policies = new Map(
    config.devices.map((device) => [policyId(device), device]),
  )
  const policyChains = [...policies.keys()].map((id) => `${mainChain}_${id}`)

  const up = [
    `${command} -N ${mainChain}`,
    ...policyChains.map((chain) => `${command} -N ${chain}`),
  ]

  if (!ipv6) {
    up.push(
      `${command} -A ${mainChain} -d ${config.dns}/32 -p udp --dport 53 -j ACCEPT`,
      `${command} -A ${mainChain} -d ${config.dns}/32 -p tcp --dport 53 -j ACCEPT`,
    )
  }

  for (const [id, policy] of policies) {
    const chain = `${mainChain}_${id}`
    up.push(
      ...local.map((network) =>
        accessRule(command, chain, network, policy.allowLocal),
      ),
      ...lan.map((network) =>
        accessRule(command, chain, network, policy.allowLan),
      ),
      `${command} -A ${chain} -j ${policy.allowWan ? 'ACCEPT' : 'REJECT'}`,
    )
  }

  up.push(
    ...config.devices.map(
      (device) =>
        `${command} -A ${mainChain} -s ${source(device)} -j ${mainChain}_${policyId(device)}`,
    ),
    `${command} -A ${mainChain} -j DROP`,
    `${command} -I FORWARD 1 -i wg0 -j ${mainChain}`,
    `${command} -I FORWARD 1 -o wg0 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT`,
  )

  const down = [
    `${command} -D FORWARD -o wg0 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT`,
    `${command} -D FORWARD -i wg0 -j ${mainChain}`,
    `${command} -F ${mainChain}`,
    ...policyChains.flatMap((chain) => [
      `${command} -F ${chain}`,
      `${command} -X ${chain}`,
    ]),
    `${command} -X ${mainChain}`,
  ]

  return { up, down }
}

export function renderServerConfig(config: WireGuardConfig): string {
  const peers = config.devices
    .map(
      (device) => `
# ${device.name}
[Peer]
PublicKey = ${device.publicKey}
PresharedKey = ${device.presharedKey}
AllowedIPs = ${device.address}/32, ${deviceAddressV6(device, config.ipv6Cidr)}/128`,
    )
    .join('\n')
  const ipv4Firewall = firewallCommands(config, 'iptables')
  const ipv6Firewall = firewallCommands(config, 'ip6tables')
  const postUp = [
    ...ipv4Firewall.up,
    `iptables -t nat -A POSTROUTING -s ${config.ipv4Cidr} -o eth0 -j MASQUERADE`,
    ...ipv6Firewall.up,
    `ip6tables -t nat -A POSTROUTING -s ${config.ipv6Cidr} -o eth0 -j MASQUERADE`,
  ]
    .map((command) => `PostUp = ${command}`)
    .join('\n')
  const postDown = [
    `iptables -t nat -D POSTROUTING -s ${config.ipv4Cidr} -o eth0 -j MASQUERADE`,
    ...ipv4Firewall.down,
    `ip6tables -t nat -D POSTROUTING -s ${config.ipv6Cidr} -o eth0 -j MASQUERADE`,
    ...ipv6Firewall.down,
  ]
    .map((command) => `PostDown = ${command}`)
    .join('\n')

  return `[Interface]
PrivateKey = ${config.serverPrivateKey}
Address = ${serverCidr(config.ipv4Cidr)}, ${serverCidrV6(config.ipv6Cidr)}
ListenPort = ${wireguardPort}
MTU = ${clientMtu}
${postUp}
${postDown}
${peers}
`
}

export function renderDeviceConfig(
  config: WireGuardConfig,
  device: Device,
): string {
  return `[Interface]
Address = ${device.address}/32, ${deviceAddressV6(device, config.ipv6Cidr)}/128
DNS = ${config.dns}
MTU = ${clientMtu}
PrivateKey = ${device.privateKey}

[Peer]
PublicKey = ${config.serverPublicKey}
PresharedKey = ${device.presharedKey}
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
Endpoint = ${formatEndpoint(config.endpointHost, config.endpointPort)}
`
}
