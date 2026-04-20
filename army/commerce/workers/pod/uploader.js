const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Decoupled POD Worker - Generates Mockups via Printful API (Does NOT create products)
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
const ready = pipeline.filter(p => p.status === 'design_ready' && p.designImagePath).slice(0, 2);

console.log(`[POD Worker] Processing ${ready.length} products for Mockup Generation...`);

async function generateMockups(product) {
  const imagePath = product.designImagePath;
  
  if (!imagePath || !fs.existsSync(imagePath)) {
    console.log(`[POD Worker] No image file for ${product.id}, skipping.`);
    return false;
  }
  
  try {
    // Make the image accessible via URL for Printful
    const imageFileName = path.basename(imagePath);
    const publicUrl = `https://cleoagent.hoskins.fun/exports/images/${imageFileName}`;
    
    console.log(`[POD Worker] Requesting Mockups for ${product.id} using image URL: ${publicUrl}`);
    
    // Product ID 71 is a Gildan 64000. Variant 4011 is Black Large.
    const mockupPayload = {
      variant_ids: [4011],
      format: "jpg",
      files: [
        {
          placement: "front",
          image_url: publicUrl,
          position: {
            area_width: 1800,
            area_height: 2400,
            width: 1800,
            height: 1800,
            top: 300,
            left: 0
          }
        }
      ]
    };
    
    const storeId = JSON.parse(fs.readFileSync(credsPath, 'utf8')).printfulStoreId || '';
    const mockupRes = await fetch(`https://api.printful.com/mockup-generator/create-task/71${storeId ? '?store_id=' + storeId : ''}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${printfulToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mockupPayload)
    });
    
    const mockupData = await mockupRes.json();
    
    if (!mockupRes.ok || !mockupData.result) {
      console.error(`[POD Worker] Mockup generation failed for ${product.id}:`, mockupData);
      return false;
    }
    
    const taskKey = mockupData.result.task_key;
    console.log(`[POD Worker] Mockup task created for ${product.id}. Task Key: ${taskKey}. Waiting for completion...`);
    
    // Poll for task completion
    let taskCompleted = false;
    let mockupResultData = null;
    let attempts = 0;
    
    while (!taskCompleted && attempts < 30) {
      attempts++;
      console.log(`[POD Worker] Polling mockup task ${taskKey} (Attempt ${attempts})...`);
      
      // Wait 10 seconds between polls
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      const pollRes = await fetch(`https://api.printful.com/mockup-generator/task?task_key=${taskKey}`, {
        headers: { 'Authorization': `Bearer ${printfulToken}` }
      });
      const pollData = await pollRes.json();
      
      if (pollData.result.status === 'completed') {
        taskCompleted = true;
        mockupResultData = pollData.result;
      } else if (pollData.result.status === 'failed') {
        console.error(`[POD Worker] Mockup task failed for ${product.id}:`, pollData);
        return false;
      }
    }
    
    if (!taskCompleted) {
      console.error(`[POD Worker] Mockup task timed out for ${product.id}`);
      return false;
    }
    
    console.log(`[POD Worker] Mockups generated successfully for ${product.id}`);
    
    // Save mockup data locally
    const productData = {
      sku: product.id,
      print_url: publicUrl,
      printful_variant_id: 71,
      mockups: mockupResultData.mockups
    };
    
    const mockupFile = path.join(mockupDir, `${product.id}_mockups.json`);
    fs.writeFileSync(mockupFile, JSON.stringify(productData, null, 2));
    
    // Download the primary mockup image to serve locally
    if (productData.mockups && productData.mockups.length > 0 && productData.mockups[0].mockup_url) {
      const primaryMockupUrl = productData.mockups[0].mockup_url;
      const localMockupPath = path.join(mockupDir, `${product.id}_mockup_main.jpg`);
      
      console.log(`[POD Worker] Downloading primary mockup...`);
      execSync(`curl -s "${primaryMockupUrl}" -o "${localMockupPath}"`);
      product.mockupImagePath = `/exports/mockups/${product.id}_mockup_main.jpg`;
    }
    
    return true;
  } catch (err) {
    console.error(`[POD Worker] Error processing ${product.id}:`, err.message);
    return false;
  }
}

(async () => {
  let successCount = 0;
  
  for (const product of ready) {
    const success = await generateMockups(product);
    if (success) {
      product.status = 'mockup_ready';
      successCount++;
    }
  }
  
  fs.writeFileSync(pipelinePath, JSON.stringify(pipeline, null, 2));
  console.log(`[POD Worker] ${successCount}/${ready.length} mockups generated.`);
})();
