#!/bin/sh
set -eu

sysctl -w net.ipv4.ip_forward=1 >/dev/null
sysctl -w net.ipv4.conf.all.src_valid_mark=1 >/dev/null
sysctl -w net.ipv6.conf.all.disable_ipv6=0 >/dev/null
sysctl -w net.ipv6.conf.all.forwarding=1 >/dev/null
sysctl -w net.ipv6.conf.default.forwarding=1 >/dev/null
