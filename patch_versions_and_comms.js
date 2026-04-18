const fs = require('fs');
const path = require('path');

// 1. Update server/index.js
let serverCode = fs.readFileSync('server/index.js', 'utf-8');

// Add new integration keys
serverCode = serverCode.replace(
  /fiverr: ''\n  }, null, 2\)\);/,
  `fiverr: '',
    signalDockAgentId: '',
    signalDockApiKey: ''
  }, null, 2));`
);

// Add dynamic version fetching
const versionCode = `// Dynamic versions
let cachedOpenClawVersion = 'Unknown';
let cachedCleoVersion = 'Unknown';

async function refreshVersions() {
  try {
    const oc = await execAsync('openclaw --version 2>/dev/null');
    if (oc.stdout) cachedOpenClawVersion = oc.stdout.trim().replace('OpenClaw ', '');
  } catch (e) {}
  try {
    const cl = await execAsync('npx cleo version 2>/dev/null');
    if (cl.stdout) {
      const match = cl.stdout.match(/v\\d+\\.\\d+\\.\\d+/);
      cachedCleoVersion = match ? match[0] : cl.stdout.trim();
    }
  } catch (e) {}
}
refreshVersions();
setInterval(refreshVersions, 60000 * 60);

// API Routes
app.get('/api/status', async (req, res) => {
  try {
    const cleoResult = await cleoCommand('ls --all');
    const tasks = cleoResult.success ? cleoResult.data?.tasks || [] : [];
    const sessionResult = await cleoCommand('session status');
    
    res.json({
      generatedAt: new Date().toISOString(),
      openclawVersion: cachedOpenClawVersion,
      cleoVersion: cachedCleoVersion,
      gatewayPid: '1072344',`;

serverCode = serverCode.replace(/\/\/ API Routes\napp\.get\('\/api\/status', async \(req, res\) => {\n  try {\n    const cleoResult = await cleoCommand\('ls --all'\);\n    const tasks = cleoResult\.success \? cleoResult\.data\?\.tasks \|\| \[\] : \[\];\n    const sessionResult = await cleoCommand\('session status'\);\n    \n    res\.json\({\n      generatedAt: new Date\(\)\.toISOString\(\),\n      openclawVersion: '2026\.4\.15 \\(041266a\\)',\n      gatewayPid: '1072344',/, versionCode);

fs.writeFileSync('server/index.js', serverCode);

// 2. Update Comms Worker to be batteries included
const commsCode = `#!/usr/bin/env node
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

console.log(\`[Comms Officer] Connected as Agent ID: \${creds.signalDockAgentId}\`);

try {
    const curlCmd = \`curl -s "\${apiBaseUrl}/messages/peek" -H "Authorization: Bearer \${creds.signalDockApiKey}" -H "X-Agent-Id: \${creds.signalDockAgentId}"\`;
    const response = execSync(curlCmd, { encoding: 'utf8' });
    const data = JSON.parse(response);
    
    const messages = data?.messages || (data?.data?.messages || []);
    
    if (messages.length === 0) {
        console.log('[Comms Officer] No new tactical incoming transmissions.');
    } else {
        console.log(\`[Comms Officer] ALERT: \${messages.length} incoming transmissions detected.\`);
        messages.forEach(msg => {
            console.log(\`  -> From: \${msg.senderId || msg.fromAgentId || 'Unknown'} | Conversation: \${msg.conversationId}\`);
        });
        const triagePath = path.join(__dirname, 'triage_queue.json');
        fs.writeFileSync(triagePath, JSON.stringify(messages, null, 2));
    }
} catch (e) {
    console.error('[Comms Officer] Failed to poll SignalDock:', e.message);
}
`;
fs.writeFileSync('army/platform/workers/communications/comms-center.js', commsCode);

console.log('Backend and Comms updated.');
