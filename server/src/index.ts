import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import { OfflineMissError } from './cache.js';
import { analyzeFindings } from './pipeline/ai.js';
import { enrich } from './pipeline/enrich.js';
import { matchPackages } from './pipeline/match.js';
import { parseLockfile } from './pipeline/parse.js';
import { planUpgrades } from './pipeline/plan.js';
import { scoreFindings } from './pipeline/score.js';
import type { ScanRequest, ScanResult, SourceFile } from './types.js';

const app = express();
const PORT = Number(process.env.PORT ?? 8787);
const SAMPLE_DIR = path.resolve(import.meta.dirname, '../../samples/demo-app');
const SOURCE_EXT = /\.(js|jsx|ts|tsx|mjs|cjs)$/;

// Lockfiles are JSON; real-world ones run to a few MB.
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    offline: process.env.OFFLINE === '1',
    gemini: Boolean(process.env.GEMINI_API_KEY),
  });
});

// User-facing failure: message is safe to show in the UI.
class ScanError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

async function loadSample(): Promise<{ lockfile: unknown; sources: SourceFile[] }> {
  let lockfile: unknown;
  try {
    lockfile = JSON.parse(await readFile(path.join(SAMPLE_DIR, 'package-lock.json'), 'utf8'));
  } catch {
    throw new ScanError('Sample project is not available on this server.', 404);
  }
  const files = await readdir(SAMPLE_DIR, { recursive: true });
  const sources: SourceFile[] = [];
  for (const rel of files) {
    if (!SOURCE_EXT.test(rel) || rel.split(path.sep).includes('node_modules')) continue;
    sources.push({
      path: rel.split(path.sep).join('/'),
      content: await readFile(path.join(SAMPLE_DIR, rel), 'utf8'),
    });
  }
  return { lockfile, sources };
}

async function scan(req: ScanRequest): Promise<ScanResult> {
  const notes: string[] = [];
  const { lockfile, sources } = req.sample
    ? await loadSample()
    : { lockfile: req.lockfile, sources: req.sources ?? [] };
  if (!lockfile || typeof lockfile !== 'object') {
    throw new ScanError('Expected { lockfile: <package-lock.json contents> } or { sample: true }.');
  }

  let packages;
  try {
    packages = parseLockfile(lockfile);
  } catch (e) {
    throw new ScanError(e instanceof Error ? e.message : 'Could not read the lockfile.');
  }

  const matches = await matchPackages(packages);
  const advisories = [...new Map(matches.map((m) => [m.advisory.id, m.advisory])).values()];
  const enriched = await enrich(advisories);
  notes.push(...enriched.warnings);

  // First pass without AI gives the order Gemini works through (most urgent first).
  const ranked = scoreFindings(matches, enriched.map);
  const ai = await analyzeFindings(ranked, sources);
  notes.push(...ai.warnings);

  // AI can only raise a tier, so rescoring with verdicts is safe.
  const findings = ai.verdicts.size ? scoreFindings(matches, enriched.map, ai.verdicts) : ranked;
  const plans = await planUpgrades(matches);

  return {
    scannedAt: new Date().toISOString(),
    packageCount: packages.length,
    findings,
    plans,
    aiStatus: ai.status,
    notes,
  };
}

app.post('/api/scan', async (req, res) => {
  try {
    res.json(await scan((req.body ?? {}) as ScanRequest));
  } catch (e) {
    if (e instanceof ScanError) {
      res.status(e.status).json({ error: e.message });
    } else if (e instanceof OfflineMissError) {
      res.status(503).json({ error: 'Offline mode: this project has no saved snapshot. Turn OFFLINE off or scan the sample.' });
    } else {
      console.error(e);
      res.status(502).json({ error: 'Scan failed while contacting a data source. Try again.' });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Vulnera API listening on http://localhost:${PORT}`);
});
