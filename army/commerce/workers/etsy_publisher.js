const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const pipelinePath = path.join(__dirname, 'catalog/product_pipeline.json');
const credsPath = path.join(__dirname, '../../../integrations.json');

// Load credentials
let config = {};
try {
  config = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
} catch (e) {
  console.error('[Etsy Publisher] Failed to load credentials:', e.message);
  process.exit(1);
}

if (!config.etsyAccessToken || !config.etsy) {
  console.log('[Etsy Publisher] Etsy tokens not configured. Standing by.');
  process.exit(0);
}

async function refreshEtsyToken() {
  console.log('[Etsy Publisher] Refreshing Etsy access token...');
  const response = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.etsy,
      refresh_token: config.etsyRefreshToken
    })
  });
  
  const data = await response.json();
  if (response.ok) {
    config.etsyAccessToken = data.access_token;
    config.etsyRefreshToken = data.refresh_token;
    fs.writeFileSync(credsPath, JSON.stringify(config, null, 2));
    console.log('[Etsy Publisher] Token refreshed successfully.');
    return true;
  }
  console.error('[Etsy Publisher] Failed to refresh token:', data);
  return false;
}

// Ensure we don't spam Etsy. Limit to 1 product per run, and we'll run this via cron every 4-8 hours randomly.
const pipeline = JSON.parse(fs.readFileSync(pipelinePath, 'utf8'));
const ready = pipeline.filter(p => p.status === 'mockup_ready').slice(0, 1);

if (ready.length === 0) {
  console.log('[Etsy Publisher] No products ready to publish.');
  process.exit(0);
}

async function getShopId() {
  const res = await fetch(`https://api.etsy.com/v3/application/users/me`, {
    headers: {
      'x-api-key': config.etsy,
      'Authorization': `Bearer ${config.etsyAccessToken}`
    }
  });
  
  if (res.status === 401) {
    if (await refreshEtsyToken()) {
      return getShopId();
    }
    throw new Error("Unauthorized and failed to refresh token.");
  }
  
  const data = await res.json();
  if (data.shop_id) return data.shop_id;
  
  const shopsRes = await fetch(`https://api.etsy.com/v3/application/users/${data.user_id}/shops`, {
    headers: {
      'x-api-key': config.etsy,
      'Authorization': `Bearer ${config.etsyAccessToken}`
    }
  });
  const shopsData = await shopsRes.json();
  return shopsData.shop_id;
}

async function publishProduct(product, shopId) {
  try {
    console.log(`[Etsy Publisher] Publishing ${product.id} to Etsy...`);
    
    // 1. Create draft listing
    const listingPayload = {
      title: product.title.substring(0, 140),
      description: product.description || `High quality graphic tee. ${product.niche} aesthetic.`,
      price: product.price || 25.00,
      quantity: 999,
      who_made: 'i_did',
      when_made: 'made_to_order',
      taxonomy_id: 1121, // Men's T-shirts
      state: 'draft',
      is_customizable: false,
      is_personalizable: false,
      is_supply: false,
      shipping_profile_id: 1, // Requires a default shipping profile ID
      tags: (product.tags || product.niche).split(',').map(t => t.trim()).slice(0, 13)
    };

    const res = await fetch(`https://api.etsy.com/v3/application/shops/${shopId}/listings`, {
      method: 'POST',
      headers: {
        'x-api-key': config.etsy,
        'Authorization': `Bearer ${config.etsyAccessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(listingPayload)
    });

    const data = await res.json();
    
    if (res.status === 401) {
      if (await refreshEtsyToken()) return publishProduct(product, shopId);
      throw new Error("Unauthorized");
    }

    if (!res.ok) {
      console.error(`[Etsy Publisher] Failed to create listing for ${product.id}:`, data);
      return false;
    }

    const listingId = data.listing_id;
    console.log(`[Etsy Publisher] Created draft listing ${listingId}`);

    // 2. Upload mockups
    const mockupDir = path.join(__dirname, '../../mockups');
    const mockupDataPath = path.join(mockupDir, `${product.id}_mockups.json`);
    
    if (fs.existsSync(mockupDataPath)) {
      const mockupData = JSON.parse(fs.readFileSync(mockupDataPath, 'utf8'));
      if (mockupData.mockups && mockupData.mockups.length > 0) {
        for (const mockup of mockupData.mockups) {
          if (!mockup.mockup_url) continue;
          
          console.log(`[Etsy Publisher] Uploading mockup to listing ${listingId}...`);
          
          // Download mockup temp
          const tempImg = `/tmp/etsy_mockup_${product.id}.jpg`;
          execSync(`curl -s "${mockup.mockup_url}" -o "${tempImg}"`);
          
          // Using curl to upload multipart form data because Node.js fetch multipart is tricky
          const curlCmd = `curl -s -X POST "https://api.etsy.com/v3/application/shops/${shopId}/listings/${listingId}/images" \
            -H "x-api-key: ${config.etsy}" \
            -H "Authorization: Bearer ${config.etsyAccessToken}" \
            -F "image=@${tempImg}"`;
          
          execSync(curlCmd);
          fs.unlinkSync(tempImg);
        }
      }
    }

    // 3. Update inventory SKU mapping (Crucial for fulfillment)
    const inventoryPayload = {
      products: [
        {
          sku: product.id,
          property_values: [],
          offerings: [
            {
              price: product.price || 25.00,
              quantity: 999,
              is_enabled: true
            }
          ]
        }
      ]
    };
    
    await fetch(`https://api.etsy.com/v3/application/listings/${listingId}/inventory`, {
      method: 'PUT',
      headers: {
        'x-api-key': config.etsy,
        'Authorization': `Bearer ${config.etsyAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(inventoryPayload)
    });

    console.log(`[Etsy Publisher] Successfully published ${product.id}`);
    
    // Save to DB
    product.status = 'published';
    product.etsyListingId = listingId;
    product.publishedAt = new Date().toISOString();
    
    return true;

  } catch (err) {
    console.error(`[Etsy Publisher] Error processing ${product.id}:`, err.message);
    return false;
  }
}

(async () => {
  try {
    const shopId = await getShopId();
    console.log(`[Etsy Publisher] Connected to Etsy Shop ID: ${shopId}`);
    
    for (const product of ready) {
      await publishProduct(product, shopId);
    }
    
    fs.writeFileSync(pipelinePath, JSON.stringify(pipeline, null, 2));
    
  } catch (err) {
    console.error('[Etsy Publisher] Fatal error:', err.message);
  }
})();
