#!/bin/sh
set -eu

uv run python -m backend.app &
backend_pid="$!"

trap 'kill "$backend_pid" 2>/dev/null || true' INT TERM EXIT

exec nginx -g 'daemon off;'
