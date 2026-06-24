import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const redirectsPath = path.join(distDir, '_redirects');

// Read BACKEND_API_URL from env or use default fallback URL
const backendUrl = process.env.BACKEND_API_URL || 'https://fashion-world-studio-backend.onrender.com';

const content = `/api/*  ${backendUrl}/api/:splat  200\n/*  /index.html  200\n`;

try {
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  fs.writeFileSync(redirectsPath, content, 'utf8');
  console.log(`Successfully generated Netlify _redirects:`);
  console.log(`- Proxy: /api/* -> ${backendUrl}/api/:splat (200)`);
  console.log(`- SPA Fallback: /* -> /index.html (200)`);
} catch (error) {
  console.error('Error generating _redirects:', error);
}
