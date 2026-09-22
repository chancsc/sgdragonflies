#!/usr/bin/env bash
# Stops the admin server (admin/server.py), and can restart it too.
# Also stops its Cloudflare tunnel if it started one with --tunnel.
#
# Usage:
#   admin/stop.sh                   # stop the running admin server
#   admin/stop.sh --restart [args]  # stop it, then start a fresh one in
#                                    # the background (args are forwarded
#                                    # to server.py, e.g. a port or --tunnel)
set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG="$DIR/server.log"

stop() {
    PIDS=$(pgrep -f "admin/server\.py" || true)

    if [ -z "$PIDS" ]; then
        echo "Admin server is not running."
        return 0
    fi

    for pid in $PIDS; do
        # cloudflared is a child process of server.py; grab its pid before
        # the parent exits, in case the graceful shutdown doesn't catch it.
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
}

if [ "${1:-}" = "--restart" ]; then
    shift
    stop
    echo "Starting admin server..."
    nohup python3 "$DIR/server.py" "$@" > "$LOG" 2>&1 &
    disown

    sleep 1
    if pgrep -f "admin/server\.py" > /dev/null; then
        echo "Started (pid $(pgrep -f "admin/server\.py" | head -1)). Logs: $LOG"
        tail -n 5 "$LOG"
    else
        echo "Failed to start - check $LOG" >&2
        exit 1
    fi
else
    stop
fi
