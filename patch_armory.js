const fs = require('fs');

let serverCode = fs.readFileSync('server/index.js', 'utf8');
if (!serverCode.includes('googleGemini')) {
  serverCode = serverCode.replace(
    /signalDockApiKey: ''\n  }, null, 2\)\);/,
    `signalDockApiKey: '',
    etsySharedSecret: '',
    etsyRefreshToken: '',
    etsyAccessToken: '',
    googleGemini: '',
    elevenlabs: '',
    sunoProxyKey: '',
    sunoBaseUrl: ''
  }, null, 2));`
  );
  fs.writeFileSync('server/index.js', serverCode);
  console.log('Backend config patched.');
}

let appCode = fs.readFileSync('app/src/App.jsx', 'utf8');

const oldIntegrationsState = `  const [keys, setKeys] = useState({
    anthropic: '',
    openai: '',
    etsy: '',
    printful: '',
    fiverr: '',
    signalDockAgentId: '',
    signalDockApiKey: ''
  })`;

const newIntegrationsState = `  const [keys, setKeys] = useState({
    anthropic: '',
    openai: '',
    etsy: '',
    etsySharedSecret: '',
    printful: '',
    fiverr: '',
    googleGemini: '',
    elevenlabs: '',
    sunoProxyKey: '',
    sunoBaseUrl: '',
    signalDockAgentId: '',
    signalDockApiKey: ''
  })`;

appCode = appCode.replace(oldIntegrationsState, newIntegrationsState);

const oldInputs = `        <div className="form-group">
          <label>ETSY API KEY (COMMERCE PIPELINE)</label>
          <input 
            type="password" 
            value={keys.etsy} 
            onChange={e => setKeys({...keys, etsy: e.target.value})}
            placeholder="Etsy keystring..."
          />
        </div>
        
        <div className="form-group">
          <label>PRINTFUL API TOKEN (POD FULFILLMENT)</label>
          <input 
            type="password" 
            value={keys.printful} 
            onChange={e => setKeys({...keys, printful: e.target.value})}
            placeholder="Bearer ..."
          />
        </div>`;

const newInputs = `        <div className="form-group" style={{borderLeft: '2px solid var(--accent-cyan)', paddingLeft: '10px'}}>
          <label>ETSY KEYSTRING (OAUTH 2.0 PKCE CLIENT ID)</label>
          <input 
            type="password" 
            value={keys.etsy} 
            onChange={e => setKeys({...keys, etsy: e.target.value})}
            placeholder="7ccfvy9..."
          />
          <div style={{marginTop: '10px'}}>
            <label>ETSY SHARED SECRET</label>
            <input 
              type="password" 
              value={keys.etsySharedSecret} 
              onChange={e => setKeys({...keys, etsySharedSecret: e.target.value})}
              placeholder="43nrx..."
            />
          </div>
          <div style={{marginTop: '10px'}}>
            <button className="save-btn" onClick={() => window.open('/api/etsy/auth', '_blank')} style={{background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b', color: '#fcd34d'}}>
              AUTHORIZE ETSY (OAUTH PKCE)
            </button>
          </div>
        </div>
        
        <div className="form-group">
          <label>PRINTFUL PRIVATE TOKEN (POD FULFILLMENT)</label>
          <input 
            type="password" 
            value={keys.printful} 
            onChange={e => setKeys({...keys, printful: e.target.value})}
            placeholder="Private token..."
          />
        </div>

        <div className="form-group" style={{borderLeft: '2px solid #10b981', paddingLeft: '10px', marginTop: '10px'}}>
          <label>GOOGLE GEMINI API KEY (gemini-3.1-flash-image / Nano Banana 2)</label>
          <input 
            type="password" 
            value={keys.googleGemini} 
            onChange={e => setKeys({...keys, googleGemini: e.target.value})}
            placeholder="AIzaSy..."
          />
        </div>

        <div className="form-group" style={{borderLeft: '2px solid #f59e0b', paddingLeft: '10px', marginTop: '10px'}}>
          <label>ELEVENLABS API KEY (VOICE / TTS)</label>
          <input 
            type="password" 
            value={keys.elevenlabs} 
            onChange={e => setKeys({...keys, elevenlabs: e.target.value})}
            placeholder="sk_..."
          />
        </div>

        <div className="form-group" style={{borderLeft: '2px solid #8b5cf6', paddingLeft: '10px', marginTop: '10px'}}>
          <label>SUNO PROXY API KEY (MUSIC / AUDIO)</label>
          <input 
            type="password" 
            value={keys.sunoProxyKey} 
            onChange={e => setKeys({...keys, sunoProxyKey: e.target.value})}
            placeholder="Proxy Key..."
          />
          <div style={{marginTop: '10px'}}>
            <label>SUNO PROXY BASE URL</label>
            <input 
              type="text" 
              value={keys.sunoBaseUrl} 
              onChange={e => setKeys({...keys, sunoBaseUrl: e.target.value})}
              placeholder="https://api.example-proxy.com"
            />
          </div>
        </div>`;

appCode = appCode.replace(oldInputs, newInputs);
fs.writeFileSync('app/src/App.jsx', appCode);

console.log('App patched.');