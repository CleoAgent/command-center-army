#!/bin/bash
# Autonomous Army Execution Loop - Runs every 15 minutes

export PATH="/home/node/.local/bin:/usr/local/bin:$PATH"
cd /home/node/.openclaw/workspace

LOG_FILE="/home/node/.openclaw/workspace/.automation/logs/army-loop.log"
mkdir -p "$(dirname "$LOG_FILE")"

echo "[$(date -Iseconds)] Army loop starting..." >> "$LOG_FILE"

# Commerce Pipeline
node command-center/army/commerce/workers/catalog/generator.js >> "$LOG_FILE" 2>&1
node command-center/army/commerce/workers/design/generator.js >> "$LOG_FILE" 2>&1
node command-center/army/commerce/workers/pod/uploader.js >> "$LOG_FILE" 2>&1

# Growth Pipeline  
node command-center/army/growth/workers/seo/generator.js >> "$LOG_FILE" 2>&1

echo "[$(date -Iseconds)] Army loop complete." >> "$LOG_FILE"
node /home/node/.openclaw/workspace/command-center/army/platform/workers/communications/comms-center.js >> "$LOG_FILE" 2>&1
