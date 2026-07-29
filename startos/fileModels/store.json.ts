import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import {
  defaultClientNetwork,
  defaultClientNetworkV6,
  normalizeTunnelIpv4Cidr,
  normalizeTunnelIpv6Cidr,
} from '../utils'

function isValidCidr(
  value: string,
  normalize: (cidr: string) => string,
): boolean {
  try {
    normalize(value)
    return true
  } catch {
    return false
  }
}

const device = z.object({
  id: z.string().catch(''),
  name: z.string().catch('Device'),
  privateKey: z.string().catch(''),
  publicKey: z.string().catch(''),
  presharedKey: z.string().catch(''),
  address: z.string().catch(''),
  createdAt: z.string().catch(''),
  allowWan: z.boolean().catch(true),
  allowLan: z.boolean().catch(true),
  allowLocal: z.boolean().catch(false),
})

const shape = z.object({
  endpointHost: z.string().nullable().catch(null),
  endpointPort: z.number().int().min(1).max(65535).catch(51820),
  ipv4Cidr: z
    .string()
    .refine((value) => isValidCidr(value, normalizeTunnelIpv4Cidr))
    .transform(normalizeTunnelIpv4Cidr)
    .catch(defaultClientNetwork),
  ipv6Cidr: z
    .string()
    .refine((value) => isValidCidr(value, normalizeTunnelIpv6Cidr))
    .transform(normalizeTunnelIpv6Cidr)
    .catch(defaultClientNetworkV6),
  serverPrivateKey: z.string().nullable().catch(null),
  serverPublicKey: z.string().nullable().catch(null),
  dns: z.string().nullable().catch(null),
  devices: z.array(device).catch([]),
})

export type Store = z.infer<typeof shape>

export const store = FileHelper.json(
  {
    base: sdk.volumes.main,
    subpath: '/store.json',
  },
  shape,
)

export function emptyStore(): Store {
  return {
    endpointHost: null,
    endpointPort: 51820,
    ipv4Cidr: defaultClientNetwork,
    ipv6Cidr: defaultClientNetworkV6,
    serverPrivateKey: null,
    serverPublicKey: null,
    dns: null,
    devices: [],
  }
}
