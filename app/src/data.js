export const captains = [
  {
    id: 'platform',
    name: 'Platform Captain',
    mission: 'Infrastructure, automations, integrations, uptime',
    status: 'active',
    workers: ['Automation Worker', 'Runtime Worker', 'Observability Worker'],
  },
  {
    id: 'commerce',
    name: 'Commerce Captain',
    mission: 'Storefronts, products, print-on-demand, pricing',
    status: 'planning',
    workers: ['Catalog Worker', 'POD Worker', 'Pricing Worker'],
  },
  {
    id: 'services',
    name: 'Services Captain',
    mission: 'Service offers, intake, delivery pipelines',
    status: 'planning',
    workers: ['Offer Worker', 'Delivery Worker', 'QA Worker'],
  },
  {
    id: 'content',
    name: 'Content Captain',
    mission: 'Content systems, asset generation, publishing',
    status: 'planning',
    workers: ['Channel Worker', 'Asset Worker', 'Repurpose Worker'],
  },
  {
    id: 'growth',
    name: 'Growth Captain',
    mission: 'Acquisition, experiments, lead-gen, outreach',
    status: 'planning',
    workers: ['SEO Worker', 'Outreach Worker', 'Experiment Worker'],
  },
  {
    id: 'finance',
    name: 'Finance Captain',
    mission: 'Profit tracking, KPI reporting, cost control',
    status: 'planning',
    workers: ['Forecast Worker', 'Analytics Worker', 'Reporting Worker'],
  },
]

export const initiatives = [
  { id: 'T001', title: 'OpenClaw-CLEO bridge', owner: 'Platform Captain', status: 'pending', type: 'epic' },
  { id: 'T002', title: 'Create persistent daemon mode', owner: 'Platform Captain', status: 'pending', type: 'task' },
  { id: 'T003', title: 'Build CLEO task query -> OpenClaw dispatch', owner: 'Platform Captain', status: 'pending', type: 'task' },
  { id: 'T004', title: 'Implement OpenClaw result -> CLEO update', owner: 'Platform Captain', status: 'pending', type: 'task' },
  { id: 'T005', title: 'Map CLEO task states to OpenClaw lifecycle', owner: 'Platform Captain', status: 'pending', type: 'task' },
]

export const pipelines = [
  { id: 'etsy', name: 'Etsy / POD Pipeline', phase: 'design', revenue: '$0', note: 'Needs marketplace + POD integrations' },
  { id: 'services', name: 'Automated Services Pipeline', phase: 'design', revenue: '$0', note: 'Needs productized offers and fulfillment automation' },
  { id: 'content', name: 'Content Engine', phase: 'design', revenue: '$0', note: 'Needs channel ops + asset generation loop' },
]

export const metrics = {
  captains: 6,
  workers: 18,
  activeInitiatives: 5,
  runtimeHealth: 'healthy',
  gatewayVersion: '2026.4.15',
  projectedRevenue: '$0',
}
