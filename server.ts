import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  const repoDir = path.join(__dirname, 'enishi-protocol');

  // API endpoint: Get repository structure and file contents
  app.get('/api/repo/files', (req, res) => {
    try {
      const getFileTree = (dir: string, base: string = ''): Array<{ path: string; name: string; isDir: boolean; size?: number }> => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        let result: Array<{ path: string; name: string; isDir: boolean; size?: number }> = [];

        for (const entry of entries) {
          if (entry.name === '__pycache__' || entry.name === '.pytest_cache' || entry.name.endsWith('.pyc')) {
            continue;
          }
          const relPath = base ? `${base}/${entry.name}` : entry.name;
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            result.push({ path: relPath, name: entry.name, isDir: true });
            result = result.concat(getFileTree(fullPath, relPath));
          } else {
            const stat = fs.statSync(fullPath);
            result.push({ path: relPath, name: entry.name, isDir: false, size: stat.size });
          }
        }
        return result;
      };

      const files = getFileTree(repoDir);
      res.json({ files });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API endpoint: Read single file content
  app.get('/api/repo/file', (req, res) => {
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({ error: 'Missing path parameter' });
    }

    const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(repoDir, safePath);

    if (!fullPath.startsWith(repoDir)) {
      return res.status(403).json({ error: 'Access denied outside repo' });
    }

    try {
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      const content = fs.readFileSync(fullPath, 'utf-8');
      res.json({ path: safePath, content });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API endpoint: Run Python simulation
  app.post('/api/run/simulation', (req, res) => {
    const simScript = path.join(repoDir, 'examples', 'simulation.py');
    exec(
      `python3 "${simScript}"`,
      { cwd: repoDir, env: { ...process.env, PYTHONPATH: `${path.join(repoDir, 'src')}` } },
      (error, stdout, stderr) => {
        res.json({
          success: !error,
          exitCode: error ? error.code : 0,
          stdout,
          stderr,
        });
      }
    );
  });

  // API endpoint: Run Unit Tests
  app.post('/api/run/tests', (req, res) => {
    const testsDir = path.join(repoDir, 'tests');
    const srcDir = path.join(repoDir, 'src');
    exec(
      `python3 -m unittest discover -s "${testsDir}" -p "test_*.py"`,
      { cwd: repoDir, env: { ...process.env, PYTHONPATH: `${srcDir}:${testsDir}` } },
      (error, stdout, stderr) => {
        res.json({
          success: !error,
          exitCode: error ? error.code : 0,
          stdout,
          stderr,
        });
      }
    );
  });

  // API endpoint: Download entire repository as single JSON bundle or text files
  app.get('/api/repo/bundle', (req, res) => {
    try {
      const readAllFiles = (dir: string, base: string = ''): Record<string, string> => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        let result: Record<string, string> = {};

        for (const entry of entries) {
          if (entry.name === '__pycache__' || entry.name.endsWith('.pyc')) continue;
          const relPath = base ? `${base}/${entry.name}` : entry.name;
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            Object.assign(result, readAllFiles(fullPath, relPath));
          } else {
            result[relPath] = fs.readFileSync(fullPath, 'utf-8');
          }
        }
        return result;
      };

      const bundle = readAllFiles(repoDir);
      res.json({ repo: 'enishi-protocol', version: '0.2.0', files: bundle });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Enishi Protocol server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
