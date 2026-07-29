import { store } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { defaultClientNetwork, defaultClientNetworkV6 } from '../utils'

export const seedStore = sdk.setupOnInit(async (effects) => {
  const current = await store.read().once()
  const dns = await sdk.getOsIp(effects)
  await store.merge(effects, {
    endpointHost: current?.endpointHost ?? null,
    endpointPort: current?.endpointPort ?? 51820,
    ipv4Cidr: current?.ipv4Cidr ?? defaultClientNetwork,
    ipv6Cidr: current?.ipv6Cidr ?? defaultClientNetworkV6,
    serverPrivateKey: current?.serverPrivateKey ?? null,
    serverPublicKey: current?.serverPublicKey ?? null,
    dns,
    devices: current?.devices ?? [],
  })
})
