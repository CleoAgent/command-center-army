#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('[Comms Officer] Initializing SignalDock Tactical Comms...');

const credsPath = path.join(__dirname, '../../../../integrations.json');
if (!fs.existsSync(credsPath)) {
    console.error('[Comms Officer] integrations.json missing. Comms link offline.');
    process.exit(1);
}

const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));

if (!creds.signalDockAgentId || !creds.signalDockApiKey) {
    console.log('[Comms Officer] SignalDock credentials not configured in Armory. Standing by.');
    process.exit(0);
}

const apiBaseUrl = "https://api.signaldock.io";

console.log(`[Comms Officer] Connected as Agent ID: ${creds.signalDockAgentId}`);

try {
    const curlCmd = `curl -s "${apiBaseUrl}/messages/peek" -H "Authorization: Bearer ${creds.signalDockApiKey}" -H "X-Agent-Id: ${creds.signalDockAgentId}"`;
    const response = execSync(curlCmd, { encoding: 'utf8' });
    const data = JSON.parse(response);
    
    const messages = data?.messages || (data?.data?.messages || []);
    
    if (messages.length === 0) {
        console.log('[Comms Officer] No new tactical incoming transmissions.');
    } else {
        console.log(`[Comms Officer] ALERT: ${messages.length} incoming transmissions detected.`);
        messages.forEach(msg => {
            console.log(`  -> From: ${msg.senderId || msg.fromAgentId || 'Unknown'} | Conversation: ${msg.conversationId}`);
        });
        const triagePath = path.join(__dirname, 'triage_queue.json');
        fs.writeFileSync(triagePath, JSON.stringify(messages, null, 2));
    }
} catch (e) {
    console.error('[Comms Officer] Failed to poll SignalDock:', e.message);
}
