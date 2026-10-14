#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
log="$root/tmp/dev.log"
container="side-badger-website"
port=4321
compose=(docker compose --project-directory "$root" -f "$root/docker-compose.yml" -f "$root/docker-compose.local.yml" -f "$root/docker-compose.watch.yml")

usage() {
  cat <<EOF
Stop any running local dev container, rebuild it, start it and watch for changes.

Usage: scripts/dev.sh [--help]

  --help   Show this message.

Example: npm run dev    # then open http://localhost:$port, Ctrl-C to stop watching
EOF
}

# Earlier "npm run dev" watchers for this checkout, found by working directory
stop_old_watchers() {
  local pid cwd
  for pid in $(pgrep -f "compose .*docker-compose\.watch\.yml watch$" || true); do
    cwd="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' || true)"
    if [ "$cwd" = "$root" ]; then
      kill "$pid" 2>/dev/null || true
      # Compose holds a per-project lock until the watcher exits
      for _ in 1 2 3 4 5 6 7 8 9 10; do
        kill -0 "$pid" 2>/dev/null || break
        sleep 1
      done
    fi
  done
}

main() {
  case "${1:-}" in
    --help) usage && exit 0 ;;
    "") ;;
    *) usage >&2 && exit 2 ;;
  esac

  mkdir -p "$root/tmp"
  : >"$log"
  echo "log: $log"

  echo "stopping the running dev container, if any"
  stop_old_watchers
  "${compose[@]}" down --remove-orphans >>"$log" 2>&1
  # Also one started from another checkout or compose project, which holds the name
  docker rm -f "$container" >>"$log" 2>&1 || true

  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >>"$log" 2>&1; then
    echo "port $port is still in use (see $log), perhaps by 'npm run dev:host'; stop it and re-run" >&2
    exit 1
  fi

  echo "building and starting $container"
  if ! "${compose[@]}" up --build -d >>"$log" 2>&1; then
    echo "build or start failed, see $log" >&2
    exit 1
  fi

  echo "running at http://localhost:$port, watching for changes (Ctrl-C to stop)"
  exec "${compose[@]}" watch >>"$log" 2>&1
}

main "$@"
