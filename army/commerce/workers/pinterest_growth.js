const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Pinterest Growth Worker - Drives traffic to storefronts
const pipelinePath = path.join(__dirname, '../catalog/product_pipeline.json');
const mockupDir = path.join(__dirname, '../../mockups');
const credsPath = path.join(__dirname, '../../../integrations.json');

// Load credentials
let config = {};
try {
  config = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
} catch (e) {
  console.error('[Pinterest Growth] Failed to load credentials:', e.message);
  process.exit(1);
}

if (!config.pinterestToken) {
  console.log('[Pinterest Growth] Pinterest token not configured. Standing by.');
  process.exit(0);
}

const pipeline = JSON.parse(fs.readFileSync(pipelinePath, 'utf8'));
const ready = pipeline.filter(p => p.status === 'published' && !p.pinterestPinned).slice(0, 5);

console.log(`[Pinterest Growth] Processing ${ready.length} products for Pinterest...`);

async function createPin(product) {
  try {
    console.log(`[Pinterest Growth] Creating pin for ${product.id}...`);
    
    // Get image URL
    let imageUrl = null;
    if (product.mockupImagePath) {
      imageUrl = `https://cleoagent.hoskins.fun${product.mockupImagePath}`;
    } else {
      const mockupDataPath = path.join(mockupDir, `${product.id}_mockups.json`);
      if (fs.existsSync(mockupDataPath)) {
        const mockupData = JSON.parse(fs.readFileSync(mockupDataPath, 'utf8'));
        if (mockupData.mockups && mockupData.mockups.length > 0) {
          imageUrl = mockupData.mockups[0].mockup_url;
        }
      }
    }
    
    if (!imageUrl) {
      imageUrl = `https://cleoagent.hoskins.fun/exports/images/${product.id}_design.png`;
    }
    
    const title = product.title.substring(0, 100);
    const description = `${product.description || product.title} | ${product.niche} aesthetic. Shop now!`;
    
    // Create the pin via Pinterest API v5
    const pinPayload = {
      title: title,
      description: description,
      link: product.shopifyUrl || product.etsyListingUrl || 'https://cleoagent.hoskins.fun',
      media_source: {
        source_type: "image_url",
        url: imageUrl
      }
    };
    
    const res = await fetch('https://api.pinterest.com/v5/pins', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.pinterestToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pinPayload)
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      console.error(`[Pinterest Growth] Failed to create pin for ${product.id}:`, data);
      return false;
    }
    
    console.log(`[Pinterest Growth] Created pin for ${product.id}: ${data.id}`);
    
    product.pinterestPinned = true;
    product.pinterestPinId = data.id;
    
    return true;
    
  } catch (err) {
    console.error(`[Pinterest Growth] Error processing ${product.id}:`, err.message);
    return false;
  }
}

(async () => {
  let successCount = 0;
  
  for (const product of ready) {
    const success = await createPin(product);
    if (success) successCount++;
  }
  
  fs.writeFileSync(pipelinePath, JSON.stringify(pipeline, null, 2));
  console.log(`[Pinterest Growth] ${successCount}/${ready.length} pins created on Pinterest.`);
})();
