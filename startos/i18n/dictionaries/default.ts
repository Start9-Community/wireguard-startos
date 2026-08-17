export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Secure Tunnel': 0,
  'WireGuard is ready': 1,
  'WireGuard is not ready': 2,

  // interfaces.ts
  'WireGuard Endpoint': 3,
  'Receives secure connections from your devices': 4,

  // init/watchSetup.ts
  'Enable a Public Address': 5,
  'Choose the enabled Public address your devices will use.': 6,
  'Add a device to start using WireGuard.': 7,

  // actions/helpers.ts
  'Complete first-time setup before managing devices.': 8,
  'WireGuard could not generate device keys.': 9,
  'WireGuard profile': 10,
  'Scan this code with the WireGuard app, or copy the profile text.': 11,

  // actions/configure.ts
  'Public address': 12,
  'Choose an enabled Public address for your devices to use.': 13,
  'Enable a Public address under WireGuard Endpoint first.': 14,
  'Public port': 15,
  'The UDP port your devices use outside your home. This may differ from the internal WireGuard port if your router translates it.': 16,
  'Set Connection Address': 17,
  'Choose where your devices connect to this WireGuard server.': 18,
  'Changing this setting does not update profiles already added to your devices. View and import those profiles again after changing it.': 19,
  'Tunnel Settings': 20,
  'Go to Interfaces → WireGuard Endpoint and enable a “Public” address.': 21,
  'The selected public address is no longer enabled.': 22,

  // actions/addDevice.ts
  'Device name': 23,
  'Use a name you will recognize later, such as “My phone”.': 24,
  'My phone': 25,
  'Do not begin or end the name with a space.': 26,
  'Allow WAN traffic': 27,
  'Allow this device to access the internet through WireGuard.': 28,
  'Allow LAN traffic': 29,
  'Allow this device to access private home-network addresses.': 30,
  'Allow local traffic': 31,
  'Allow this device to access StartOS services and other WireGuard devices.': 32,
  'This can expose services that are not enabled on a LAN or Public address.': 33,
  'Add Device': 34,
  'Create a WireGuard profile for a phone or computer.': 35,
  Devices: 36,
  'Complete first-time setup first.': 37,
  'A device with this name already exists.': 38,
  'This server has no free device addresses.': 39,
  'Device Added': 40,
  'Import this profile into the WireGuard app now. You can view it again later from Actions.': 41,

  // actions/manageDeviceAccess.ts
  Device: 42,
  'Choose the device whose network access you want to change.': 43,
  'Manage Device Access': 44,
  'Change which networks a device can reach through WireGuard.': 45,
  'Add a device first.': 46,
  'This device no longer exists.': 47,

  // actions/viewDevice.ts
  'Choose the device whose profile you want to view.': 48,
  'View Device Profile': 49,
  'Show a device profile as a QR code and text.': 50,
  'This profile contains a private key. Only show or copy it on a device you trust.': 51,
  'Device Profile': 52,
  'Scan the code or copy the profile text into the WireGuard app.': 53,

  // actions/viewActiveDevices.ts
  'Less than a minute ago': 54,
  '1 minute ago': 55,
  '${minutes} minutes ago': 56,
  'View Active Devices': 57,
  'Show devices active within the last 10 minutes and their traffic totals.': 58,
  Statistics: 59,
  'Active Devices': 60,
  'Active devices': 61,
  'Statistics are not available yet. Try again in a few seconds.': 62,
  'No devices have been active in the last 10 minutes.': 63,
  'Traffic is shown as download / upload. Daily, weekly, and monthly counters reset according to the server clock.': 64,
  'Last active': 65,
  'Download/Upload (Daily)': 66,
  'Download/Upload (Weekly)': 67,
  'Download/Upload (Monthly)': 68,
  'Download/Upload (Total)': 69,

  // actions/removeDevice.ts
  'Choose the device whose access you want to revoke.': 70,
  'Remove Device': 71,
  'Revoke a phone or computer’s WireGuard access.': 72,
  'The selected device will stop connecting immediately. This cannot be undone; add it again to create a new profile.': 73,
  'Device Removed': 74,
  'The device’s access has been revoked and its old profile will no longer connect.': 75,
  'Removed device': 76,

  // actions/changeCidr.ts
  IPv4: 77,
  'Choose a private /24 network that does not overlap your LAN or the StartOS service network.': 78,
  'Use a private IPv4 /24 network such as 10.44.0.0/24.': 79,
  IPv6: 80,
  'Choose a unique-local /64 network that does not overlap the StartOS service network.': 81,
  'Use an IPv6 unique-local /64 network such as fd44:5747:5354::/64.': 82,
  'Change CIDR': 83,
  'Change the IPv4 and IPv6 networks used by WireGuard devices.': 84,
  'Changing either network changes device addresses. View and re-import every device profile after saving.': 85,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
