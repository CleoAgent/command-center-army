const fs = require('fs');
const path = require('path');

// Store Sync Worker - Tracks products across Printful stores
const credsPath = path.join(__dirname, '../../../../integrations.json');
const pipelinePath = path.join(__dirname, '../catalog/product_pipeline.json');

let printfulToken = '';
try {
  const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
  printfulToken = creds.printful || '';
} catch (e) {
  console.error('[Sync Worker] Failed to load credentials:', e.message);
}

if (!printfulToken) {
  console.log('[Sync Worker] Printful token not configured. Standing by.');
  process.exit(0);
}

async function syncStores() {
  console.log('[Sync Worker] Checking store sync status...');
  
  // Get both stores
  const storesRes = await fetch('https://api.printful.com/stores', {
    headers: { 'Authorization': `Bearer ${printfulToken}` }
  });
  const storesData = await storesRes.json();
  
  if (!storesData.result || storesData.result.length < 2) {
    console.log('[Sync Worker] Need both stores connected. Found:', storesData.result?.length || 0);
    return;
  }
  
  const apiStore = storesData.result.find(s => s.type === 'native');
  const etsyStore = storesData.result.find(s => s.type === 'etsy');
  
  console.log(`[Sync Worker] API Store: ${apiStore?.name} (${apiStore?.id})`);
  console.log(`[Sync Worker] Etsy Store: ${etsyStore?.name} (${etsyStore?.id})`);
  
  // List products from API store
  const productsRes = await fetch(`https://api.printful.com/store/products?store_id=${apiStore.id}`, {
    headers: { 'Authorization': `Bearer ${printfulToken}` }
  });
  const productsData = await productsRes.json();
  
  if (productsData.result) {
    console.log(`[Sync Worker] Products in API store: ${productsData.result.length}`);
    productsData.result.forEach(p => {
      console.log(`  - ${p.name} (ID: ${p.id}) - Synced: ${p.synced}`);
    });
  }
  
  // Update pipeline with sync status
  if (fs.existsSync(pipelinePath)) {
    const pipeline = JSON.parse(fs.readFileSync(pipelinePath, 'utf8'));
    let updated = 0;
    
    if (productsData.result) {
      productsData.result.forEach(printfulProduct => {
        const match = pipeline.find(p => 
          p.title === printfulProduct.name || 
          printfulProduct.name.includes(p.title.substring(0, 30))
        );
        if (match) {
          match.printfulId = printfulProduct.id;
          match.printfulStoreId = apiStore.id;
          match.printfulSynced = printfulProduct.synced > 0;
          match.printfulStoreName = apiStore.name;
          updated++;
        }
      });
    }
    
    fs.writeFileSync(pipelinePath, JSON.stringify(pipeline, null, 2));
    console.log(`[Sync Worker] Updated ${updated} products with Printful sync status`);
  }
}

syncStores().catch(err => console.error('[Sync Worker] Error:', err.message));
