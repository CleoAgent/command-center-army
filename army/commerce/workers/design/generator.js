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
const pending = pipeline.filter(p => p.status === 'staged_for_generation').slice(0, 10); // Limit to 10 per run

console.log(`[Design Worker] Processing ${pending.length} products with Gemini...`);

async function generateImage(product) {
  const prompt = `Vector art graphic for t-shirt of ${product.title}. ${product.niche} aesthetic. FLAT solid color background (preferably pure white or pure black), clear edges, high contrast, perfect for apparel printing. NO mockup backgrounds, just the standalone graphic art.`;
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${geminiKey}`, {
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
          const rawImagePath = path.join(outputDir, `${product.id}_raw.png`);
          const finalImagePath = path.join(outputDir, `${product.id}_design.png`);
          
          // Save raw image
          fs.writeFileSync(rawImagePath, imageBuffer);
          console.log(`[Design Worker] Generated raw image for ${product.id}`);
          
          // Use rembg (python venv) to remove background
          try {
            console.log(`[Design Worker] Removing background for ${product.id}...`);
            execSync(`/tmp/rembg_venv/bin/rembg i "${rawImagePath}" "${finalImagePath}"`, { stdio: 'pipe' });
            console.log(`[Design Worker] Background removed for ${product.id}`);
            // Optional: cleanup raw image
            // fs.unlinkSync(rawImagePath);
            return finalImagePath;
          } catch (bgErr) {
            console.error(`[Design Worker] Background removal failed, using raw image:`, bgErr.message);
            fs.copyFileSync(rawImagePath, finalImagePath);
            return finalImagePath;
          }
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
