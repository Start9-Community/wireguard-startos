import { T } from '@start9labs/start-sdk'
import { endpointHostId, endpointInterfaceId } from './interfaces'
import { sdk } from './sdk'
import { publicEndpointsFromAddresses } from './utils'

export type PublicEndpoint = {
  hostname: string
  port: number
}

export async function enabledPublicEndpoints(
  effects: T.Effects,
): Promise<PublicEndpoint[]> {
  return sdk.host
    .getOwn(effects, endpointHostId, (host) => {
      const iface =
        host &&
        Object.values(host.bindings)
          .flatMap((binding) => Object.values(binding.interfaces))
          .find((candidate) => candidate.id === endpointInterfaceId)
      if (!iface) return []

      return publicEndpointsFromAddresses(
        iface.addressInfo.public
          .format('hostname-info')
          .map(({ hostname, port, metadata }) => ({
            hostname,
            port,
            kind: metadata.kind,
          })),
      )
    })
    .const()
}
