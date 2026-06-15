#!/bin/bash
# CareLivia Server Watchdog — keeps the server running
while true; do
  echo "[$(date)] Starting CareLivia server..."
  cd /home/z/my-project
  npx next start -p 3000 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3 seconds..."
  sleep 3
done
