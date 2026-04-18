#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Growth Worker - SEO Content Generator
const outputDir = path.join(__dirname, '../../content');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const niches = [
  'dark academia room decor',
  'cyberpunk desk setup accessories',
  'stoic philosophy gifts',
  'minimalist wall art trends 2026',
  'aesthetic room transformation'
];

const articles = niches.map((niche, idx) => ({
  id: `article_${Date.now()}_${idx}`,
  keyword: niche,
  title: `The Ultimate Guide to ${niche.charAt(0).toUpperCase() + niche.slice(1)}`,
  outline: [
    `Introduction to ${niche}`,
    `Top 10 products for ${niche}`,
    `How to style ${niche} in your space`,
    `Where to buy ${niche} items`,
    `Conclusion and CTA`
  ],
  wordCount: 1500,
  status: 'outlined',
  createdAt: new Date().toISOString()
}));

const contentManifest = path.join(outputDir, 'content_manifest.json');
fs.writeFileSync(contentManifest, JSON.stringify(articles, null, 2));

console.log(`[Growth Worker] Generated ${articles.length} article outlines.`);
console.log(`[Growth Worker] Ready for AI content generation.`);
