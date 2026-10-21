#!/usr/bin/env bash
set -euo pipefail

LIGHTHOUSE_VERSION="13.5.0"

usage() {
  cat <<'USAGE'
Run the local Lighthouse baseline: production image behind a brotli/gzip proxy.

Usage: scripts/lighthouse-local.sh [options]

Options:
  --dist DIR         skip the image build: serve this built site (an `astro build`
                     output, such as an english-first build) with the repo's nginx
                     config in the Dockerfile's nginx base image
                     (default: build the production image)
  --urls LIST        comma-separated paths (default: /,/pricing/,/ja/,/ar/,/privacy/)
  --runs N           runs per URL and device (default: 3)
  --devices LIST     mobile,desktop (default: mobile,desktop)
  --out-dir DIR      raw JSON and log destination
                     (default: tasks/baselines/<YYYY-MM>/lighthouse)
  --container-port P host port for the nginx container (default: 18101)
  --proxy-port P     host port for the compressing proxy (default: 18102)
  --name NAME        docker image and container name (default: sb-lighthouse)
  --help             show this message

Exit codes: 0 succeeded, 1 failed, 2 called wrongly.
Raw JSON goes to --out-dir; a median table goes to stdout.

Example: scripts/lighthouse-local.sh --urls /,/pricing/ --runs 3
Example: scripts/lighthouse-local.sh --dist dist --urls /pricing/ --devices mobile
USAGE
}

die_usage() {
  echo "error: $1" >&2
  usage >&2
  exit 2
}

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
urls="/,/pricing/,/ja/,/ar/,/privacy/"
runs=3
devices="mobile,desktop"
out_dir="$root/tasks/baselines/$(date +%Y-%m)/lighthouse"
container_port=18101
proxy_port=18102
name="sb-lighthouse"
dist=""

while [ $# -gt 0 ]; do
  case "$1" in
    --help)
      usage
      exit 0
      ;;
    --dist | --urls | --runs | --devices | --out-dir | --container-port | --proxy-port | --name)
      [ $# -ge 2 ] || die_usage "$1 needs a value"
      case "$1" in
        --dist) dist="$2" ;;
        --urls) urls="$2" ;;
        --runs) runs="$2" ;;
        --devices) devices="$2" ;;
        --out-dir) out_dir="$2" ;;
        --container-port) container_port="$2" ;;
        --proxy-port) proxy_port="$2" ;;
        --name) name="$2" ;;
      esac
      shift 2
      ;;
    *) die_usage "unknown argument: $1" ;;
  esac
done
case "$runs" in '' | *[!0-9]* | 0) die_usage "--runs must be a positive integer" ;; esac
if [ -n "$dist" ]; then
  [ -f "$dist/index.html" ] || die_usage "--dist $dist is not a built site (no index.html)"
  dist="$(cd "$dist" && pwd)"
fi

mkdir -p "$out_dir"
log="$out_dir/run.log"
: >"$log"
echo "log: $log"

proxy_pid=""
cleanup() {
  [ -z "$proxy_pid" ] || kill "$proxy_pid" 2>/dev/null || true
  docker rm -f "$name" >/dev/null 2>&1 || true
}
trap cleanup EXIT

fail() {
  echo "FAILED: $1 (see $log)" >&2
  exit 1
}

slug_of() {
  local s
  s="${1#/}"
  s="${s%/}"
  s="${s//\//-}"
  echo "${s:-home}"
}

# The production stage without its build: the Dockerfile's nginx base image, the repo's nginx
# config where the Dockerfile puts it, and a site that is already built (--dist).
serve_dist() {
  local base
  base="$(sed -n 's/^FROM \(nginx:[^ ]*\).*/\1/p' "$root/Dockerfile" | tail -n 1)"
  [ -n "$base" ] || fail "no nginx base image in the Dockerfile"
  docker create --name "$name" -p "127.0.0.1:$container_port:80" "$base" >>"$log" 2>&1 || fail "docker create"
  # Every nginx/*.conf goes to /etc/nginx/side-badger/ and default.conf also to conf.d/, as in the
  # Dockerfile; the stray copy of default.conf is inert, since only explicit includes read that folder
  docker cp "$root/nginx/." "$name:/etc/nginx/side-badger" >>"$log" 2>&1 || fail "copy nginx config"
  docker cp "$root/nginx/default.conf" "$name:/etc/nginx/conf.d/default.conf" >>"$log" 2>&1 || fail "copy default.conf"
  docker cp "$dist/." "$name:/usr/share/nginx/html" >>"$log" 2>&1 || fail "copy $dist"
  docker start "$name" >>"$log" 2>&1 || fail "docker start"
}

