#!/bin/sh
set -eu
set -o pipefail

configuration=/data/wg0.conf
statistics=/data/wg0.stats
temporary_statistics=/data/.wg0.stats.tmp

cleanup_firewall() {
  for tool in iptables ip6tables; do
    if [ "$tool" = iptables ]; then
      main_chain=WG4_STARTOS
    else
      main_chain=WG6_STARTOS
    fi

    while "$tool" -D FORWARD -i wg0 -j "$main_chain" >/dev/null 2>&1; do
      :
    done
    while "$tool" -D FORWARD -o wg0 -m conntrack \
      --ctstate RELATED,ESTABLISHED -j ACCEPT >/dev/null 2>&1; do
      :
    done
    while "$tool" -D FORWARD -i wg0 -j ACCEPT >/dev/null 2>&1; do
      :
    done

    "$tool" -F "$main_chain" >/dev/null 2>&1 || true
    for policy in 000 001 010 011 100 101 110 111; do
      policy_chain="${main_chain}_${policy}"
      "$tool" -F "$policy_chain" >/dev/null 2>&1 || true
      "$tool" -X "$policy_chain" >/dev/null 2>&1 || true
    done
    "$tool" -X "$main_chain" >/dev/null 2>&1 || true
  done

  while iptables -t nat -D POSTROUTING -s 10.44.0.0/24 \
    -o eth0 -j MASQUERADE >/dev/null 2>&1; do
    :
  done
  while ip6tables -t nat -D POSTROUTING -s fd44:5747:5354::/64 \
    -o eth0 -j MASQUERADE >/dev/null 2>&1; do
    :
  done
}

wg-quick down "$configuration" >/dev/null 2>&1 || true
cleanup_firewall
rm -f \
  "$temporary_statistics" \
  /data/.wg0.stats.raw.tmp \
  /data/.wg0.stats.day.tmp \
  /data/.wg0.stats.state.tmp \
  /data/.wg0.stats.history.tmp \
  /data/wg0.stats.day \
  /data/wg0.stats.state \
  /data/wg0.stats.history
[ -f "$statistics" ] || : >"$statistics"

update_statistics() {
  day=$(date +%Y-%m-%d)
  week=$(date +%G-W%V)
  month=$(date +%Y-%m)

  if wg show wg0 dump 2>/dev/null |
    awk -F '\t' \
      -v state_file="$statistics" \
      -v day="$day" \
      -v week="$week" \
      -v month="$month" \
      -f /usr/local/bin/collect-wireguard-statistics.awk \
      >"$temporary_statistics"; then
    chmod 0644 "$temporary_statistics"
    mv "$temporary_statistics" "$statistics"
  else
    rm -f "$temporary_statistics"
  fi
}

cleanup() {
  rm -f "$temporary_statistics"
  wg-quick down "$configuration" >/dev/null 2>&1 || true
  cleanup_firewall
  exit 0
}

trap cleanup INT TERM
wg-quick up "$configuration"

while true; do
  update_statistics
  sleep 30 &
  wait $!
done
