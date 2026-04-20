const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// POD Worker - Uploads to Printful using Private Token
const pipelinePath = path.join(__dirname, '../catalog/product_pipeline.json');
const mockupDir = path.join(__dirname, '../../mockups');
const credsPath = path.join(__dirname, '../../../../integrations.json');

if (!fs.existsSync(mockupDir)) fs.mkdirSync(mockupDir, { recursive: true });

// Load credentials
let printfulToken = '';
let storeId = '';
try {
  const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
  printfulToken = creds.printful || '';
  storeId = creds.printfulStoreId || '';
} catch (e) {
  console.error('[POD Worker] Failed to load credentials:', e.message);
}

if (!printfulToken) {
  console.log('[POD Worker] Printful token not configured. Standing by.');
  process.exit(0);
}

async function getStoreId() {
  if (storeId) return storeId;
  try {
    const res = await fetch('https://api.printful.com/stores', {
      headers: { 'Authorization': `Bearer ${printfulToken}` }
    });
    const data = await res.json();
    if (data.result && data.result.length > 0) {
      storeId = data.result[0].id;
      console.log(`[POD Worker] Using Printful store ID: ${storeId}`);
      return storeId;
    }
  } catch (err) {
    console.error('[POD Worker] Failed to get store ID:', err.message);
  }
  return null;
}

const pipeline = JSON.parse(fs.readFileSync(pipelinePath, 'utf8'));
const ready = pipeline.filter(p => p.status === 'design_ready' && p.designImagePath).slice(0, 2);

console.log(`[POD Worker] Processing ${ready.length} products for Printful...`);

async function uploadToPrintful(product) {
  const imagePath = product.designImagePath;
  const currentStoreId = await getStoreId();
  
  if (!currentStoreId) {
    console.log('[POD Worker] No Printful store ID available. Skipping.');
    return false;
  }
  
  if (!imagePath || !fs.existsSync(imagePath)) {
    console.log(`[POD Worker] No image file for ${product.id}, skipping.`);
    return false;
  }
  
  try {
    // Step 1: Upload the image file to Printful by URL
    // First, we need to make the image accessible via URL
    const imageFileName = path.basename(imagePath);
    const publicUrl = `https://cleoagent.hoskins.fun/exports/images/${imageFileName}`;
    
    console.log(`[POD Worker] Registering image URL for ${product.id}: ${publicUrl}`);
    
    const uploadRes = await fetch('https://api.printful.com/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${printfulToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: publicUrl,
        filename: imageFileName
      })
    });
    
    const uploadData = await uploadRes.json();
    
    if (!uploadRes.ok || !uploadData.result) {
      console.error(`[POD Worker] Printful upload failed for ${product.id}:`, uploadData);
      return false;
    }
    
    const fileId = uploadData.result.id;
    const fileUrl = uploadData.result.url;
    console.log(`[POD Worker] Registered image for ${product.id}, file ID: ${fileId}`);
    
    // Step 2: Create a sync product in Printful
    const syncProduct = {
      sync_product: {
        name: product.title,
        thumbnail: fileUrl
      },
      sync_variants: [{
        variant_id: 1,
        retail_price: '25.00',
        files: [{
          type: 'default',
          url: fileUrl
        }]
      }]
    };
    
    const productRes = await fetch(`https://api.printful.com/store/products?store_id=${currentStoreId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${printfulToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(syncProduct)
    });
    
    const productData = await productRes.json();
    
    console.log(`[POD Worker] Printful product creation response:`, JSON.stringify(productData, null, 2).slice(0, 500));
    
    if (!productRes.ok || !productData.result) {
      console.error(`[POD Worker] Printful product creation failed for ${product.id}:`, productData);
      return false;
    }
    
    console.log(`[POD Worker] Created Printful product for ${product.id}: ID ${productData.result.id}`);
    
    const mockupFile = path.join(mockupDir, `${product.id}_printful.json`);
    fs.writeFileSync(mockupFile, JSON.stringify(productData.result, null, 2));
    
    return true;
  } catch (err) {
    console.error(`[POD Worker] Error processing ${product.id}:`, err.message);
    return false;
  }
}

(async () => {
  let successCount = 0;
  
  for (const product of ready) {
    const success = await uploadToPrintful(product);
    if (success) {
      product.status = 'pod_ready';
      product.printfulSynced = new Date().toISOString();
      successCount++;
    }
  }
  
  fs.writeFileSync(pipelinePath, JSON.stringify(pipeline, null, 2));
  console.log(`[POD Worker] ${successCount}/${ready.length} products synced to Printful.`);
})();
