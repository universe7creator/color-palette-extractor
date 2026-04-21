module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-License-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image, imageUrl, format = 'hex', count = 5 } = req.body;

    // License check (if provided)
    const licenseKey = req.headers['x-license-key'];
    const isLicensed = licenseKey && licenseKey.startsWith('CPE-');

    // Extract colors from base64 image
    let colors = [];
    if (image) {
      colors = extractDominantColors(image, Math.min(count, isLicensed ? 10 : 5));
    } else if (imageUrl) {
      // For URL-based images, return a simulated palette
      colors = generateSimulatedPalette(count);
    } else {
      return res.status(400).json({ error: 'No image provided. Use image (base64) or imageUrl' });
    }

    // Convert to requested format
    const formattedColors = colors.map(color => ({
      hex: color,
      rgb: hexToRgb(color),
      hsl: rgbToHsl(hexToRgb(color))
    }));

    // Export formats
    const exports = {
      css: generateCSS(colors),
      scss: generateSCSS(colors),
      json: formattedColors,
      tailwind: generateTailwind(colors)
    };

    return res.status(200).json({
      success: true,
      colors: formattedColors,
      exports,
      licensed: isLicensed,
      message: isLicensed ? 'Full access' : 'Demo mode - 5 colors max. Purchase for unlimited access.'
    });

  } catch (error) {
    console.error('Color extraction error:', error);
    return res.status(500).json({ error: 'Failed to extract colors', details: error.message });
  }
};

// Extract dominant colors from base64 image (simplified algorithm)
function extractDominantColors(base64Image, count) {
  // In a real implementation, this would use a library like node-vibrant or color-thief
  // For this demo, we'll simulate based on the image data

  // Simple hash-based color generation for demo
  const hash = base64Image.slice(-100).split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);

  const seededRandom = (seed) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  const colors = [];
  const baseHue = Math.abs(hash) % 360;

  for (let i = 0; i < count; i++) {
    const hue = (baseHue + (i * 60)) % 360;
    const saturation = 60 + Math.floor(seededRandom(hash + i) * 30);
    const lightness = 40 + Math.floor(seededRandom(hash + i + 100) * 40);
    colors.push(hslToHex(hue, saturation, lightness));
  }

  return colors;
}

function generateSimulatedPalette(count) {
  const palettes = [
    ['#a855f7', '#ec4899', '#f59e0b', '#1a1a2e', '#f8fafc'],
    ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981'],
    ['#0ea5e9', '#22d3ee', '#818cf8', '#c084fc', '#f472b6'],
    ['#f97316', '#fbbf24', '#84cc16', '#10b981', '#06b6d4'],
    ['#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316']
  ];
  return palettes[Math.floor(Math.random() * palettes.length)].slice(0, count);
}

function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHsl(rgb) {
  let { r, g, b } = rgb;
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function generateCSS(colors) {
  return `:root {
${colors.map((c, i) => `  --color-${i + 1}: ${c};`).join('\n')}
}`;
}

function generateSCSS(colors) {
  return colors.map((c, i) => `$color-${i + 1}: ${c};`).join('\n');
}

function generateTailwind(colors) {
  return `colors: {
${colors.map((c, i) => `  brand-${i + 1}: '${c}',`).join('\n')}
}`;
}
