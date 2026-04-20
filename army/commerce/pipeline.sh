#!/bin/bash
# Automated Commerce Pipeline - Runs continuously

WORKSPACE="/home/node/.openclaw/workspace/command-center/army/commerce/workers"
LOG="/tmp/commerce-pipeline.log"

echo "[$(date)] Commerce pipeline starting..." >> $LOG

while true; do
    echo "[$(date)] Running Design Worker..." >> $LOG
    cd "$WORKSPACE/design" && node generator.js >> $LOG 2>&1
    
    echo "[$(date)] Running POD Worker..." >> $LOG
    cd "$WORKSPACE/pod" && node uploader.js >> $LOG 2>&1
    
    echo "[$(date)] Cycle complete. Sleeping 5 minutes..." >> $LOG
    sleep 300
done
