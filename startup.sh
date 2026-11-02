#!/bin/sh
cd /workspace
if curl -sf -o /dev/null --max-time 1 http://127.0.0.1:8080/; then
  exit 0
fi
DESK_PORT=8080 npm run dev > /tmp/dev-server.log 2>&1 &
