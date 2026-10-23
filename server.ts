import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, ChildProcess } from 'child_process';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const FASTAPI_PORT = 8080;
const BACKEND_DIR = path.resolve(__dirname, 'AI-Price-Drop-Watcher/backend');

let pythonProcess: ChildProcess | null = null;
let isShuttingDown = false;

function startFastAPIServer() {
  if (isShuttingDown) return;

  console.log('[Node Host] Starting FastAPI backend process on port ' + FASTAPI_PORT + '...');
  
  pythonProcess = spawn(
    'python3',
    ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', String(FASTAPI_PORT)],
    {
      cwd: BACKEND_DIR,
      env: {
        ...process.env,
        PYTHONPATH: BACKEND_DIR,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    }
  );

  pythonProcess.stdout?.on('data', (data) => {
    const text = data.toString().trim();
    if (text) console.log(`[FastAPI] ${text}`);
  });

  pythonProcess.stderr?.on('data', (data) => {
    const text = data.toString().trim();
    if (text) console.error(`[FastAPI Error] ${text}`);
  });

  pythonProcess.on('exit', (code, signal) => {
    console.log(`[FastAPI] Process exited with code ${code}, signal ${signal}`);
    pythonProcess = null;
    if (!isShuttingDown) {
      console.log('[FastAPI] Respawning FastAPI process in 1 second...');
      setTimeout(startFastAPIServer, 1000);
    }
  });
}

// Proxy incoming request to FastAPI backend with retry
function proxyToFastAPI(req: express.Request, res: express.Response, retryCount = 0) {
  const targetUrl = new URL(req.originalUrl || req.url, `http://127.0.0.1:${FASTAPI_PORT}`);

  const options: http.RequestOptions = {
    hostname: '127.0.0.1',
    port: FASTAPI_PORT,
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers: {
      ...req.headers,
      host: `127.0.0.1:${FASTAPI_PORT}`,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    if (retryCount < 5) {
      // Backend might still be starting up, retry shortly
      setTimeout(() => proxyToFastAPI(req, res, retryCount + 1), 500);
    } else {
      console.error('[Proxy Error] Could not connect to FastAPI backend:', err.message);
      res.status(502).json({
        error: 'FastAPI Backend Unavailable',
        message: 'Could not connect to Python backend on port 8080. Ensure dependencies are installed.',
      });
    }
  });

  if (['POST', 'PUT', 'PATCH'].includes(req.method?.toUpperCase() || '')) {
    req.pipe(proxyReq, { end: true });
  } else {
    proxyReq.end();
  }
}

async function main() {
  startFastAPIServer();

  const app = express();

  // API and docs routes to proxy to FastAPI
  const apiPrefixes = [
    '/products',
    '/alerts',
    '/approvals',
    '/verification-logs',
    '/dataset',
    '/monitoring',
    '/health',
    '/docs',
    '/openapi.json',
    '/redoc',
  ];

  apiPrefixes.forEach((prefix) => {
    app.use(prefix, (req, res) => {
      proxyToFastAPI(req, res);
    });
  });

  // Mount Vite middlewares in development
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve built static assets
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Host] Full-Stack Server running at http://0.0.0.0:${PORT}`);
  });

  const cleanup = () => {
    isShuttingDown = true;
    if (pythonProcess) {
      pythonProcess.kill('SIGTERM');
    }
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch((err) => {
  console.error('[Host Fatal Error]:', err);
  process.exit(1);
});
