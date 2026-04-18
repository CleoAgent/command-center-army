const fs = require('fs');

let content = fs.readFileSync('app/src/App.jsx', 'utf-8');

// Replace ArmyView with clickable version
const oldArmyView = `function ArmyView({ army }) {
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
}`;

const newArmyView = `function ArmyView({ army, onSelectCaptain }) {
  if (!army?.captains) return <div className="empty-state">ARMY STRUCTURE LOADING...</div>
  
  const totalDrones = army.captains.reduce((acc, c) => acc + c.workers.length, 0);

  return (
    <Section title="ARMY ORGANIZATION" subtitle={\`\${army.captains.length} CAPTAINS COMMANDING \${totalDrones} OFFICERS & DRONES\`} icon={Users}>
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
      
      <Section title={\`\${captain.name.toUpperCase()} COMMAND\`} icon={Users}>
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

      <Section title="ACTIVE CLEO MISSIONS" subtitle={\`Tasks assigned to \${captain.name}\`} icon={Target}>
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
}`;

content = content.replace(oldArmyView, newArmyView);

const oldApp = `export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const { status, army, loading, error } = useLiveData()`;

const newApp = `export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedCaptain, setSelectedCaptain] = useState(null)
  const { status, army, loading, error } = useLiveData()
  
  // Handle tab switches and clear selected captain
  const handleTabSwitch = (tab) => {
    setActiveTab(tab)
    setSelectedCaptain(null)
  }
`;

content = content.replace(oldApp, newApp);

const oldNav = `      <nav className="nav-tabs">
        <button 
          className={\`tab \${activeTab === 'dashboard' ? 'active' : ''}\`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={18} /> COMMAND
        </button>
        <button 
          className={\`tab \${activeTab === 'army' ? 'active' : ''}\`}
          onClick={() => setActiveTab('army')}
        >
          <Users size={18} /> ARMY
        </button>
        <button 
          className={\`tab \${activeTab === 'integrations' ? 'active' : ''}\`}
          onClick={() => setActiveTab('integrations')}
        >
          <Shield size={18} /> ARMORY
        </button>
      </nav>`;

const newNav = `      <nav className="nav-tabs">
        <button 
          className={\`tab \${activeTab === 'dashboard' ? 'active' : ''}\`}
          onClick={() => handleTabSwitch('dashboard')}
        >
          <LayoutDashboard size={18} /> COMMAND
        </button>
        <button 
          className={\`tab \${activeTab === 'army' ? 'active' : ''}\`}
          onClick={() => handleTabSwitch('army')}
        >
          <Users size={18} /> ARMY
        </button>
        <button 
          className={\`tab \${activeTab === 'integrations' ? 'active' : ''}\`}
          onClick={() => handleTabSwitch('integrations')}
        >
          <Shield size={18} /> ARMORY
        </button>
      </nav>`;

content = content.replace(oldNav, newNav);

const oldTabs = `      {activeTab === 'dashboard' && (
        <DashboardView status={status} army={army} error={error} loading={loading} />
      )}
      {activeTab === 'army' && <ArmyView army={army} />}
      {activeTab === 'integrations' && <IntegrationsView />}`;

const newTabs = `      {activeTab === 'dashboard' && (
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
      {activeTab === 'integrations' && <IntegrationsView />}`;

content = content.replace(oldTabs, newTabs);

fs.writeFileSync('app/src/App.jsx', content);
console.log('App patched.');
