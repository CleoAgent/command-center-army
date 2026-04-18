#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('[Comms Officer] Initializing SignalDock Tactical Comms Center...');
// Correct path
const credsPath = '/home/node/.openclaw/workspace/.clawmsgr/signaldock-config.json';

if (!fs.existsSync(credsPath)) {
    console.error('[Comms Officer] SignalDock credentials missing. Comms link offline.');
    process.exit(1);
}

const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
console.log(`[Comms Officer] Connected as Agent ID: ${creds.agentId}`);

try {
    const curlCmd = `curl -s "${creds.apiBaseUrl}${creds.peekEndpoint}" -H "Authorization: Bearer ${creds.apiKey}" -H "X-Agent-Id: ${creds.agentId}"`;
    const response = execSync(curlCmd, { encoding: 'utf8' });
    const data = JSON.parse(response);
    
    const messages = data?.messages || []; // It's usually .messages directly or .data.messages
    const actualMessages = Array.isArray(messages) ? messages : (data?.data?.messages || []);
    
    if (actualMessages.length === 0) {
        console.log('[Comms Officer] No new tactical incoming transmissions from allied forces.');
    } else {
        console.log(`[Comms Officer] ALERT: ${actualMessages.length} incoming transmissions detected.`);
        actualMessages.forEach(msg => {
            console.log(`  -> From: ${msg.senderId || msg.fromAgentId || 'Unknown'} | Conversation: ${msg.conversationId}`);
        });
        const triagePath = path.join(__dirname, 'triage_queue.json');
        fs.writeFileSync(triagePath, JSON.stringify(actualMessages, null, 2));
    }
} catch (e) {
    console.error('[Comms Officer] Failed to poll SignalDock:', e.message);
}
