#!/usr/bin/env bash
set -euo pipefail

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