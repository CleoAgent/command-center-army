const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Design Worker - Generates actual images using Google Gemini API
const inputPath = path.join(__dirname, '../catalog/product_pipeline.json');
const outputDir = path.join(__dirname, '../../designs');
const credsPath = path.join(__dirname, '../../../../integrations.json');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Load credentials
let geminiKey = '';
try {
  const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
  geminiKey = creds.googleGemini || '';
} catch (e) {
  console.error('[Design Worker] Failed to load credentials:', e.message);
}

if (!geminiKey) {
  console.log('[Design Worker] Google Gemini key not configured. Falling back to prompt generation only.');
  process.exit(0);
}

const pipeline = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const pending = pipeline.filter(p => p.status === 'staged_for_generation').slice(0, 2); // Limit to 2 per run to avoid rate limits

console.log(`[Design Worker] Processing ${pending.length} products with Gemini...`);

async function generateImage(product) {
  const prompt = `Product photography of ${product.title}. ${product.niche} aesthetic. Professional e-commerce style, clean background, high quality, 4K resolution.`;
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseModalities: ['Text', 'Image']
        }
      })
    });
    
    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const parts = data.candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
          const imagePath = path.join(outputDir, `${product.id}_design.png`);
          fs.writeFileSync(imagePath, imageBuffer);
          console.log(`[Design Worker] Generated image for ${product.id}`);
          return imagePath;
        }
      }
    }
    
    console.log(`[Design Worker] No image in Gemini response for ${product.id}:`, JSON.stringify(data).slice(0, 200));
    return null;
  } catch (err) {
    console.error(`[Design Worker] Gemini API error for ${product.id}:`, err.message);
    return null;
  }
}

(async () => {
  for (const product of pending) {
    const imagePath = await generateImage(product);
    
    if (imagePath) {
      product.status = 'design_ready';
      product.designImagePath = imagePath;
      product.designGeneratedAt = new Date().toISOString();
    } else {
      // Fallback to prompt file
      const promptFile = path.join(outputDir, `${product.id}_prompt.txt`);
      fs.writeFileSync(promptFile, `Generate a high-quality product design for: ${product.title}`);
      product.status = 'design_ready';
      product.designPromptFile = promptFile;
      product.designGeneratedAt = new Date().toISOString();
    }
  }
  
  fs.writeFileSync(inputPath, JSON.stringify(pipeline, null, 2));
  console.log(`[Design Worker] Completed. ${pending.length} products processed.`);
})();
