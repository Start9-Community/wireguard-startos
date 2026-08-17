import { store } from '../fileModels/store.json'
import { sdk } from '../sdk'

export const seedStore = sdk.setupOnInit(async (effects) => {
  await store.merge(effects, { dns: await sdk.getOsIp(effects) })
})
