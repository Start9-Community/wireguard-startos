# Runtime scripts

- `configure-network.sh` enables forwarding before WireGuard starts.
- `start-wireguard.sh` applies `/data/wg0.conf`, remains active as PID 1, and
  removes the interface and firewall rules on shutdown.
- `collect-wireguard-statistics.awk` updates one compact daily, weekly, monthly,
  and total traffic state file.

The Dockerfile copies these runtime files into the service image.
