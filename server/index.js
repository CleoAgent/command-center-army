const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const app = express();
app.use(cors());
app.use(express.json());

const CONFIG_PATH = path.join(__dirname, '..', 'integrations.json');
const WORKSPACE = '/home/node/.openclaw/workspace';
const DIST_PATH = path.join(__dirname, '../app/dist');

// Ensure config exists
if (!fs.existsSync(CONFIG_PATH)) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({
    anthropic: '',
    openai: '',
    etsy: '',
    printful: '',
    fiverr: '',
    signalDockAgentId: '',
    signalDockApiKey: '',
    etsySharedSecret: '',
    etsyRefreshToken: '',
    etsyAccessToken: '',
    googleGemini: '',
    elevenlabs: '',
    sunoProxyKey: '',
    sunoBaseUrl: ''
  }, null, 2));
}

// CLEO Core API Wrapper
async function cleoCommand(args) {
  try {
    const { stdout } = await execAsync(`npx cleo ${args}`, { 
      cwd: WORKSPACE,
      timeout: 30000 
    });
    const lines = stdout.trim().split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        return JSON.parse(lines[i]);
      } catch {}
    }
    return { success: true, data: stdout };
  } catch (error) {
    const lines = error.stdout?.trim().split('\n') || [];
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse(lines[i]);
        if (parsed.success === false) return parsed;
      } catch {}
    }
    return { success: false, error: error.message };
  }
}

// Dynamic versions
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
      try {
        const parsed = JSON.parse(cl.stdout.trim());
        if (parsed.success && parsed.data && parsed.data.version) {
          cachedCleoVersion = parsed.data.version;
        }
      } catch (e) {
        const match = cl.stdout.match(/v\\d+\\.\\d+\\.\\d+|\\d+\\.\\d+\\.\\d+/);
        cachedCleoVersion = match ? match[0] : cl.stdout.trim();
      }
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
      gatewayPid: '1072344',
      telegramState: 'ON | OK',
      cleoTasks: tasks,
      session: sessionResult.success ? sessionResult.data : null,
      army: {
        captains: 6,
        workers: 18,
        activeMissions: tasks.filter(t => t.status === 'pending' && t.priority === 'critical').length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const ARMY_STATE_PATH = path.join(__dirname, '..', 'data', 'army_state.json');

app.get('/api/army/state', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(ARMY_STATE_PATH, 'utf8'));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load army state' });
  }
});

app.get('/api/army', (req, res) => {
  const armyPath = path.join(__dirname, '..', 'army');
  try {
    const captains = fs.readdirSync(armyPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(dir => {
        const captainPath = path.join(armyPath, dir.name);
        const soulPath = path.join(captainPath, 'SOUL.md');
        const workersPath = path.join(captainPath, 'workers');
        let workers = [];
        try {
          workers = fs.readdirSync(workersPath, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => d.name);
        } catch {}
        let soul = '';
        try {
          soul = fs.readFileSync(soulPath, 'utf-8');
        } catch {}
        return {
          id: dir.name,
          name: dir.name.charAt(0).toUpperCase() + dir.name.slice(1) + ' Captain',
          soul: soul.slice(0, 200) + '...',
          workers: workers
        };
      });
    res.json({ captains });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tasks', async (req, res) => {
  const result = await cleoCommand('ls --all');
  res.json(result);
});

app.post('/api/tasks', async (req, res) => {
  const { title, description, priority, parent, type, acceptance } = req.body;
  let cmd = 'add';
  if (type === 'epic') cmd += ' --type epic';
  if (parent) cmd += ` --parent ${parent}`;
  cmd += ` --title "${title}"`;
  cmd += ` --description "${description}"`;
  cmd += ` --priority ${priority}`;
  if (acceptance && Array.isArray(acceptance)) {
    acceptance.forEach(ac => {
      cmd += ` --acceptance "${ac}"`;
    });
  }
  const result = await cleoCommand(cmd);
  res.json(result);
});

app.post('/api/tasks/:id/claim', async (req, res) => {
  const result = await cleoCommand(`claim ${req.params.id}`);
  res.json(result);
});

app.post('/api/tasks/:id/complete', async (req, res) => {
  const result = await cleoCommand(`complete ${req.params.id}`);
  res.json(result);
});

app.get('/api/integrations', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    const redacted = Object.keys(data).reduce((acc, key) => {
      acc[key] = data[key] ? '********' + data[key].slice(-4) : '';
      return acc;
    }, {});
    res.json(redacted);
  } catch (e) {
    res.status(500).json({ error: 'Failed to read integrations' });
  }
});

