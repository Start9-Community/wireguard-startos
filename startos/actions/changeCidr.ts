import { store } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import {
  normalizeTunnelIpv4Cidr,
  normalizeTunnelIpv6Cidr,
  readdressDevices,
} from '../utils'
import { readStore } from './helpers'

const { InputSpec, Value } = sdk

// utils.ts must not import the i18n runtime — the unit tests load it directly —
// so its validation errors are English and get replaced here.
function normalized(normalize: () => string, invalid: string): string {
  try {
    return normalize()
  } catch {
    throw new Error(invalid)
  }
}

const inputSpec = InputSpec.of({
  ipv4: Value.text({
    name: i18n('IPv4'),
    description: i18n(
      'Choose a private /24 network that does not overlap your LAN or the StartOS service network.',
    ),
    required: true,
    default: null,
    patterns: [
      {
        regex: '^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}/24$',
        description: i18n(
          'Use a private IPv4 /24 network such as 10.44.0.0/24.',
        ),
      },
    ],
  }),
  ipv6: Value.text({
    name: i18n('IPv6'),
    description: i18n(
      'Choose a unique-local /64 network that does not overlap the StartOS service network.',
    ),
    required: true,
    default: null,
    patterns: [
      {
        regex: '^[0-9A-Fa-f:]+/64$',
        description: i18n(
          'Use an IPv6 unique-local /64 network such as fd44:5747:5354::/64.',
        ),
      },
    ],
  }),
})

export const changeCidr = sdk.Action.withInput(
  'change-cidr',
  {
    name: i18n('Change CIDR'),
    description: i18n(
      'Change the IPv4 and IPv6 networks used by WireGuard devices.',
    ),
    warning: i18n(
      'Changing either network changes device addresses. View and re-import every device profile after saving.',
    ),
    allowedStatuses: 'any',
    group: i18n('Tunnel Settings'),
    visibility: 'enabled',
  },
  inputSpec,
  async () => {
    const current = await readStore()
    return {
      ipv4: current.ipv4Cidr,
      ipv6: current.ipv6Cidr,
    }
  },
  async ({ effects, input }) => {
    const ipv4Cidr = normalized(
      () => normalizeTunnelIpv4Cidr(input.ipv4),
      i18n('Use a private IPv4 /24 network such as 10.44.0.0/24.'),
    )
    const ipv6Cidr = normalized(
      () => normalizeTunnelIpv6Cidr(input.ipv6),
      i18n('Use an IPv6 unique-local /64 network such as fd44:5747:5354::/64.'),
    )
    const current = await readStore()
    await store.merge(effects, {
      ipv4Cidr,
      ipv6Cidr,
      devices: readdressDevices(current.devices, ipv4Cidr),
    })
  },
)
