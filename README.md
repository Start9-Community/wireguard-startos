<p align="center">
  <img src="icon.svg" alt="WireGuard Logo" width="21%">
</p>

# WireGuard on StartOS

> Everything not listed in this document should behave the same as upstream
> WireGuard. If a feature, setting, or behavior is not mentioned here, the
> upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

WireGuard is a fast, modern VPN. This package is a StartOS-native manager for a
single `wg0` server interface built on `wireguard-tools`: it owns the server
config, issues per-device profiles, and enforces per-device network access. It
ships no web interface and no management API — every operation is a StartOS
action.

- **Upstream repo:** <https://git.zx2c4.com/wireguard-tools/>
- **Wrapper repo:** <https://github.com/Start9-Community/wireguard-startos>

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

One image, built here rather than pulled: upstream publishes no container image
for `wireguard-tools`.

| Property      | Value                                                                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Image         | Built from the repo `Dockerfile` — Alpine base, `wireguard-tools`, `wireguard-go`, `iproute2`, `iptables` (nftables backend), `bash` for `wg-quick` |
| Architectures | x86_64, aarch64                                                                                                                                     |
| Entrypoint    | `/usr/local/bin/start-wireguard`, taken from the image and run as the container's init process                                                      |

| Subcontainer | Purpose                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------- |
| `wireguard`  | Runs both the `configure-network` oneshot and the `wireguard` daemon — the one to `attach` to |

The manifest sets `virtualNetworking: true`, which is what gives the container
`/dev/net/tun`. The kernel WireGuard module is not available to a service
container, so `wg-quick` falls back to the userspace `wireguard-go` — the tun
device is what makes that possible, and without the flag `wg0` cannot be created
at all.

The oneshot enables IPv4 and IPv6 forwarding in the container's network
namespace before the daemon starts. The daemon then applies `/data/wg0.conf`
with `wg-quick up`, refreshes the traffic statistics file every 30 seconds, and
tears the interface and its firewall chains down on `SIGTERM`.

## Volume and Data Layout

One volume holds everything the package keeps, including the server and device
private keys.

| Volume | Mount Point | Purpose                                    |
| ------ | ----------- | ------------------------------------------ |
| `main` | `/data`     | Store, generated server config, statistics |

