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
        if (!status) setLoading(true)
        
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
        <span className="chip">OPENCLAW v{status?.openclawVersion?.split(' ')[0] || '—'}</span>
        <span className="chip">GATEWAY {status?.gatewayPid ? 'ACTIVE' : '—'}</span>
        <span className="chip">MISSIONS {activeMissions}</span>
        <span className="chip">ARMY 6 CAPTAINS / 18 WORKERS</span>
      </div>
    </header>
  )
}

function ArmyView({ army }) {
  if (!army?.captains) return <div className="empty-state">Army structure loading...</div>
  
  return (
    <Section title="ARMY ORGANIZATION" subtitle="6 Captains commanding 18 Workers across 6 divisions" icon={Users}>
      <div className="army-grid">
        {army.captains.map(captain => (
          <div key={captain.id} className="captain-card">
            <div className="captain-header">
              <h3>{captain.name}</h3>
              <span className="worker-count">{captain.workers.length} WORKERS</span>
            </div>
            <div className="captain-soul">{captain.soul}</div>
            <div className="worker-list">
              {captain.workers.map(worker => (
                <span key={worker} className="worker-badge">{worker}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

function IntegrationsView() {
  const [keys, setKeys] = useState({
    anthropic: '',
    openai: '',
    etsy: '',
    printful: '',
    fiverr: ''
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
        
        <div className="form-group">
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
  const { status, army, loading, error } = useLiveData()

  return (
    <div className="shell scanlines">
      <PhaserBg />
      <Header status={status} />

      <nav className="nav-tabs">
        <button 
          className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={18} /> COMMAND
        </button>
        <button 
          className={`tab ${activeTab === 'army' ? 'active' : ''}`}
          onClick={() => setActiveTab('army')}
        >
          <Users size={18} /> ARMY
        </button>
        <button 
          className={`tab ${activeTab === 'integrations' ? 'active' : ''}`}
          onClick={() => setActiveTab('integrations')}
        >
          <Shield size={18} /> ARMORY
        </button>
      </nav>

      {activeTab === 'dashboard' && (
        <DashboardView status={status} army={army} error={error} loading={loading} />
      )}
      {activeTab === 'army' && <ArmyView army={army} />}
      {activeTab === 'integrations' && <IntegrationsView />}
    </div>
  )
}
