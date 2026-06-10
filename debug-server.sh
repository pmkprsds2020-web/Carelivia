#!/bin/bash
cd /home/z/my-project
while true; do
  node node_modules/.bin/next dev -p 3000 2>&1 | tee -a /home/z/my-project/dev.log
  EXIT_CODE=${PIPESTATUS[0]}
  echo "Server exited with code $EXIT_CODE at $(date)" >> /home/z/my-project/dev.log
  sleep 3
done
