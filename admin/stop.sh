#!/usr/bin/env bash
# Stops the admin server (admin/server.py) started with start.sh or run
# directly/in the background. Also stops its Cloudflare tunnel if it
# started one with --tunnel.
set -uo pipefail

PIDS=$(pgrep -f "admin/server\.py" || true)

if [ -z "$PIDS" ]; then
    echo "Admin server is not running."
    exit 0
fi

for pid in $PIDS; do
    # cloudflared is a child process of server.py; grab its pid before the
    # parent exits, in case the graceful shutdown doesn't catch it.
    tunnel_pid=$(pgrep -P "$pid" -f cloudflared || true)

    echo "Stopping admin server (pid $pid)..."
    kill -TERM "$pid" 2>/dev/null || true

    for _ in $(seq 1 10); do
        kill -0 "$pid" 2>/dev/null || break
        sleep 0.5
    done

    if kill -0 "$pid" 2>/dev/null; then
        echo "  pid $pid didn't stop in time, forcing..."
        kill -KILL "$pid" 2>/dev/null || true
    fi

    if [ -n "$tunnel_pid" ] && kill -0 "$tunnel_pid" 2>/dev/null; then
        echo "  cleaning up leftover cloudflared tunnel (pid $tunnel_pid)..."
        kill -TERM "$tunnel_pid" 2>/dev/null || true
    fi
done

echo "Done."
