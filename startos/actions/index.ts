import { sdk } from '../sdk'
import { addDevice } from './addDevice'
import { changeCidr } from './changeCidr'
import { configure } from './configure'
import { manageDeviceAccess } from './manageDeviceAccess'
import { removeDevice } from './removeDevice'
import { viewActiveDevices } from './viewActiveDevices'
import { viewDevice } from './viewDevice'

export const actions = sdk.Actions.of()
  .addAction(configure)
  .addAction(addDevice)
  .addAction(manageDeviceAccess)
  .addAction(viewActiveDevices)
  .addAction(viewDevice)
  .addAction(removeDevice)
  .addAction(changeCidr)