app.post('/api/integrations', (req, res) => {
  try {
    const existing = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    const updates = req.body;
    Object.keys(updates).forEach(key => {
      if (updates[key] && !updates[key].startsWith('********')) {
        existing[key] = updates[key];
      }
    });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(existing, null, 2));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save integrations' });
  }
});

app.post('/api/dispatch', async (req, res) => {
  const { taskId } = req.body;
  const taskResult = await cleoCommand(`show ${taskId}`);
  if (!taskResult.success) {
    return res.status(404).json({ error: 'Task not found' });
  }
  const task = taskResult.data;
  let assignee = 'main';
  if (task.title.includes('Platform')) assignee = 'platform';
  else if (task.title.includes('Commerce')) assignee = 'commerce';
  else if (task.title.includes('Services')) assignee = 'services';
  else if (task.title.includes('Content')) assignee = 'content';
  else if (task.title.includes('Growth')) assignee = 'growth';
  else if (task.title.includes('Finance')) assignee = 'finance';
  await cleoCommand(`claim ${taskId}`);
  res.json({
    success: true,
    dispatched: true,
    taskId,
    assignee,
    message: `Task ${taskId} dispatched to ${assignee} captain`
  });
});



// Etsy OAuth PKCE State
const crypto = require('crypto');
const etsyAuthState = { verifier: '', state: '' };

app.get('/api/etsy/auth', (req, res) => {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const clientId = config.etsy;
  
  if (!clientId) {
    return res.status(400).send('Etsy Keystring not configured in Armory. Go back and save it first.');
  }

  const verifier = crypto.randomBytes(32).toString('base64url');
  const state = crypto.randomBytes(16).toString('hex');
  
  etsyAuthState.verifier = verifier;
  etsyAuthState.state = state;

  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const scopes = 'listings_r listings_w shops_r shops_w';
  
  // Dynamic fallback: Use whatever was registered in Etsy.
  // We'll let the user define it, or guess common defaults.
  const redirectUri = config.etsyCallbackUrl || `http://${req.get('host')}/api/etsy/callback`;
  
  const authUrl = `https://www.etsy.com/oauth/connect?response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&client_id=${encodeURIComponent(clientId)}&state=${state}&code_challenge=${challenge}&code_challenge_method=S256`;
  
  res.redirect(authUrl);
});

app.get('/api/etsy/callback', async (req, res) => {
  const { code, state, error } = req.query;
  
  if (error) {
    return res.status(400).send(`Etsy authorization error: ${error}`);
  }
  
  if (state !== etsyAuthState.state) {
    return res.status(400).send('Invalid state parameter.');
  }
  
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const redirectUri = config.etsyCallbackUrl || `http://${req.get('host')}/api/etsy/callback`;

  try {
    const response = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.etsy,
        redirect_uri: redirectUri,
        code: code,
        code_verifier: etsyAuthState.verifier
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }
    
    config.etsyAccessToken = data.access_token;
    config.etsyRefreshToken = data.refresh_token;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    
    res.send('<div style="font-family: monospace; color: #10b981; background: #020617; padding: 20px; height: 100vh;">[Commerce Captain] Etsy OAuth Authorized. Access and Refresh tokens secured in the Armory. You may close this window.</div>');
  } catch (err) {
    res.status(500).send(`Failed to exchange token: ${err.message}`);
  }
});
// Serve frontend static files

app.use(express.static(DIST_PATH));
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(DIST_PATH, 'index.html'));
});

// Run directly on 5173 to handle both frontend and backend
const PORT = 5173;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Command Center server (API + Static) running on port ${PORT}`);
});
