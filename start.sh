#!/usr/bin/env bash
# Start the micro:bit manager and open it in the browser.
cd "$(dirname "$0")" && exec python3 server.py "$@"
