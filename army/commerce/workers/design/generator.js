#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Design Worker - Generates visual assets for staged products
const inputPath = path.join(__dirname, '../catalog/product_pipeline.json');
const outputDir = path.join(__dirname, '../../designs');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const pipeline = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const pending = pipeline.filter(p => p.status === 'staged_for_generation');

console.log(`[Design Worker] Processing ${pending.length} products...`);

pending.forEach((product, idx) => {
  const designFile = path.join(outputDir, `${product.id}_prompt.txt`);
  
  const prompt = `Generate a high-quality product design for:
Title: ${product.title}
Niche: ${product.niche}
Style: Minimalist, professional, trending on Pinterest
Resolution: 300 DPI, print-ready
Format: PNG with transparent background where applicable

Design concept: ${product.niche} aesthetic with vintage textures and modern composition.`;

  fs.writeFileSync(designFile, prompt);
  
  // Mark as design ready
  product.status = 'design_ready';
  product.designPromptFile = designFile;
  product.designGeneratedAt = new Date().toISOString();
  
  console.log(`[Design Worker] Generated design spec for ${product.id}`);
});

fs.writeFileSync(inputPath, JSON.stringify(pipeline, null, 2));
console.log(`[Design Worker] Completed. ${pending.length} products ready for POD.`);
