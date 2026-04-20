#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Complete Product Export - Generates a ready-to-upload package
const pipelinePath = path.join(__dirname, '../catalog/product_pipeline.json');
const exportDir = path.join(__dirname, '../../exports');
const designsDir = path.join(__dirname, '../../designs');

if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

const pipeline = JSON.parse(fs.readFileSync(pipelinePath, 'utf8'));
const ready = pipeline.filter(p => p.designImagePath).slice(0, 50);

console.log(`[Export Worker] Packaging ${ready.length} products for manual upload...`);

// Create export package directory
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const packageDir = path.join(exportDir, `product_package_${timestamp}`);
fs.mkdirSync(packageDir, { recursive: true });
fs.mkdirSync(path.join(packageDir, 'images'), { recursive: true });

// Generate product data JSON
const products = ready.map(product => {
  const productData = {
    id: product.id,
    title: product.title,
    description: product.description || product.title,
    price: product.price || '25.00',
    tags: product.tags || product.keywords || 'digital art, print on demand, wall decor',
    niche: product.niche,
    status: product.status
  };
  
  // Copy image if available
  if (product.designImagePath && fs.existsSync(product.designImagePath)) {
    const imageName = `${product.id}_design.png`;
    const destPath = path.join(packageDir, 'images', imageName);
    fs.copyFileSync(product.designImagePath, destPath);
    productData.imageFile = imageName;
  }
  
  return productData;
});

// Save product data
fs.writeFileSync(
  path.join(packageDir, 'products.json'),
  JSON.stringify(products, null, 2)
);

// Generate Etsy CSV
const csvHeader = [
  'TITLE', 'DESCRIPTION', 'TYPE', 'STATUS', 'PRICE', 'QUANTITY',
  'TAGS', 'MATERIALS', 'IMAGE1'
].join(',');

const csvRows = [csvHeader];
products.forEach(p => {
  const row = [
    `"${p.title.replace(/"/g, '""')}"`,
    `"${p.description.replace(/"/g, '""')}"`,
    '"physical"',
    '"active"',
    p.price,
    '999',
    `"${p.tags}"`,
    '"print on demand"',
    p.imageFile ? `"images/${p.imageFile}"` : ''
  ].join(',');
  csvRows.push(row);
});

fs.writeFileSync(
  path.join(packageDir, 'etsy_listings.csv'),
  csvRows.join('\n')
);

// Generate Printful-compatible CSV
const printfulHeader = [
  'Product name', 'Variant', 'File URL', 'Retail price'
].join(',');

const printfulRows = [printfulHeader];
products.forEach(p => {
  if (p.imageFile) {
    const row = [
      `"${p.title.replace(/"/g, '""')}"`,
      '"Poster 18x24"',
      `"images/${p.imageFile}"`,
      p.price
    ].join(',');
    printfulRows.push(row);
  }
});

fs.writeFileSync(
  path.join(packageDir, 'printful_products.csv'),
  printfulRows.join('\n')
);

// Create README
const readme = `# Product Export Package - ${timestamp}

## Contents
- **products.json** - Complete product data with titles, descriptions, prices, tags
- **etsy_listings.csv** - Ready to import into Etsy Seller Dashboard
- **printful_products.csv** - Ready to import into Printful Product Push
- **images/** - Generated product design images

## How to Upload

### Option 1: Etsy Direct CSV Upload
1. Go to https://www.etsy.com/your/shops/me/listings
2. Click "Add a listing" → "Upload a CSV file"
3. Select 

etsy_listings.csv
4. Map columns and publish

### Option 2: Printful Product Push
1. Go to https://www.printful.com/dashboard/product-push
2. Click "Upload products via CSV"
3. Select 

printful_products.csv
4. Choose product type (Poster, T-Shirt, etc.)
5. Push to your Etsy store

### Option 3: Manual Creation
Use the images in the images/ folder and the product data in products.json to manually create listings.

## Product Count: ${products.length}
## Generated: ${new Date().toISOString()}
`;

fs.writeFileSync(path.join(packageDir, 'README.txt'), readme);

// Create zip archive
try {
  const zipPath = `${packageDir}.zip`;
  execSync(`cd "${exportDir}" && zip -r "product_package_${timestamp}.zip" "product_package_${timestamp}"`, {
    timeout: 30000
  });
  console.log(`[Export Worker] Created zip: ${zipPath}`);
} catch (e) {
  console.log(`[Export Worker] Zip creation failed (install zip if needed): ${e.message}`);
}

console.log(`[Export Worker] Export complete!`);
console.log(`[Export Worker] Package location: ${packageDir}`);
console.log(`[Export Worker] Products exported: ${products.length}`);
console.log(`[Export Worker] Images included: ${products.filter(p => p.imageFile).length}`);
