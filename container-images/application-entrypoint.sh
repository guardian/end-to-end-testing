#!/usr/bin/env bash
set -euo pipefail

if [[ -n ${BASE_DOMAIN:-} ]]; then
  # Docker resolves host-gateway only into /etc/hosts, so read the IP back from there.
  host_gateway_ip=$(getent ahostsv4 host.docker.internal | awk 'NR == 1 { print $1 }' || true)
  if [[ -z $host_gateway_ip ]]; then
    printf '%s\n' 'BASE_DOMAIN is set but host.docker.internal is not mapped to host-gateway.' >&2
    exit 1
  fi

  if [[ ! -f /etc/resolv.dnsmasq.conf ]]; then
    cp /etc/resolv.conf /etc/resolv.dnsmasq.conf
  fi

  dnsmasq \
    --conf-file=/dev/null \
    --pid-file= \
    --listen-address=127.0.0.1 \
    --bind-interfaces \
    --resolv-file=/etc/resolv.dnsmasq.conf \
    --address="/${BASE_DOMAIN}/${host_gateway_ip}"

  # /etc/resolv.conf is bind-mounted by Docker, so overwrite it in place.
  {
    printf '%s\n' 'nameserver 127.0.0.1'
    grep -v '^nameserver' /etc/resolv.dnsmasq.conf || true
  } > /etc/resolv.conf
fi

if [[ -f .tool-versions ]]; then
  mise trust .tool-versions
  mise install
  mise reshim
fi

if [[ -n ${CAROOT:-} && -f "$CAROOT/rootCA.pem" ]]; then
  mise exec -- mkcert -install
fi

if (( $# == 0 )); then
  printf '%s\n' 'An application command is required.' >&2
  exit 1
fi

exec "$@"