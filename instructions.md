# WireGuard

## Documentation

- [WireGuard Quick Start](https://www.wireguard.com/quickstart/) — upstream
  background and client installation guidance.
- [WireGuard installation](https://www.wireguard.com/install/) — official apps
  for phones and computers.

## What you get on StartOS

You manage WireGuard entirely from the service’s **Actions**. There is no
separate account or web interface. Each phone or computer gets its own profile,
which you can scan as a QR code or copy as text.

## Getting set up

1. Under **Interfaces**, open **WireGuard Endpoint** and enable a **Public**
   address.
2. Complete **Set Connection Address** when the next prompt appears. Choose the
   enabled address your devices should use. The public UDP port is filled in
   automatically, but you can change it if your router uses a different
   external port.
3. If your StartOS server is behind a router, forward your chosen external UDP
   port to the UDP port shown for the enabled **Public** address under
   **Interfaces → WireGuard Endpoint**. The external and StartOS ports may
   differ.
4. Complete the **Add Device** prompt, give the phone or computer a recognizable
   name, and scan the returned profile with its WireGuard app. WAN and LAN
   access are enabled by default; access to StartOS services and other
   WireGuard devices is disabled by default. The same result can be scanned as
   a QR code or copied as text.
5. Turn off Wi-Fi for the first test, activate the tunnel, and open a website.
   This confirms the connection works from outside your home.

## Managing devices

- Run **Add Device** for every phone or computer. Do not reuse one profile on
  multiple devices.
- Run **Manage Device Access** to change whether a device can reach the
  internet, your private home network, or local StartOS services and other
  WireGuard devices. Changes take effect on the server; the profile does not
  need to be imported again.
- Run **View Active Devices** to see devices active within the last 10 minutes
  and their download/upload traffic for the current day, week, month, and in
  total.
- Run **View Device Profile** to show a device’s QR code or profile text again.
- Run **Remove Device** when a device is lost, replaced, or should no longer
  connect. Its old profile stops working.
- Run **Set Connection Address** again if your public IP, domain, or external
  port changes. Then view and re-import each device profile so it uses the new
  address.
- If your home LAN uses `10.44.0.x`, or otherwise overlaps the WireGuard
  tunnel, run **Change CIDR** under **Tunnel Settings**. WireGuard cannot detect
  the overlap for you — the symptom is that a connected device can no longer
  reach your own home network. Choose a non-conflicting private IPv4 `/24` and
  IPv6 unique-local `/64`, then view and re-import every device profile.
  Changing either CIDR changes device tunnel addresses.

Profiles contain private keys, so they are hidden until you reveal them. Only
display, scan, or copy a profile on a device you trust.
