const http = require('http');
const fs = require('fs');
const path = require('path');

const projectId = process.env.PROJECT_ID;
const minioHost = process.env.MINIO_HOST || 'minio';
const minioPort = parseInt(process.env.MINIO_PORT || '9000', 10);
const bucket = process.env.MINIO_BUCKET || 'projects';
const appDir = '/app';

console.log(`[Syncer] Initialized MinIO syncer for Project #${projectId} (${minioHost}:${minioPort}/${bucket})`);

const fileEtags = {};

function request(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({
        body: Buffer.concat(chunks),
        etag: res.headers.etag || ''
      }));
    }).on('error', reject);
  });
}

async function syncOnce() {
  try {
    const listUrl = `http://${minioHost}:${minioPort}/${bucket}?prefix=${projectId}/`;
    const { body } = await request(listUrl);
    const xml = body.toString('utf-8');

    const regex = /<Contents>[\s\S]*?<Key>([^<]+)<\/Key>[\s\S]*?<ETag>([^<]+)<\/ETag>[\s\S]*?<\/Contents>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      const key = match[1];
      const rawEtag = match[2];
      const etag = rawEtag.replace(/"/g, '').replace(/&#34;/g, '').trim();

      const relPath = key.replace(new RegExp(`^${projectId}/`), '');
      if (!relPath) continue;

      if (fileEtags[key] !== etag) {
        try {
          const fileUrl = `http://${minioHost}:${minioPort}/${bucket}/${key}`;
          const fileRes = await request(fileUrl);
          const destPath = path.join(appDir, relPath);
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
          fs.writeFileSync(destPath, fileRes.body);
          fileEtags[key] = etag;
          console.log(`[Syncer] Synced ${relPath} (${fileRes.body.length} bytes, etag: ${etag})`);
        } catch (e) {
          console.error(`[Syncer] Failed to download ${key}:`, e.message);
        }
      }
    }
    ensureConfigFiles();
  } catch (err) {
    console.error(`[Syncer] Polling error:`, err.message);
  }
}

function ensureConfigFiles() {
  const viteConfig = path.join(appDir, 'vite.config.ts');
  if (!fs.existsSync(viteConfig)) {
    fs.writeFileSync(viteConfig, `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    cors: true
  }
});
`);
  }

  const twConfig = path.join(appDir, 'tailwind.config.js');
  if (!fs.existsSync(twConfig)) {
    fs.writeFileSync(twConfig, `export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
`);
  }

  const pcConfig = path.join(appDir, 'postcss.config.js');
  if (!fs.existsSync(pcConfig)) {
    fs.writeFileSync(pcConfig, `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`);
  }
}

async function loop() {
  await syncOnce();
  setTimeout(loop, 2000);
}

loop();
