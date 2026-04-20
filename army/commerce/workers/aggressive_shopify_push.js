const fs = require('fs');
const path = require('path');

const pipelinePath = path.join(__dirname, 'catalog/product_pipeline.json');
const credsPath = path.join(__dirname, '../../../integrations.json');

// Load credentials
let config = {};
try {
  config = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
} catch (e) {
  console.error('Failed to load credentials:', e.message);
  process.exit(1);
}

if (!config.shopifyToken || !config.shopifyUrl) {
  console.error('Shopify credentials missing. Cannot push.');
  process.exit(1);
}

const pipeline = JSON.parse(fs.readFileSync(pipelinePath, 'utf8'));

// Find all products that have an image but aren't published
const ready = pipeline.filter(p => p.status !== 'published' && p.status !== 'shopify_published' && p.designImagePath && fs.existsSync(p.designImagePath));

console.log(`Found ${ready.length} products ready to push to Shopify immediately.`);

async function publishToShopify(product) {
  try {
    const imageFileName = path.basename(product.designImagePath);
    const imageUrl = `https://cleoagent.hoskins.fun/exports/images/${imageFileName}`;
    
    // 1. Create Product
    const productPayload = {
      product: {
        title: product.title.substring(0, 255),
        body_html: product.description || `<p>${product.niche} aesthetic. High quality print-on-demand.</p>`,
        vendor: "CleoAgent Store",
        product_type: "T-Shirt",
        tags: (product.tags || product.niche || "graphic tee,streetwear").split(',').map(t => t.trim()),
        status: "active",
        handle: product.id.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Math.floor(Math.random() * 10000),
        variants: [
          {
            option1: "Default Title",
            price: product.price || "25.00",
            sku: product.id,
            inventory_quantity: 999,
            inventory_management: null,
            fulfillment_service: "manual"
          }
        ],
        images: [
          {
            src: imageUrl
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
      console.error(`Failed to create product for ${product.id}:`, data.errors);
      return false;
    }
    
    const productId = data.product.id;
    console.log(`Successfully published ${product.id} -> Shopify ID: ${productId}`);
    
    // Update product status
    product.status = 'published';
    product.shopifyProductId = productId;
    product.shopifyUrl = `https://${config.shopifyUrl}/products/${data.product.handle}`;
    product.publishedAt = new Date().toISOString();
    
    return true;
    
  } catch (err) {
    console.error(`Error processing ${product.id}:`, err.message);
    return false;
  }
}

(async () => {
  let successCount = 0;
  
  for (const product of ready) {
    const success = await publishToShopify(product);
    if (success) {
        successCount++;
        // Save incrementally so we don't lose progress
        fs.writeFileSync(pipelinePath, JSON.stringify(pipeline, null, 2));
    }
    // Small delay to avoid hitting Shopify API limits
    await new Promise(resolve => setTimeout(resolve, 600));
  }
  
  console.log(`\nDONE. Successfully pushed ${successCount} products to Shopify.`);
})();
