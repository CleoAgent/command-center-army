#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// POD Worker - Prepares Printful-ready mockups and product data
const pipelinePath = path.join(__dirname, '../catalog/product_pipeline.json');
const mockupDir = path.join(__dirname, '../../mockups');

if (!fs.existsSync(mockupDir)) fs.mkdirSync(mockupDir, { recursive: true });

const pipeline = JSON.parse(fs.readFileSync(pipelinePath, 'utf8'));
const ready = pipeline.filter(p => p.status === 'design_ready');

console.log(`[POD Worker] Preparing ${ready.length} products for Printful...`);

ready.forEach(product => {
  const printfulData = {
    sync_product: {
      name: product.title,
      thumbnail: `https://placeholder.com/mockup_${product.id}.jpg`
    },
    sync_variants: [{
      variant_id: 4012, // Example: 11oz mug
      retail_price: calculatePrice(product.estimated_margin),
      files: [{
        url: `file://${product.designPromptFile}`,
        placement: 'default'
      }]
    }]
  };
  
  const mockupFile = path.join(mockupDir, `${product.id}_printful.json`);
  fs.writeFileSync(mockupFile, JSON.stringify(printfulData, null, 2));
  
  product.status = 'pod_ready';
  product.printfulFile = mockupFile;
  
  console.log(`[POD Worker] Prepared ${product.id} for Printful sync`);
});

fs.writeFileSync(pipelinePath, JSON.stringify(pipeline, null, 2));

function calculatePrice(marginStr) {
  const margin = parseInt(marginStr) || 40;
  const baseCost = 8.50; // Example Printful base
  return (baseCost / (1 - margin/100)).toFixed(2);
}

console.log(`[POD Worker] ${ready.length} products staged for Printful upload.`);
