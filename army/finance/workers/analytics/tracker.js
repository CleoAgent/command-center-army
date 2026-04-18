// Finance Captain - Revenue Tracking Worker
const fs = require('fs');
const path = require('path');

const workspace = '/home/node/.openclaw/workspace';
const statePath = path.join(workspace, 'command-center/server/data/army_state.json');
const physicalPath = path.join(workspace, 'command-center/army/commerce/workers/catalog/product_pipeline.json');
const digitalPath = path.join(workspace, 'command-center/army/commerce/workers/digital/digital_pipeline.json');

function updateMetrics() {
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  
  // Physical POD
  let podCount = 0;
  let podMargin = 40;
  if (fs.existsSync(physicalPath)) {
    const pipeline = JSON.parse(fs.readFileSync(physicalPath, 'utf8'));
    podCount = pipeline.filter(p => p.status === 'pod_ready').length;
    podMargin = pipeline.reduce((acc, p) => acc + (parseInt(p.estimated_margin) || 40), 0) / (pipeline.length || 1);
  }
  
  // Digital
  let digitalCount = 0;
  if (fs.existsSync(digitalPath)) {
    const pipeline = JSON.parse(fs.readFileSync(digitalPath, 'utf8'));
    digitalCount = pipeline.filter(p => p.status === 'staged_for_generation').length;
  }
  
  const totalStaged = podCount + digitalCount;
  const podRevenue = Math.floor(podCount * 15 * (podMargin/100) * 30);
  const digitalRevenue = Math.floor(digitalCount * 8.99 * 30); // Pure profit
  
  state.pipelines.commerce.productsStaged = totalStaged;
  state.pipelines.commerce.projectedMonthly = podRevenue + digitalRevenue;
  state.generatedAt = new Date().toISOString();
  
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  
  console.log(`[Finance Worker] Tracked ${totalStaged} products ready/staged for sale.`);
  console.log(`[Finance Worker] Projected monthly: $${state.pipelines.commerce.projectedMonthly}`);
}

updateMetrics();
