#!/bin/bash
# Automated Decoupled Commerce Pipeline - Runs continuously

WORKSPACE="/home/node/.openclaw/workspace/command-center/army/commerce/workers"
LOG="/tmp/commerce-pipeline-decoupled.log"

echo "[$(date)] Decoupled Commerce pipeline starting..." >> $LOG

while true; do
    echo "[$(date)] Running Design Worker (Gemini + rembg)..." >> $LOG
    cd "$WORKSPACE/design" && node generator.js >> $LOG 2>&1
    
    echo "[$(date)] Running Mockup Generator (Printful API)..." >> $LOG
    cd "$WORKSPACE/pod" && node uploader.js >> $LOG 2>&1
    
    echo "[$(date)] Running Etsy Publisher (Throttled)..." >> $LOG
    # Random sleep between 4-8 hours to prevent Etsy API bans
    # Sleep 14400-28800 seconds (4-8 hours)
    RANDOM_SLEEP=$(( ( $RANDOM % 14400 )  + 14400 ))
    echo "Sleeping for $RANDOM_SLEEP seconds before pushing to Etsy..." >> $LOG
    sleep $RANDOM_SLEEP
    
    cd "$WORKSPACE" && node etsy_publisher.js >> $LOG 2>&1
done
