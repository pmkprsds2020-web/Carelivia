#!/bin/bash
while true; do
  cd /home/z/my-project
  bun .next/standalone/server.js
  echo "Server died at $(date), restarting in 3 seconds..."
  sleep 3
done
