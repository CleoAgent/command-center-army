#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// POD Worker - Uploads to Printful using Private Token
const pipelinePath = path.join(__dirname, '../catalog/product_pipeline.json');
const mockupDir = path.join(__dirname, '../../mockups');
const credsPath = path.join(__dirname, '../../../../integrations.json');

if (!fs.existsSync(mockupDir)) fs.mkdirSync(mockupDir, { recursive: true });

// Load credentials
let printfulToken = '';
try {
  const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
  printfulToken = creds.printful || '';
} catch (e) {
  console.error('[POD Worker] Failed to load credentials:', e.message);
}

if (!printfulToken) {
  console.log('[POD Worker] Printful token not configured. Standing by.');
  process.exit(0);
}

const pipeline = JSON.parse(fs.readFileSync(pipelinePath, 'utf8'));
const ready = pipeline.filter(p => p.status === 'design_ready').slice(0, 2); // Limit to 2 per run

console.log(`[POD Worker] Processing ${ready.length} products for Printful...`);

async function uploadToPrintful(product) {
  const imagePath = product.designImagePath;
  
  if (!imagePath || !fs.existsSync(imagePath)) {
    console.log(`[POD Worker] No image file for ${product.id}, skipping.`);
    return false;
  }
  
  try {
    // Step 1: Upload the image file to Printful
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    const uploadRes = await fetch('https://api.printful.com/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${printfulToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filename: `${product.id}_design.png`,
        file: base64Image
      })
    });
    
    const uploadData = await uploadRes.json();
    
    if (!uploadRes.ok) {
      console.error(`[POD Worker] Printful upload failed for ${product.id}:`, uploadData);
      return false;
    }
    
    const fileId = uploadData.result.id;
    console.log(`[POD Worker] Uploaded image for ${product.id}, file ID: ${fileId}`);
    
    // Step 2: Create a sync product in Printful
    // Using a generic poster/print variant - you can customize this based on your product_type
    const syncProduct = {
      sync_product: {
        name: product.title,
        thumbnail: uploadData.result.url
      },
      sync_variants: [{
        variant_id: 1, // Generic poster
        retail_price: '25.00',
        files: [{
          url: uploadData.result.url
        }]
      }]
    };
    
    const productRes = await fetch('https://api.printful.com/store/products', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${printfulToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(syncProduct)
    });
    
    const productData = await productRes.json();
    
    if (!productRes.ok) {
      console.error(`[POD Worker] Printful product creation failed for ${product.id}:`, productData);
      return false;
    }
    
    console.log(`[POD Worker] Created Printful product for ${product.id}: ID ${productData.result.sync_product.id}`);
    
    // Save the Printful product data
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