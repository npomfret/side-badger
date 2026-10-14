#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Smoke-test the nginx URL policy against the built site image (tasks plan 2.2, 2.9).

Usage: scripts/check-nginx.sh [options]

Builds the image (or uses --image), runs it, replays
src/__tests__/fixtures/legacy-urls.txt and checks redirects, 404s, the /go/
launch counter, the security headers and /og/ headers.

Options:
  --image NAME      use an existing image instead of building one
  --tag NAME        tag for the image this script builds (default: sb-nginx-check)
  --port P          host port for the container (default: 18200)
  --url BASE        test an already running server, e.g. http://127.0.0.1:8080
                    (no container is started; the launch-log check is skipped)
  --skip GROUPS     comma-separated groups to skip. Groups: pages, aliases,
                    slash, notfound, go, headers, og (default: none)
  --log FILE        log file (default: a temp file, path printed first)
  --keep            leave the container running afterwards
  --help            show this message

Exit codes: 0 all checks passed, 1 a check failed, 2 called wrongly.
Console shows progress and a summary; every request is in the log file.

Example: scripts/check-nginx.sh --port 18201 --skip aliases,og
USAGE
}

die_usage() {
  echo "error: $1" >&2
  usage >&2
  exit 2
}

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fixture="$root/src/__tests__/fixtures/legacy-urls.txt"
image=""
tag="sb-nginx-check"
port=18200
base=""
skip=""
log=""
keep=0
container=""
pass=0
fail=0
failed_groups=""
body_file=""

while [ $# -gt 0 ]; do
  case "$1" in
    --help)
      usage
      exit 0
      ;;
    --image | --tag | --port | --url | --skip | --log)
      [ $# -ge 2 ] || die_usage "$1 needs a value"
      case "$1" in
        --image) image="$2" ;;
        --tag) tag="$2" ;;
        --port) port="$2" ;;
        --url) base="${2%/}" ;;
        --skip) skip="$2" ;;
        --log) log="$2" ;;
      esac
      shift 2
      ;;
    --keep)
      keep=1
      shift
      ;;
    *) die_usage "unknown argument: $1" ;;
  esac
done

case "$port" in
  '' | *[!0-9]*) die_usage "--port must be a number" ;;
esac
[ -f "$fixture" ] || die_usage "fixture missing: $fixture"

tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/check-nginx.XXXXXX")"
body_file="$tmp_dir/body"
[ -n "$log" ] || log="$tmp_dir/check-nginx.log"

cleanup() {
  if [ -n "$container" ] && [ "$keep" -eq 0 ]; then
    docker rm -f "$container" >/dev/null 2>&1 || true
  fi
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

note() { echo "$*" >>"$log"; }

skipped() {
  case ",$skip," in
    *",$1,"*) return 0 ;;
  esac
  return 1
}

# check GROUP DESCRIPTION EXPECTED ACTUAL
check() {
  local group="$1" desc="$2" expected="$3" actual="$4"
  if [ "$expected" = "$actual" ]; then
    pass=$((pass + 1))
    note "ok   [$group] $desc"
  else
    fail=$((fail + 1))
    note "FAIL [$group] $desc: expected '$expected', got '$actual'"
    case ",$failed_groups," in
      *",$group,"*) ;;
      *) failed_groups="${failed_groups:+$failed_groups,}$group" ;;
    esac
  fi
}

# fetch PATH -> sets status, location, size (no redirect following)
fetch() {
  local out
  out="$(curl -s -o "$body_file" --max-time 10 \
    -w '%{http_code} %{redirect_url} %{size_download}' "$base$1")" || out="000  0"
  status="${out%% *}"
  out="${out#* }"
  location="${out% *}"
  size="${out##* }"
  note "GET $1 -> $status ${location:-} ($size bytes)"
}

# header_count PATH NAME -> number of times the header appears
header_count() {
  curl -s -o /dev/null -D - --max-time 10 "$base$1" |
    tr -d '\r' | grep -ic "^$2:" || true
}

header_value() {
  curl -s -o /dev/null -D - --max-time 10 "$base$1" |
    tr -d '\r' | grep -i "^$2:" | head -1 | sed 's/^[^:]*: *//' || true
}

start_server() {
  if [ -n "$base" ]; then
    return
  fi
  command -v docker >/dev/null 2>&1 || {
    echo "error: docker is required (or pass --url)" >&2
    exit 1
  }
  if [ -z "$image" ]; then
    echo "building image $tag"
    docker build -q -t "$tag" "$root" >>"$log" 2>&1 || {
      echo "error: docker build failed, see $log" >&2
      exit 1
    }
    image="$tag"
  fi
  container="${tag}-run-$$"
  docker run -d --name "$container" -p "$port:80" "$image" >>"$log" 2>&1 || {
    echo "error: docker run failed, see $log" >&2
    exit 1
  }
  base="http://127.0.0.1:$port"
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
    if curl -s -o /dev/null --max-time 2 "$base/health"; then
      return
    fi
    sleep 0.5
  done
  echo "error: server did not become ready, see $log" >&2
  exit 1
}

alias_target() {
  # /en-gb/x/ -> /x/ ; /nl-NL/x/ -> /nl-BE/x/ ; prints nothing for non-aliases
  case "$1" in
    /en-us/* | /en-au/* | /en-gb/* | /en-ca/* | /en-ie/* | /en-sc/*)
      echo "/${1#/*/}"
      ;;
    /nl-NL/*)
      echo "/nl-BE/${1#/nl-NL/}"
      ;;
  esac
}

check_pages_and_aliases() {
  local url path target n=0
  while IFS= read -r url || [ -n "$url" ]; do
    [ -n "$url" ] || continue
    path="/${url#https://*/}"
    target="$(alias_target "$path")"
    n=$((n + 1))
    if [ -n "$target" ]; then
      skipped aliases && continue
      fetch "$path"
      check aliases "$path is one 301" "301" "$status"
      check aliases "$path redirects to $target" "$target" "${location#"$base"}"
      fetch "$target"
      check aliases "$path target $target is 200" "200" "$status"
    else
      skipped pages && continue
      fetch "$path"
      check pages "$path is 200" "200" "$status"
    fi
  done <"$fixture"
  echo "replayed $n fixture URLs"
}

