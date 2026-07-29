<p align="center">
  <img src="icon.svg" alt="WireGuard on StartOS icon" width="21%">
</p>

# WireGuard on StartOS

> **Upstream documentation:** <https://www.wireguard.com/quickstart/>

This is a StartOS-native WireGuard manager built around `wireguard-tools`. It
deliberately has no separate web interface or public management API. StartOS
actions own setup and device profiles.

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Actions](#actions)
- [Backups and Restore](#backups-and-restore)
- [Health Checks](#health-checks)
- [Dependencies](#dependencies)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

## Image and Container Runtime

The package builds a small Alpine image containing `wireguard-tools`,
`wireguard-go`, `iproute2`, and nftables-backed `iptables`. It uses kernel
WireGuard when available and falls back to `wireguard-go`.

The container has an isolated network namespace. Startup enables IPv4 and IPv6
forwarding, applies the generated `wg0` configuration, and keeps the interface
active until StartOS stops the service.

## Volume and Data Layout

The `main` volume is mounted at `/data`.

- `store.json` is the source of truth for the server keys, selected public
  endpoint, IPv4 and IPv6 tunnel CIDRs, StartOS DNS address, and device
  profiles.
- `wg0.conf` is generated from `store.json` whenever configuration changes.
- One traffic state file keeps cumulative total, daily, weekly, and monthly
  counters. It contains public keys and byte counters, never private or shared
  keys.

Server and device private keys are intentionally backed up so restored profiles
continue working.

## Installation and First-Run Flow

The first critical task directs the user to enable a **Public** address under
**Interfaces → WireGuard Endpoint**. Its action remains disabled, so the task
cannot be completed accidentally. Once the setup watcher observes an enabled
Public address, the task becomes **Set Connection Address** and can be run.

The next critical task asks the user to choose from enabled public IPv4, global
IPv6, and public-domain addresses. Custom addresses are intentionally not
accepted. The public UDP port defaults to the port carried by the first enabled
address, falling back to `51820`.

Server keys are generated during this setup. The WireGuard process listens on
UDP 51820 inside its service container. StartOS may assign a different port to
the enabled Public address, and the router's external port may differ again.

## Network Access and Interfaces

The package declares one unencrypted raw P2P interface named **WireGuard
Endpoint** on container UDP port 51820. WireGuard provides its own authenticated
encryption; TLS is neither applicable nor added.

There is no HTTP interface, web UI, or management API.

Each device has three independent access controls:

- **WAN traffic** allows internet access and is enabled by default.
- **LAN traffic** allows standard private IPv4 networks, carrier-grade NAT,
  IPv4 link-local addresses, and IPv6 unique-local addresses. It is enabled by
  default.
- **Local traffic** allows the StartOS service network and communication with
  other WireGuard devices. It is disabled by default.

DNS access to the StartOS resolver remains available even when Local traffic
is disabled. Policies are enforced by the server, so changing them does not
require updating the device profile.

The tunnel defaults to `10.44.0.0/24` and `fd44:5747:5354::/64`. The
**Change CIDR** action in the **Advanced** category accepts a private IPv4
`/24` and an IPv6 unique-local `/64`, excluding the StartOS service networks.
Changing either CIDR preserves each device's host ID but changes its tunnel
addresses, so every device profile must be viewed and re-imported afterward.

StartOS currently provides packages with the server's LAN addresses but not
their subnet prefixes or routing table. The package therefore cannot discover
an exact LAN range or automatically choose a non-conflicting tunnel CIDR.
Users whose LAN overlaps the default IPv4 CIDR must select another private
`/24`. Unusually routed LANs that use public address space are classified as
WAN.

## Actions

All actions are available from the StartOS service page:

- **Set Connection Address** selects an enabled public address and external UDP
  port.
- **Add Device** generates a unique device key, shared key, and tunnel address,
  applies its selected access policy, then returns one copyable profile field
  with a QR code.
- **Manage Device Access** changes a device's WAN, LAN, and local access
  without replacing its profile.
- **View Active Devices** shows devices with a handshake in the last 10 minutes
  and paired download/upload traffic for the current day, week, month, and in
  total.
- **View Device Profile** shows the same copyable profile and QR code again.
- **Remove Device** removes the device from `wg0` and revokes its access.
- **Change CIDR** changes the IPv4 and IPv6 tunnel networks and remaps existing
  device addresses. It is grouped under **Advanced**.

User-facing language says “device” rather than exposing WireGuard peer
terminology.

## Backups and Restore

StartOS backs up the complete `main` volume. Restore preserves the server
identity, endpoint selection, and all device profiles.

## Health Checks

Readiness runs `wg show wg0` in the service container. Success means the
WireGuard interface exists and its configuration has been applied.

## Dependencies

None.

## Limitations and Differences

1. Device DNS uses the StartOS resolver, avoiding direct external port-53
   queries that StartOS blocks.
2. Changing the public endpoint does not modify profiles already imported on
   devices. Users must view and re-import or edit those profiles.
3. The package exposes tunnel CIDRs but not arbitrary `wg-quick`
   configuration.
4. Exact LAN subnets are not exposed to packages by StartOS. LAN access
   recognizes standard private, carrier-grade NAT, link-local, and IPv6
   unique-local ranges.

## Quick Reference for AI Consumers

```yaml
package_id: wireguard
architectures: [x86_64, aarch64]
volumes:
  main: /data
ports:
  wireguard-endpoint: 51820/udp
dependencies: none
startos_managed_env_vars: []
actions:
  - configure
  - add-device
  - manage-device-access
  - view-active-devices
  - view-device
  - remove-device
  - change-cidr
```
