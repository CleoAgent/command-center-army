const fs = require('fs');
const path = require('path');

let code = fs.readFileSync('server/index.js', 'utf8');

const newRoutes = `
// Etsy OAuth PKCE State
const crypto = require('crypto');
const etsyAuthState = { verifier: '', state: '' };

app.get('/api/etsy/auth', (req, res) => {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const clientId = config.etsy;
  
  if (!clientId) {
    return res.status(400).send('Etsy Keystring not configured in Armory. Go back and save it first.');
  }

  // Generate PKCE verifier and challenge
  const verifier = crypto.randomBytes(32).toString('base64url');
  const state = crypto.randomBytes(16).toString('hex');
  
  etsyAuthState.verifier = verifier;
  etsyAuthState.state = state;

  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  
  // Scopes for reading and writing listings/shops
  const scopes = 'listings_r listings_w shops_r shops_w';
  const redirectUri = \`http://\${req.get('host')}/api/etsy/callback\`;
  
  const authUrl = \`https://www.etsy.com/oauth/connect?response_type=code&redirect_uri=\${encodeURIComponent(redirectUri)}&scope=\${encodeURIComponent(scopes)}&client_id=\${encodeURIComponent(clientId)}&state=\${state}&code_challenge=\${challenge}&code_challenge_method=S256\`;
  
  res.redirect(authUrl);
});

app.get('/api/etsy/callback', async (req, res) => {
  const { code, state, error } = req.query;
  
  if (error) {
    return res.status(400).send(\`Etsy authorization error: \${error}\`);
  }
  
  if (state !== etsyAuthState.state) {
    return res.status(400).send('Invalid state parameter.');
  }
  
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const clientId = config.etsy;
  const redirectUri = \`http://\${req.get('host')}/api/etsy/callback\`;

  try {
    const response = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code: code,
        code_verifier: etsyAuthState.verifier
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }
    
    // Save tokens
    config.etsyAccessToken = data.access_token;
    config.etsyRefreshToken = data.refresh_token;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    
    res.send('<div style="font-family: monospace; color: #10b981; background: #020617; padding: 20px; height: 100vh;">[Commerce Captain] Etsy OAuth Authorized. Access and Refresh tokens secured in the Armory. You may close this window.</div>');
  } catch (err) {
    res.status(500).send(\`Failed to exchange token: \${err.message}\`);
  }
});

// Serve frontend static files
`;

code = code.replace('// Serve frontend static files', newRoutes);
fs.writeFileSync('server/index.js', code);
console.log('Backend auth routes added.');
