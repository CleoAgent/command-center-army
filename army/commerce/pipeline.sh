#!/bin/bash
# Automated Multi-Platform Commerce Pipeline

WORKSPACE="/home/node/.openclaw/workspace/command-center/army/commerce/workers"
LOG="/tmp/commerce-pipeline.log"

echo "[$(date)] Multi-Platform Commerce pipeline starting..." >> $LOG

while true; do
    echo "[$(date)] === NEW CYCLE ===" >> $LOG
    
    # Phase 1: Generate Designs
    echo "[$(date)] [Commerce Captain] Running Design Worker (Gemini + rembg)..." >> $LOG
    cd "$WORKSPACE/design" && node generator.js >> $LOG 2>&1
    
    # Phase 2: Generate Mockups
    echo "[$(date)] [Commerce Captain] Running Mockup Generator (Printful API)..." >> $LOG
    cd "$WORKSPACE/pod" && node uploader.js >> $LOG 2>&1
    
    # Phase 3: Publish to Shopify (Immediate, no approval needed)
    echo "[$(date)] [Commerce Captain] Running Shopify Publisher..." >> $LOG
    cd "$WORKSPACE" && node shopify_publisher.js >> $LOG 2>&1
    
    # Phase 4: Publish to Etsy (If tokens are available)
    echo "[$(date)] [Commerce Captain] Running Etsy Publisher..." >> $LOG
    cd "$WORKSPACE" && node etsy_publisher.js >> $LOG 2>&1
    
    # Phase 5: Drive Traffic (Pinterest)
    echo "[$(date)] [Growth Captain] Running Pinterest Growth..." >> $LOG
    cd "$WORKSPACE" && node pinterest_growth.js >> $LOG 2>&1
    
    echo "[$(date)] === CYCLE COMPLETE ===" >> $LOG
    echo "[$(date)] Sleeping 15 minutes before next cycle..." >> $LOG
    sleep 900
done
