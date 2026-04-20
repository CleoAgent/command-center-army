const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Shopify Publisher Worker
const pipelinePath = path.join(__dirname, '../catalog/product_pipeline.json');
const mockupDir = path.join(__dirname, '../../mockups');
const credsPath = path.join(__dirname, '../../../integrations.json');

// Load credentials
let config = {};
try {
  config = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
} catch (e) {
  console.error('[Shopify Publisher] Failed to load credentials:', e.message);
  process.exit(1);
}

if (!config.shopifyToken || !config.shopifyUrl) {
  console.log('[Shopify Publisher] Shopify credentials not configured. Standing by.');
  process.exit(0);
}

const pipeline = JSON.parse(fs.readFileSync(pipelinePath, 'utf8'));
const ready = pipeline.filter(p => p.status === 'mockup_ready').slice(0, 5); // Push up to 5 per run

console.log(`[Shopify Publisher] Processing ${ready.length} products for Shopify...`);

async function publishToShopify(product) {
  try {
    console.log(`[Shopify Publisher] Publishing ${product.id} to Shopify...`);
    
    // Get mockup data
    const mockupDataPath = path.join(mockupDir, `${product.id}_mockups.json`);
    let mockupUrl = null;
    if (fs.existsSync(mockupDataPath)) {
      const mockupData = JSON.parse(fs.readFileSync(mockupDataPath, 'utf8'));
      if (mockupData.mockups && mockupData.mockups.length > 0) {
        mockupUrl = mockupData.mockups[0].mockup_url;
      }
    }
    
    // Fallback to design image if no mockup
    const imageUrl = mockupUrl || `https://cleoagent.hoskins.fun/exports/images/${product.id}_design.png`;
    
    // 1. Create Product
    const productPayload = {
      product: {
        title: product.title.substring(0, 255),
        body_html: product.description || `<p>${product.niche} aesthetic. High quality print-on-demand.</p>`,
        vendor: "CleoAgent Store",
        product_type: "T-Shirt",
        tags: (product.tags || product.niche || "graphic tee,streetwear").split(',').map(t => t.trim()),
        variants: [
          {
            option1: "Default Title",
            price: product.price || "25.00",
            sku: product.id,
            inventory_quantity: 999,
            inventory_management: null, // Printful handles inventory
            fulfillment_service: "manual"
          }
        ],
        options: [
          {
            name: "Title",
            values: ["Default Title"]
          }
        ]
      }
    };
    
    const shopifyUrl = `https://${config.shopifyUrl}/admin/api/2024-01/products.json`;
    
    const res = await fetch(shopifyUrl, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': config.shopifyToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(productPayload)
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      console.error(`[Shopify Publisher] Failed to create product for ${product.id}:`, data.errors);
      return false;
    }
    
    const productId = data.product.id;
    console.log(`[Shopify Publisher] Created Shopify product ${productId}`);
    
    // 2. Upload Image
    if (imageUrl) {
      console.log(`[Shopify Publisher] Uploading image...`);
      
      const imagePayload = {
        image: {
          src: imageUrl
        }
      };
      
      const imgRes = await fetch(`https://${config.shopifyUrl}/admin/api/2024-01/products/${productId}/images.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': config.shopifyToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(imagePayload)
      });
      
      if (!imgRes.ok) {
        console.error(`[Shopify Publisher] Image upload failed:`, await imgRes.json());
      }
    }
    
    // Update product status
    product.status = 'published';
    product.shopifyProductId = productId;
    product.shopifyUrl = `https://${config.shopifyUrl}/products/${data.product.handle}`;
    product.publishedAt = new Date().toISOString();
    
    return true;
    
  } catch (err) {
    console.error(`[Shopify Publisher] Error processing ${product.id}:`, err.message);
    return false;
  }
}

(async () => {
  let successCount = 0;
  
  for (const product of ready) {
    const success = await publishToShopify(product);
    if (success) successCount++;
  }
  
  fs.writeFileSync(pipelinePath, JSON.stringify(pipeline, null, 2));
  console.log(`[Shopify Publisher] ${successCount}/${ready.length} products published to Shopify.`);
})();
