import express from 'express';
import type { ScanResult } from './types.js';

const app = express();
const PORT = Number(process.env.PORT ?? 8787);

// Lockfiles are JSON; real-world ones run to a few MB.
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    offline: process.env.OFFLINE === '1',
    gemini: Boolean(process.env.GEMINI_API_KEY),
  });
});

app.post('/api/scan', (req, res) => {
  const lockfile = req.body?.lockfile;
  if (!lockfile || typeof lockfile !== 'object') {
    res.status(400).json({ error: 'Expected { lockfile: <package-lock.json contents> }' });
    return;
  }

  // Pipeline stages (parse → match → enrich → score → plan → ai) are wired in here as they land.
  const result: ScanResult = {
    scannedAt: new Date().toISOString(),
    packageCount: 0,
    findings: [],
    plans: [],
  };
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Vulnera API listening on http://localhost:${PORT}`);
});
