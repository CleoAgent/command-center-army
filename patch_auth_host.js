const fs = require('fs');

let serverCode = fs.readFileSync('server/index.js', 'utf8');

const oldCallback = `  const redirectUri = \`http://\${req.get('host')}/api/etsy/callback\`;`;
const newCallback = `  let host = req.get('host');
  // Etsy usually defaults to localhost or 127.0.0.1 callbacks for new apps before they are approved
  if (host.includes('10.0.10.20') || host.includes('cleoagent.hoskins.fun')) {
    host = 'localhost:5173'; 
  }
  const redirectUri = \`http://\${host}/api/etsy/callback\`;`;

// Replace both instances of the redirectUri construction
serverCode = serverCode.split(oldCallback).join(newCallback);

fs.writeFileSync('server/index.js', serverCode);

console.log('App patched.');