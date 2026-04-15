#!/usr/bin/env node
// Production simulator — feels like production, iterates like dev.
//
// 1. Builds each Astro app, mirrors dist/ into apps/pulpo-app/pb_public/<app>/.
// 2. Starts the Go backend on :8080 with PULPO_SIM_MODE=1 so it serves pb_public
//    from disk (no recompile needed when frontends change).
// 3. Watches apps/<app>/src/. On change, rebuilds that one app and copies the
//    fresh dist/ into pb_public/. The Go server picks up the new files
//    immediately; just reload the browser.
//
// Flags:
//   --no-watch     one-shot build + serve (legacy behaviour)
//   --port=N       override :8080 (or set PULPO_SIM_PORT)
//   --skip-build   reuse existing pb_public, jump straight to Go

import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, unlinkSync, watch } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const pbPublic = resolve(repo, 'apps/pulpo-app/pb_public');

const args = new Set(process.argv.slice(2));
const portFlag = [...args].find(a => a.startsWith('--port='));
const port = portFlag ? portFlag.split('=')[1] : (process.env.PULPO_SIM_PORT || '8090');
const watchMode = !args.has('--no-watch');
const skipBuild = args.has('--skip-build');

const apps = [
  { name: 'launcher', pkg: '@pulpo/launcher' },
  { name: 'menu',     pkg: '@pulpo/menu'     },
  { name: 'shop',     pkg: '@pulpo/shop'     },
  { name: 'agenda',   pkg: '@pulpo/agenda'   },
  { name: 'admin',    pkg: '@pulpo/admin'    },
];

function run(cmd, cmdArgs, opts = {}) {
  return new Promise((res, rej) => {
    const child = spawn(cmd, cmdArgs, { stdio: 'inherit', ...opts });
    child.on('exit', code => code === 0 ? res() : rej(new Error(`${cmd} ${cmdArgs.join(' ')} exited ${code}`)));
    child.on('error', rej);
  });
}

function wipeKeepGitkeep(dir) {
  if (!existsSync(dir)) { mkdirSync(dir, { recursive: true }); return; }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.gitkeep') continue;
    const p = resolve(dir, entry.name);
    if (entry.isDirectory()) rmSync(p, { recursive: true, force: true });
    else unlinkSync(p);
  }
}

async function buildApp(app) {
  const started = Date.now();
  await run('pnpm', ['--filter', app.pkg, 'build'], { cwd: repo });
  const src = resolve(repo, 'apps', app.name, 'dist');
  const dst = resolve(pbPublic, app.name);
  if (!existsSync(src)) throw new Error(`missing build output: ${src}`);
  wipeKeepGitkeep(dst);
  cpSync(src, dst, { recursive: true });
  console.log(`✓ ${app.name} rebuilt in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

if (!skipBuild) {
  console.log('→ Initial build: all apps in parallel…');
  await Promise.all(apps.map(async a => {
    await run('pnpm', ['--filter', a.pkg, 'build'], { cwd: repo });
    const src = resolve(repo, 'apps', a.name, 'dist');
    const dst = resolve(pbPublic, a.name);
    if (!existsSync(src)) throw new Error(`missing build output: ${src}`);
    wipeKeepGitkeep(dst);
    cpSync(src, dst, { recursive: true });
    console.log(`   ✓ ${a.name}`);
  }));
}

console.log(`→ Starting Go backend on :${port} (PULPO_SIM_MODE=1)…`);
const go = spawn('go', ['run', '.', 'serve', `--http=0.0.0.0:${port}`], {
  cwd: resolve(repo, 'apps/pulpo-app'),
  stdio: 'inherit',
  env: { ...process.env, PULPO_SIM_MODE: '1' },
});

const shutdown = () => { try { go.kill('SIGTERM'); } catch {} process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
go.on('exit', code => process.exit(code ?? 0));

if (watchMode) {
  console.log('→ Watching apps/*/src for changes — save a file to trigger rebuild.');

  // Coalesce bursts of file events per app, and serialize rebuilds so two rapid
  // saves in different apps don't trample each other.
  const queued = new Map();     // name → timer
  let chain = Promise.resolve();

  const schedule = (app) => {
    clearTimeout(queued.get(app.name));
    queued.set(app.name, setTimeout(() => {
      queued.delete(app.name);
      chain = chain.then(() => buildApp(app).catch(err => console.error(`✗ ${app.name}:`, err.message)));
    }, 150));
  };

  for (const app of apps) {
    const srcDir = resolve(repo, 'apps', app.name, 'src');
    if (!existsSync(srcDir)) continue;
    watch(srcDir, { recursive: true }, (_event, filename) => {
      if (!filename) return;
      if (filename.endsWith('~') || filename.includes('.DS_Store')) return;
      schedule(app);
    });
  }
}
