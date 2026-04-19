import { useEffect, useMemo, useState } from 'react'
import { Settings, LayoutDashboard, CheckCircle2, Activity, Server, Shield, Users, Target, Zap } from 'lucide-react'
import PhaserBg from './PhaserBg'
import './App.css'
import './military.css'

// Real data from backend - no static fallbacks
function useLiveData() {
  const [status, setStatus] = useState(null)
  const [army, setArmy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    
    const load = async () => {
      try {
        const [statusRes, armyRes] = await Promise.all([
          fetch('/api/status'),
          fetch('/api/army')
        ])
        
        if (!statusRes.ok || !armyRes.ok) throw new Error('API error')
        
        const [statusData, armyData] = await Promise.all([
          statusRes.json(),
          armyRes.json()
        ])
        
        if (!mounted) return
        setStatus(statusData)
        setArmy(armyData)
        setError(null)
      } catch (err) {
        if (!mounted) return
        setError(err.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    const interval = setInterval(load, 5000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  return { status, army, loading, error }
}

function Stat({ label, value, tone = 'default', icon: Icon }) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-label">{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
        {Icon && <Icon size={18} style={{ opacity: 0.7 }} />}
        <div className="stat-value">{value}</div>
      </div>
    </div>
  )
}

function Section({ title, subtitle, children, icon: Icon }) {
  return (
    <section className="section-panel">
      <div className="section-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {Icon && <Icon size={20} style={{ color: 'var(--accent-cyan)' }} />}
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="section-subtitle">{subtitle}</p>}
          </div>
        </div>
      </div>
      {children}
    </section>
  )
}

function Header({ status }) {
  const isConnected = !!status
  const activeMissions = status?.army?.activeMissions || 0
  
  return (
    <header className="hero">
      <div className="hero-header">
        <div>
          <p className="eyebrow">SUPREME COMMANDER</p>
          <h1>TACTICAL COMMAND CENTER</h1>
          <p className="subtitle">
            Multi-agent military orchestration. Live CLEO + OpenClaw integration.
          </p>
        </div>
        <div className={`status-indicator ${isConnected ? '' : 'error'}`}>
          {isConnected ? '● ONLINE' : '● OFFLINE'}
        </div>
      </div>
      
      <div className="hero-chips">
        <span className="chip">OPENCLAW {status?.openclawVersion || '—'}</span>
        <span className="chip">CLEO {status?.cleoVersion || '—'}</span>
        <span className="chip">GATEWAY {status?.gatewayPid ? 'ACTIVE' : '—'}</span>
        <span className="chip">MISSIONS {activeMissions}</span>
        <span className="chip">ARMY 6 CAPTAINS / 18 OFFICERS</span>
      </div>
    </header>
  )
}

function ArmyView({ army, onSelectCaptain }) {
  if (!army?.captains) return <div className="empty-state">ARMY STRUCTURE LOADING...</div>
  
  const totalDrones = army.captains.reduce((acc, c) => acc + c.workers.length, 0);

  return (
    <Section title="ARMY ORGANIZATION" subtitle={`${army.captains.length} CAPTAINS COMMANDING ${totalDrones} OFFICERS & DRONES`} icon={Users}>
      <div className="army-grid">
        {army.captains.map(captain => (
          <div key={captain.id} className="captain-card clickable" onClick={() => onSelectCaptain(captain)}>
            <div className="captain-header">
              <h3>{captain.name.toUpperCase()}</h3>
              <span className="worker-count">{captain.workers.length} OFFICERS/DRONES</span>
            </div>
            <div className="captain-soul">{captain.soul.substring(0, 120)}...</div>
            <div className="worker-list">
              {captain.workers.map(worker => (
                <span key={worker} className="worker-badge">{worker}</span>
              ))}
            </div>
            <div style={{marginTop: '15px', color: 'var(--accent-cyan)', fontSize: '0.8rem', textAlign: 'right', fontWeight: 'bold'}}>
              [ ACCESS TACTICAL VIEW &gt; ]
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

function DepartmentView({ captain, tasks, onBack }) {
  const deptTasks = tasks.filter(t => t.title.toLowerCase().includes(captain.id.toLowerCase()) || (t.parentId && t.title.includes(captain.name.split(' ')[0])));
  
  return (
    <div className="department-view">
      <button className="save-btn" style={{marginBottom: '20px', width: 'auto'}} onClick={onBack}>
        &lt; RETURN TO FLEET OVERVIEW
      </button>
      
      <Section title={`${captain.name.toUpperCase()} COMMAND`} icon={Users}>
        <div className="captain-card" style={{marginBottom: '20px', border: '1px solid #f59e0b', boxShadow: '0 0 15px rgba(245, 158, 11, 0.2) inset'}}>
          <div className="captain-header">
            <h3 style={{color: '#f59e0b', textShadow: '0 0 10px rgba(245, 158, 11, 0.5)'}}>CAPTAIN'S DIRECTIVE</h3>
          </div>
          <div className="captain-soul" style={{whiteSpace: 'pre-wrap', color: '#cffafe'}}>{captain.soul}</div>
        </div>

        <h3 style={{marginBottom: '10px', color: '#67e8f9'}}>ASSIGNED OFFICERS & DRONES</h3>
        <div className="worker-list" style={{marginBottom: '20px'}}>
          {captain.workers.length > 0 ? captain.workers.map(worker => (
            <span key={worker} className="worker-badge" style={{padding: '8px 16px', fontSize: '0.9rem'}}>{worker.toUpperCase()}</span>
          )) : <span className="empty-state">NO OFFICERS ASSIGNED</span>}
        </div>
      </Section>

      <Section title="ACTIVE CLEO MISSIONS" subtitle={`Tasks assigned to ${captain.name}`} icon={Target}>
        {deptTasks.length > 0 ? (
          <div className="queue-grid">
            {deptTasks.map(item => <QueueCard key={item.id} item={item} />)}
          </div>
        ) : (
          <div className="empty-state">NO ACTIVE MISSIONS FOR THIS DEPARTMENT.</div>
        )}
      </Section>
    </div>
  )
}

function IntegrationsView() {
  const [keys, setKeys] = useState({
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
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/integrations')
      .then(r => r.json())
      .then(data => {
        setKeys(prev => ({ ...prev, ...data }))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    await fetch('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(keys)
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="empty-state">Loading integrations...</div>

  return (
    <Section 
      title="API CREDENTIALS VAULT" 
      subtitle="Enter credentials to activate autonomous business pipelines"
      icon={Shield}
    >
      <div className="form-grid">
        <div className="form-group">
          <label>ANTHROPIC API KEY (OPUS 4.7 PLANNING)</label>
          <input 
            type="password" 
            value={keys.anthropic} 
            onChange={e => setKeys({...keys, anthropic: e.target.value})}
            placeholder="sk-ant-api03-..."
          />
        </div>
        
        <div className="form-group">
          <label>OPENAI API KEY (GPT-5 / CODEX EXECUTION)</label>
          <input 
            type="password" 
            value={keys.openai} 
            onChange={e => setKeys({...keys, openai: e.target.value})}
            placeholder="sk-proj-..."
          />
        </div>
        
        <div className="form-group" style={{borderLeft: '2px solid var(--accent-cyan)', paddingLeft: '10px'}}>
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
        </div>
        
        <div className="form-group">
          <label>FIVERR API (SERVICES PIPELINE)</label>
          <input 
            type="password" 
            value={keys.fiverr} 
            onChange={e => setKeys({...keys, fiverr: e.target.value})}
            placeholder="Vendor API key..."
          />
        </div>

        <div className="form-group">
          <label>SIGNALDOCK AGENT ID (COMMS OFFICER)</label>
          <input 
            type="text" 
            value={keys.signalDockAgentId} 
            onChange={e => setKeys({...keys, signalDockAgentId: e.target.value})}
            placeholder="e.g. cleoagent"
          />
        </div>

        <div className="form-group">
          <label>SIGNALDOCK API KEY (COMMS OFFICER)</label>
          <input 
            type="password" 
            value={keys.signalDockApiKey} 
            onChange={e => setKeys({...keys, signalDockApiKey: e.target.value})}
            placeholder="sk_live_..."
          />
        </div>
        
        <button className="save-btn" onClick={handleSave}>
          {saved ? <><CheckCircle2 size={18}/> CREDENTIALS SECURED</> : 'ARM SYSTEMS'}
        </button>
      </div>
    </Section>
  )
}

function QueueCard({ item }) {
  const getPriorityClass = (p) => {
    if (p === 'critical') return 'priority-critical'
    if (p === 'high') return 'priority-high'
    return 'priority-normal'
  }
  
  return (
    <div className={`queue-card ${getPriorityClass(item.priority)}`}>
      <div className="queue-top">
        <strong className="task-id">{item.id}</strong>
        <span className={`pill ${item.type}`}>{item.type}</span>
      </div>
      <h3>{item.title}</h3>
      <div className="queue-meta">
        <span className={`status-badge ${item.status}`}>{item.status}</span>
        <span className="priority-badge">{item.priority}</span>
        {item.parentId && <span className="parent-badge">⊂ {item.parentId}</span>}
      </div>
    </div>
  )
}

function DashboardView({ status, army, error, loading }) {
  const tasks = status?.cleoTasks || []
  
  const metrics = useMemo(() => ({
    captains: army?.captains?.length || 6,
    workers: army?.captains?.reduce((acc, c) => acc + c.workers.length, 0) || 18,
    activeTasks: tasks.length,
    criticalMissions: tasks.filter(t => t.priority === 'critical' && t.status === 'pending').length,
    runtimeHealth: status ? 'OPERATIONAL' : error ? 'DEGRADED' : 'CONNECTING',
    projectedRevenue: '$0'
  }), [tasks, status, error, army])

  if (loading) return <div className="empty-state">INITIALIZING TACTICAL SYSTEMS...</div>
  if (error) return <div className="empty-state" style={{color: '#ef4444'}}>SYSTEM ERROR: {error}</div>

  return (
    <>
      <div className="stats-grid">
        <Stat label="CAPTAINS" value={metrics.captains} icon={Users} />
        <Stat label="WORKERS" value={metrics.workers} icon={Activity} />
        <Stat label="TOTAL TASKS" value={metrics.activeTasks} tone="accent" icon={Target} />
        <Stat label="CRITICAL OPS" value={metrics.criticalMissions} tone="critical" icon={Zap} />
        <Stat label="RUNTIME STATUS" value={metrics.runtimeHealth} tone="success" />
        <Stat label="REVENUE" value={metrics.projectedRevenue} />
      </div>

      <div className="overview-grid">
        <Section title="SYSTEM STATUS" subtitle="OpenClaw gateway and CLEO bridge telemetry" icon={Server}>
          <div className="runtime-grid">
            <div className="runtime-box">
              <span className="runtime-label">GATEWAY PID</span>
              <strong>{status?.gatewayPid || 'NOT CONNECTED'}</strong>
            </div>
            <div className="runtime-box">
              <span className="runtime-label">TELEGRAM CHANNEL</span>
              <strong>{status?.telegramState || 'UNKNOWN'}</strong>
            </div>
            <div className="runtime-box">
              <span className="runtime-label">LAST SYNC</span>
              <strong>{status?.generatedAt ? new Date(status.generatedAt).toLocaleTimeString() : 'NEVER'}</strong>
            </div>
          </div>
        </Section>

        <Section title="BUSINESS PIPELINES" subtitle="Awaiting API credentials for activation" icon={Activity}>
          <div className="pipeline-grid">
            <div className="pipeline-card locked">
              <div className="pipeline-top">
                <h3>ETSY + PRINTFUL</h3>
                <span className="phase">LOCKED</span>
              </div>
              <div className="revenue">$0</div>
              <p>Automated POD storefront. Provide credentials to arm.</p>
            </div>
            <div className="pipeline-card locked">
              <div className="pipeline-top">
                <h3>FIVERR SERVICES</h3>
                <span className="phase">LOCKED</span>
              </div>
              <div className="revenue">$0</div>
              <p>Automated service delivery. Provide credentials to arm.</p>
            </div>
          </div>
        </Section>
      </div>

      <Section title="CLEO OPERATIONS QUEUE" subtitle="Live mission feed from CLEO Core API" icon={Target}>
        {tasks.length > 0 ? (
          <div className="queue-grid">
            {tasks.map(item => <QueueCard key={item.id} item={item} />)}
          </div>
        ) : (
          <div className="empty-state">NO ACTIVE OPERATIONS. ARMY STANDING BY.</div>
        )}
      </Section>
    </>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedCaptain, setSelectedCaptain] = useState(null)
  const { status, army, loading, error } = useLiveData()
  
  // Handle tab switches and clear selected captain
  const handleTabSwitch = (tab) => {
    setActiveTab(tab)
    setSelectedCaptain(null)
  }


  return (
    <div className="shell scanlines">
      <PhaserBg />
      <Header status={status} />

      <nav className="nav-tabs">
        <button 
          className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleTabSwitch('dashboard')}
        >
          <LayoutDashboard size={18} /> COMMAND
        </button>
        <button 
          className={`tab ${activeTab === 'army' ? 'active' : ''}`}
          onClick={() => handleTabSwitch('army')}
        >
          <Users size={18} /> ARMY
        </button>
        <button 
          className={`tab ${activeTab === 'integrations' ? 'active' : ''}`}
          onClick={() => handleTabSwitch('integrations')}
        >
          <Shield size={18} /> ARMORY
        </button>
      </nav>

      {activeTab === 'dashboard' && (
        <DashboardView status={status} army={army} error={error} loading={loading} />
      )}
      {activeTab === 'army' && !selectedCaptain && <ArmyView army={army} onSelectCaptain={setSelectedCaptain} />}
      {activeTab === 'army' && selectedCaptain && (
        <DepartmentView 
          captain={selectedCaptain} 
          tasks={status?.cleoTasks || []} 
          onBack={() => setSelectedCaptain(null)} 
        />
      )}
      {activeTab === 'integrations' && <IntegrationsView />}
    </div>
  )
}
