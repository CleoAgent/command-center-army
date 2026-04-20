const fs = require('fs');
const path = require('path');

// Etsy CSV Export Worker - Generates Etsy-compatible CSV for bulk upload
const pipelinePath = path.join(__dirname, '../catalog/product_pipeline.json');
const exportDir = path.join(__dirname, '../../exports');
const designsDir = path.join(__dirname, '../../designs');

if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

const pipeline = JSON.parse(fs.readFileSync(pipelinePath, 'utf8'));
// Get products that have designs (either generated images or prompt files)
const ready = pipeline.filter(p => 
  p.status === 'design_ready' || p.status === 'pod_ready'
).slice(0, 50); // Export 50 at a time

console.log(`[Etsy CSV Worker] Exporting ${ready.length} products to Etsy CSV...`);

// Etsy CSV Header
const header = [
  'TITLE',
  'DESCRIPTION',
  'TYPE',
  'STATUS',
  'PRICE',
  'QUANTITY',
  'TAGS',
  'MATERIALS',
  'IMAGE1',
  'IMAGE2',
  'IMAGE3',
  'IMAGE4',
  'IMAGE5',
  'VARIATION1 TYPE',
  'VARIATION1 VALUE',
  'VARIATION1 PRICE',
  'VARIATION1 QUANTITY'
].join(',');

const rows = [header];

ready.forEach(product => {
  const title = product.title.replace(/"/g, '""');
  const description = (product.description || product.title).replace(/"/g, '""');
  const tags = (product.tags || product.keywords || 'digital art,print,wall decor').replace(/"/g, '""');
  
  // Use the generated image if available, otherwise use a placeholder
  let imagePath = '';
  if (product.designImagePath && fs.existsSync(product.designImagePath)) {
    imagePath = product.designImagePath;
  }
  
  const row = [
    `"${title}"`,
    `"${description}"`,
    '"physical"',
    '"active"',
    product.price || '25.00',
    '999',
    `"${tags}"`,
    '"print on demand"',
    imagePath ? `"${imagePath}"` : '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  ].join(',');
  
  rows.push(row);
});

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const csvPath = path.join(exportDir, `etsy_export_${timestamp}.csv`);
fs.writeFileSync(csvPath, rows.join('\n'));

console.log(`[Etsy CSV Worker] Exported ${ready.length} products to: ${csvPath}`);
console.log(`[Etsy CSV Worker] Next steps:`);
console.log(`  1. Go to Etsy Seller Dashboard → Listings → Add Listings`);
console.log(`  2. Click "Upload a CSV file"`);
console.log(`  3. Select: ${csvPath}`);
console.log(`  4. Map the columns and publish`);