| Path               | Written by             | Contents                                                                                                                                                                    |
| ------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/data/store.json` | StartOS actions        | Server keypair, chosen public endpoint and port, tunnel CIDRs, the StartOS resolver address, and every device (name, keypair, preshared key, tunnel address, access policy) |
| `/data/wg0.conf`   | `main.ts`, mode `0600` | The rendered server config: interface, `PostUp`/`PostDown` firewall rules, one `[Peer]` per device                                                                          |
| `/data/wg0.stats`  | the daemon, every 30s  | One tab-separated line per peer: public key, last handshake, and total / daily / weekly / monthly byte counters. No private or preshared keys                               |

There is no database.

## File Models

One model, `store.json`, and it is the source of truth for everything the
package renders.

`store.json` is a JSON file model. On every init the package merges a single
key into it — `dns`, re-read from `sdk.getOsIp()` — so a hand-edited resolver
address is reverted on the next start; that value is the platform's to set, not
the user's. Every other key is seeded from the schema's defaults the first time
the file is written and thereafter belongs to the actions: **Set Connection
Address** writes the endpoint host, port and server keypair, **Add Device** /
**Remove Device** / **Manage Device Access** write the device list, and **Change
CIDR** writes both tunnel CIDRs and re-addresses every device. A hand edit to
any of those survives a restart, but an edit that fails validation does not —
the merge repairs an invalid value back to its default rather than refusing the
write.

`wg0.conf` is **not** a file model. It is regenerated from `store.json` on every
main run and overwritten in place, so a hand edit is lost at the next start.
Every write to `store.json` restarts main through the `.const()` watcher, which
is what makes an action's effect reach the running interface.

## Dependencies

None.

## Network Access and Interfaces

One interface, and it carries the VPN itself rather than anything a browser
opens.

| Interface          | Id          | Type | Container Port | Description                                   |
| ------------------ | ----------- | ---- | -------------- | --------------------------------------------- |
| WireGuard Endpoint | `wireguard` | p2p  | 51820/udp      | Receives secure connections from your devices |

The binding requests 51820 as its external port and StartOS assigns a different
one if that is already claimed; a bound port is forwarded for both TCP and UDP,
and WireGuard uses only the UDP half. No TLS is added and no URL scheme is
advertised — WireGuard authenticates and encrypts its own transport, and there
is nothing here for a browser to open.

**The router has to forward that external UDP port**, and nothing in the package
can do it or detect that it has not been done. A device whose profile imports
cleanly and then never handshakes — **View Active Devices** lists nothing — is
the symptom, and the port to forward is the one shown for the enabled Public
address, as UDP on both sides.

Each device carries three independent access toggles, enforced by the server's
own `iptables`/`ip6tables` chains rather than by the device profile — changing a
policy therefore takes effect without re-importing anything:

| Toggle              | Default | Reaches                                                                                                                   |
| ------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| Allow WAN traffic   | on      | Anything not matched by the two rules below — in practice, the internet                                                   |
| Allow LAN traffic   | on      | The well-known private ranges: `10/8`, `172.16/12`, `192.168/16`, CGNAT `100.64/10`, IPv4 link-local, and IPv6 `fc00::/7` |
| Allow local traffic | off     | The StartOS service bridge and the other WireGuard devices                                                                |

Queries to the StartOS resolver are accepted ahead of those rules, so name
resolution keeps working with **Allow local traffic** off.

The two toggles account for most of what looks like a broken tunnel on a device
that has connected: no internet at all is **Allow WAN traffic** turned off, and
no reach to StartOS services or to the other devices is **Allow local traffic**,
which is off by default. Both are changed with **Manage Device Access** — and
turning the second on exposes services that are not published on a LAN or Public
address, which is the reason it defaults off.

The tunnel is a private IPv4 `/24` and a unique-local IPv6 `/64`; the server
takes host `.1` and devices are allocated from `.2` upward, reusing an address
freed by a removed device. **Change CIDR** moves both networks, rejecting a
public IPv4 range, a non-network address, a non-unique-local IPv6 prefix, and
either StartOS service network.

## Installation and First-Run Flow

Setup is ordered and the service will not run until the first step is done: the
daemon needs an endpoint host, a server keypair and a resolver address before it
can render a config, so the package refuses to start without them and raises a
`critical` task instead.

1. Enable a **Public** address on the **WireGuard Endpoint** interface. Nothing
   in the package can do this — a public address is the user's decision — so the
   first task points at a **deliberately disabled** action whose disabled text
   names the screen to go to.
2. Run **Set Connection Address**. This is the same action, now enabled: it
   offers only the enabled public addresses that a device could actually dial
   (public IPv4, global IPv6, public domain), defaults the port to the one that
   address carries, and generates the server keypair on first run.
3. Run **Add Device**. Not required for the service to run — this task is
   `important`, not `critical` — but a server with no peers accepts no
   connections.

No credentials are generated for the user to keep; the device profile returned
by **Add Device** is the only secret, and it can be shown again at any time.

## Actions

Seven actions, all user-facing — none is hidden. Three of them disable
themselves with an explanation when their precondition is unmet (no public
address, no devices) rather than disappearing.

**Set Connection Address** (`configure`, named _Enable a Public Address_ while
no public address is enabled) — run it at first setup, and again whenever the
public IP, domain, or router port changes. Writes the endpoint host and port to
`store.json`, and the server keypair the first time only, so re-running it never
invalidates existing profiles' server key. Restarts the service. Profiles
already imported on a device keep the old endpoint and must be re-imported.

**Add Device** (`add-device`) — run it once per phone or computer; a profile
should never be shared between two. Generates a keypair and preshared key inside
a throwaway container, allocates the lowest free tunnel address, appends the
device to `store.json`, and restarts the service so the peer reaches the running
interface. Rejects a duplicate name and a full address pool. Returns the profile
as masked, copyable text with a QR code — the only time the device's private key
is generated, though **View Device Profile** can show it again.

**Manage Device Access** (`manage-device-access`) — run it to widen or narrow one
device's reach. Rewrites that device's policy in `store.json` and restarts the
service; the profile on the device is unaffected and does not need re-importing.
Idempotent.

**View Device Profile** (`view-device`) — run it to re-import a profile on a new
or reset device. Reads only; changes nothing and does not restart the service.
Returns the same masked profile and QR code **Add Device** did.

**View Active Devices** (`view-active-devices`) — run it to see which devices
have handshaked in the last ten minutes and how much they have moved. Reads
`/data/wg0.stats`, so it needs the service running and returns "not available
yet" for the first half-minute after a start. Changes nothing.

**Remove Device** (`remove-device`) — run it when a device is lost or should stop
connecting. Drops the device from `store.json` and restarts the service, which
regenerates `wg0.conf` without that peer, so access is revoked on the running
interface and not merely recorded. Irreversible: the key material is gone and
re-adding the device issues a new profile. The freed tunnel address is handed to
the next device added.

**Change CIDR** (`change-cidr`) — run it only when the tunnel collides with the
user's own LAN. Rewrites both CIDRs and **re-addresses every device**, keeping
each one's host number, then restarts the service. Every profile must be viewed
and re-imported afterwards or those devices stop connecting.

## Tasks

Two tasks, both raised from init and both re-evaluated whenever the endpoint
host or the store changes.

| Task                   | Severity    | Raised when                                                                                                            | Cleared by                         |
| ---------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `wireguard:configure`  | `critical`  | No Public address is enabled on the endpoint host, **or** the stored endpoint host is no longer among the enabled ones | Running **Set Connection Address** |
| `wireguard:add-device` | `important` | The endpoint is configured and no device exists                                                                        | Running **Add Device**             |

The `critical` one stops the service and suspends the ordinary Start/Stop
controls until it is satisfied — that is the intended state, because the daemon
cannot render a config without an endpoint. It returns if the user later
disables the address it was pointed at. The `important` one is prominent but
does not block anything, and it returns if the last device is removed.

## Health Checks

One check, on the only daemon.

| Check       | Displayed       | Method                                     |
| ----------- | --------------- | ------------------------------------------ |
| `wireguard` | "Secure Tunnel" | `wg show wg0` exits 0 inside the container |

A failure means the interface was never created or was torn back down. The three
causes worth separating: `/dev/net/tun` unavailable (the package would be
running without `virtualNetworking`), a `wg0.conf` `wg-quick` rejected, and a
`PostUp` firewall command that failed — `wg-quick` rolls the whole interface back
if any of them do, so a bad rule looks identical to a bad config until the
service logs are read.

**No check at all is a different failure from a failing one.** The daemon waits
on the `configure-network` oneshot, so a oneshot that cannot complete leaves the
service starting forever with no health check ever appearing. It retries with
backoff and logs a repeating `sysctl` error each time; a `sysctl` that cannot be
written means the container's `/proc/sys/net` is not writable, which is a
platform fault rather than a package one.

## Backups and Restore

The whole `main` volume is copied — `sdk.Backups.ofVolumes('main')`. Nothing is
excluded and nothing is dumped.

That deliberately includes the server private key and every device private key,
which is what lets a restored server keep its identity: existing device profiles
keep working with no re-import. A restored instance needs nothing rebuilt. The
one case that still needs attention is a restore onto a server reachable at a
different public address — the profiles point at the old endpoint, so **Set
Connection Address** has to be run and every profile re-imported.

## Limitations and Differences

1. **No web interface and no management API.** Upstream ships neither, and this
   package adds neither; every operation is a StartOS action.
2. **Not a general `wg-quick` front end.** Only the public endpoint and port, the
   two tunnel CIDRs, and the per-device access policy are configurable. MTU,
   keepalive, listen port, and the `AllowedIPs` a device routes are fixed.
3. **IPv6 works inside the tunnel; IPv6 to the internet is not guaranteed.** A
   device's unique-local IPv6 reaches StartOS services and the other devices.
   Past that it is masqueraded to the container's bridge address, and getting
   out depends on two things the package does not control: the server having
   working IPv6 egress of its own, and the host masquerading the container
   bridge for IPv6. Where either is missing — the common case — devices fall
   back to IPv4.
4. **The package cannot detect a collision with the user's LAN.** StartOS gives
   packages the server's LAN addresses but not their prefixes or routing table,
   so an overlap between the default tunnel CIDR and the user's own network has
   to be noticed by the user and fixed with **Change CIDR**.
5. **LAN access is matched by well-known private ranges, not by the real LAN
   subnet** — a consequence of the above. A network that routes public address
   space is classified as WAN.
6. **Changing the endpoint or either CIDR invalidates imported profiles.** The
   server accepts the new addressing immediately; each device has to be
   re-imported.
7. **253 devices maximum**, and device names must be unique. The tunnel is a
   `/24`, the server holds `.1`, and devices occupy `.2` through `.254`.

---

## Quick Reference for AI Consumers

```yaml
package_id: wireguard
image: built from ./Dockerfile # alpine base, no upstream image published
architectures:
  - x86_64
  - aarch64
subcontainers:
  - wireguard # oneshot + daemon share it
volumes:
  main: /data
file_models:
  - /data/store.json
startos_managed_env_vars: []
dependencies: []
interfaces:
  wireguard: { type: p2p, port: 51820 } # udp
actions:
  - configure
  - add-device
  - manage-device-access
  - view-active-devices
  - view-device
  - remove-device
  - change-cidr
tasks:
  - { action: configure, severity: critical }
  - { action: add-device, severity: important }
health_checks:
  - wireguard # displayed "Secure Tunnel"
```
