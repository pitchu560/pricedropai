import express from 'express';
import http from 'http';
import https from 'https';
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
let restartAttempts = 0;
const MAX_RESTART_ATTEMPTS = 3;

function checkPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/health`, { timeout: 1000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function startFastAPIServer() {
  if (isShuttingDown) return;

  // If BACKEND_URL is provided (e.g., via Vercel service binding), skip local spawn
  if (process.env.BACKEND_URL) {
    console.log(`[Node Host] Using configured BACKEND_URL binding: ${process.env.BACKEND_URL}`);
    return;
  }

  // Check if FastAPI backend is already running and answering health checks
  const isAlreadyRunning = await checkPortInUse(FASTAPI_PORT);
  if (isAlreadyRunning) {
    console.log(`[Node Host] FastAPI backend is already active and responding on port ${FASTAPI_PORT}.`);
    return;
  }

  console.log('[Node Host] Starting local FastAPI backend process on port ' + FASTAPI_PORT + '...');
  
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
    if (text) console.error(`[FastAPI] ${text}`);
  });

  pythonProcess.on('exit', async (code, signal) => {
    console.log(`[FastAPI] Process exited with code ${code}, signal ${signal}`);
    pythonProcess = null;

    if (isShuttingDown || process.env.BACKEND_URL) return;

    // Check if FastAPI is already serving on that port from another daemon
    const isNowRunning = await checkPortInUse(FASTAPI_PORT);
    if (isNowRunning) {
      console.log(`[Node Host] FastAPI backend is operational on port ${FASTAPI_PORT}. No respawn needed.`);
      return;
    }

    if (restartAttempts < MAX_RESTART_ATTEMPTS) {
      restartAttempts++;
      const delay = restartAttempts * 2000;
      console.log(`[FastAPI] Attempting restart ${restartAttempts}/${MAX_RESTART_ATTEMPTS} in ${delay}ms...`);
      setTimeout(startFastAPIServer, delay);
    } else {
      console.log(`[FastAPI] Maximum restart attempts (${MAX_RESTART_ATTEMPTS}) reached. Halting auto-restart.`);
    }
  });
}

// Proxy incoming request to FastAPI backend with retry
function proxyToFastAPI(req: express.Request, res: express.Response, retryCount = 0) {
  const backendBase = process.env.BACKEND_URL || `http://127.0.0.1:${FASTAPI_PORT}`;
  const targetUrl = new URL(req.originalUrl || req.url, backendBase);
  const isHttps = targetUrl.protocol === 'https:';
  const clientModule = isHttps ? https : http;

  const options: http.RequestOptions = {
    hostname: targetUrl.hostname,
    port: targetUrl.port ? Number(targetUrl.port) : (isHttps ? 443 : 80),
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers: {
      ...req.headers,
      host: targetUrl.host,
    },
  };

  const proxyReq = clientModule.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    if (retryCount < 5 && !process.env.BACKEND_URL) {
      // Backend might still be starting up in local mode, retry shortly
      setTimeout(() => proxyToFastAPI(req, res, retryCount + 1), 500);
    } else {
      console.error('[Proxy Error] Could not connect to FastAPI backend:', err.message);
      res.status(502).json({
        error: 'FastAPI Backend Unavailable',
        message: `Could not connect to Python backend at ${backendBase}.`,
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
  await startFastAPIServer();

  const app = express();

  // API and docs routes to proxy to FastAPI
  const apiPrefixes = [
    '/api',
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
