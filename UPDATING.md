# Updating WireGuard

The service image is built from the root `Dockerfile`. Alpine supplies
`wireguard-tools`, `wireguard-go`, `iproute2`, and `iptables`.

## Determine available versions

Build the image or run:

```sh
docker run --rm alpine:3.24 apk info -a wireguard-tools wireguard-go
```

Review WireGuard tools changes at
<https://git.zx2c4.com/wireguard-tools/log/> and Alpine package changes before
moving the base image.

## Apply an update

1. Update the Alpine tag in `Dockerfile` when required.
2. Build the image and record the installed `wg --version`.
3. Bump `startos/versions/current.ts` and write user-facing release notes.
4. Run `npm run prettier`, `npm test`, `npm run check`, and `make x86`.
5. Verify setup, profile import, handshake, revocation, and backup/restore on a
   StartOS server.