check_slash_policy() {
  local p
  for p in /pricing /ja /privacy /ph; do
    fetch "$p"
    check slash "$p is 301 to slash form" "301 $p/" "$status ${location#"$base"}"
    fetch "$p?x=1"
    check slash "$p?x=1 keeps its query" "301 $p/?x=1" "$status ${location#"$base"}"
    fetch "$p/index.html"
    check slash "$p/index.html is 301" "301 $p/" "$status ${location#"$base"}"
  done
  fetch "/index.html"
  check slash "/index.html is 301 to /" "301 /" "$status ${location#"$base"}"
  fetch "/pricing.html"
  check slash "/pricing.html is 404" "404" "$status"
  fetch "/_astro/"
  check slash "/_astro/ is 404, not 403" "404" "$status"
}

check_notfound() {
  fetch "/404.html"
  local want_size="$size"
  fetch "/nope"
  check notfound "/nope is 404" "404" "$status"
  check notfound "/nope serves the site's 404 page" "$want_size" "$size"
  fetch "/nope/deeper/"
  check notfound "/nope/deeper/ is 404" "404" "$status"
}

check_go() {
  local dash="https://app.sidebadger.me/dashboard"
  local reg="https://app.sidebadger.me/register"
  fetch "/go/app/?from=home&cta=header&lang=fr"
  check go "go/app with lang=fr" "302 $dash?lang=fr" "$status $location"
  fetch "/go/app/?from=home&cta=header&lang=evil"
  check go "go/app drops lang=evil" "302 $dash" "$status $location"
  fetch "/go/app/?from=home&lang=https://evil.example/&next=//evil.example"
  check go "go/app drops any other parameter" "302 $dash" "$status $location"
  fetch "/go/app/?lang=en"
  check go "go/app drops lang=en" "302 $dash" "$status $location"
  fetch "/go/register/?from=pricing&cta=hero&lang=nl-BE"
  check go "go/register with lang=nl-BE" "302 $reg?lang=nl-BE" "$status $location"
  fetch "/go/register/"
  check go "go/register bare" "302 $reg" "$status $location"

  if [ -n "$container" ]; then
    curl -s -o /dev/null --max-time 10 -A "Mozilla/5.0 (smoke)" \
      -e "https://referrer.example/page" \
      "$base/go/app/?from=smoke&cta=probe&lang=de"
    sleep 1
    local line
    line="$(docker logs "$container" 2>&1 | grep '"type":"launch"' | grep '"from":"smoke"' | tail -1 || true)"
    note "launch log line: $line"
    check go "launch log line exists" "yes" "$([ -n "$line" ] && echo yes || echo no)"
    # Keys are exactly the minimal set, and nothing else leaks in
    local keys
    keys="$(echo "$line" | grep -o '"[a-z]*":' | tr -d '\n' || true)"
    check go "launch log keys" '"type":"time":"target":"from":"cta":"lang":"bot":' "$keys"
    case "$line" in
      *Mozilla* | *referrer.example* | *192.168.* | *172.* | *127.0.0.1*)
        check go "launch log has no IP, user agent or referrer" "clean" "leaks"
        ;;
      *) check go "launch log has no IP, user agent or referrer" "clean" "clean" ;;
    esac
  else
    note "skipped launch-log check: no container (--url)"
  fi
}

check_headers() {
  local h p
  for p in / /pricing/ /nope; do
    for h in X-Frame-Options X-Content-Type-Options Referrer-Policy \
      Content-Security-Policy Permissions-Policy Cross-Origin-Opener-Policy \
      Cross-Origin-Resource-Policy; do
      check headers "$p has one $h" "1" "$(header_count "$p" "$h")"
    done
  done
  check headers "/ CORP is same-origin" "same-origin" "$(header_value / Cross-Origin-Resource-Policy)"
}

check_og() {
  fetch "/og/default-en.png"
  check og "/og/default-en.png is 200" "200" "$status"
  check og "/og/default-en.png has one CORP" "1" "$(header_count /og/default-en.png Cross-Origin-Resource-Policy)"
  check og "/og/default-en.png CORP is cross-origin" "cross-origin" "$(header_value /og/default-en.png Cross-Origin-Resource-Policy)"
}

main() {
  echo "log: $log"
  start_server
  check_pages_and_aliases
  skipped slash || check_slash_policy
  skipped notfound || check_notfound
  skipped go || check_go
  skipped headers || check_headers
  skipped og || check_og
  if [ "$keep" -eq 1 ] && [ -n "$container" ]; then
    echo "container left running: $container on port $port"
  fi
  echo "passed $pass, failed $fail"
  if [ "$fail" -gt 0 ]; then
    echo "failed groups: $failed_groups"
    echo "failures:"
    grep '^FAIL' "$log" | head -20 || true
    echo "full detail: $log"
    # The temp dir (and default log) is removed on exit; keep the log
    if [ "${log#"$tmp_dir"}" != "$log" ]; then
      cp "$log" "${TMPDIR:-/tmp}/check-nginx-last.log"
      echo "log copied to ${TMPDIR:-/tmp}/check-nginx-last.log"
    fi
    exit 1
  fi
}

main