started=$(date +%s)
docker rm -f "$name" >/dev/null 2>&1 || true
if [ -n "$dist" ]; then
  echo "serving $dist"
  serve_dist
else
  echo "building image $name"
  docker build -t "$name" "$root" >>"$log" 2>&1 || fail "docker build"
  docker run -d --name "$name" -p "127.0.0.1:$container_port:80" "$name" >>"$log" 2>&1 || fail "docker run"
fi

node "$root/scripts/lighthouse-proxy.mjs" --listen "$proxy_port" --target "$container_port" >>"$log" 2>&1 &
proxy_pid=$!

ready=0
for _ in $(seq 1 60); do
  if curl -fs --max-time 2 "http://127.0.0.1:$proxy_port/health" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
[ "$ready" = 1 ] || fail "server did not become ready"

IFS=',' read -r -a url_list <<<"$urls"
IFS=',' read -r -a device_list <<<"$devices"
total=$((${#url_list[@]} * ${#device_list[@]} * runs))
done_count=0

for device in "${device_list[@]}"; do
  case "$device" in
    mobile) preset=(--form-factor=mobile) ;;
    desktop) preset=(--preset=desktop) ;;
    *) fail "unknown device: $device" ;;
  esac
  for path in "${url_list[@]}"; do
    slug="$(slug_of "$path")"
    for n in $(seq 1 "$runs"); do
      echo "lighthouse $((done_count + 1))/$total: $device $path run $n"
      npx --yes "lighthouse@$LIGHTHOUSE_VERSION" "http://127.0.0.1:$proxy_port$path" "${preset[@]}" \
        --only-categories=performance,accessibility,seo --output=json \
        --output-path="$out_dir/$slug-$device-$n.json" \
        --chrome-flags="--headless=new" --quiet >>"$log" 2>&1 || fail "lighthouse $device $path run $n"
      done_count=$((done_count + 1))
    done
  done
done

# Median table over the raw JSON, one row per page and device.
OUT_DIR="$out_dir" URLS="$urls" DEVICES="$devices" node --input-type=module - <<'NODE'
import fs from 'node:fs';
const dir = process.env.OUT_DIR;
const med = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
console.log('page\tdevice\tperf (runs)\tFCP s\tLCP s\tCLS\tTBT ms\tSI s\ta11y\tseo');
for (const device of process.env.DEVICES.split(',')) {
  for (const path of process.env.URLS.split(',')) {
    const slug = path.replace(/^\//, '').replace(/\/$/, '').replace(/\//g, '-') || 'home';
    const reps = fs.readdirSync(dir)
      .filter((f) => new RegExp(`^${slug}-${device}-\\d+\\.json$`).test(f))
      .map((f) => JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8')));
    if (!reps.length) continue;
    const a = (id) => reps.map((r) => r.audits[id].numericValue);
    const cat = (c) => med(reps.map((r) => Math.round(r.categories[c].score * 100)));
    const perf = reps.map((r) => Math.round(r.categories.performance.score * 100));
    console.log([path, device, `${med(perf)} (${perf.join(', ')})`,
      (med(a('first-contentful-paint')) / 1000).toFixed(2),
      (med(a('largest-contentful-paint')) / 1000).toFixed(2),
      med(a('cumulative-layout-shift')).toFixed(3),
      Math.round(med(a('total-blocking-time'))),
      (med(a('speed-index')) / 1000).toFixed(2),
      cat('accessibility'), cat('seo')].join('\t'));
  }
}
NODE

echo "done: $done_count runs in $(($(date +%s) - started))s; raw JSON and log in $out_dir"
