const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const requiredFiles = [
  'server.js',
  'index.html',
  'admin.html',
  '404.html',
  'style.css',
  'script.js',
  'analytics-client.js',
  'google1de57ef96b630118.html',
  'public/firebase-client.mjs',
  'api/admin-chat.js',
  'images/logo.png',
  'robots.txt',
  'sitemap.xml',
  'digital-marketing/index.html',
  'python-development/index.html',
  'seo-services/index.html',
  'ui-ux-design/index.html',
  'web-development/index.html'
];

function validateBuildInputs() {
  const config = JSON.parse(fs.readFileSync(path.join(projectRoot, 'vercel.json'), 'utf8'));
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  const expectedInstallCommand = 'env -u npm_config_cache_dir -u NPM_CONFIG_CACHE_DIR npm install';
  const expectedBuildCommand = 'env -u npm_config_cache_dir -u NPM_CONFIG_CACHE_DIR npm run build';
  if (config.installCommand !== expectedInstallCommand || config.buildCommand !== expectedBuildCommand) {
    throw new Error('Vercel npm commands must remove its unsupported cache-dir environment variable.');
  }
  if (packageJson.allowScripts?.['@google/genai'] !== false || packageJson.allowScripts?.protobufjs !== false) {
    throw new Error('Reviewed dependency lifecycle scripts must remain explicitly blocked.');
  }
  if (!config.functions?.['server.js']?.includeFiles || !config.routes?.some(route => route.dest === 'server.js')) {
    throw new Error('Vercel Express function or catch-all route configuration is missing.');
  }
  if (!config.routes.some(route => route.src === '/firebase-client.mjs' && route.check === true)) {
    throw new Error('The Firebase ES module must resolve to the static filesystem before the Express function.');
  }
  if (
    !config.routes.some(route => route.src === '/google1de57ef96b630118.html' && route.dest === '/google1de57ef96b630118.html' && route.check === true) ||
    !config.functions['server.js'].includeFiles.includes('google1de57ef96b630118.html')
  ) {
    throw new Error('Google Search Console verification must resolve at the origin root and be included in the Vercel function bundle.');
  }
  if (!packageJson.dependencies?.express || !packageJson.engines?.node) {
    throw new Error('The production server dependency or Node.js runtime is not configured.');
  }
  const firebaseClient = fs.readFileSync(path.join(projectRoot, 'public/firebase-client.mjs'), 'utf8');
  if (!firebaseClient.startsWith('// Hasnain Digital Marketer - Firebase Client Integration') || !firebaseClient.includes('import { initializeApp }')) {
    throw new Error('The Firebase browser client must remain an unchanged ES module in public/.');
  }
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(projectRoot, file)));
  if (missingFiles.length) throw new Error(`Required production files are missing: ${missingFiles.join(', ')}`);
}

try {
  validateBuildInputs();
} catch (error) {
  process.stderr.write(`[build] ${error.message}\n`);
  process.exit(1);
}

if (process.env.VERCEL === '1' || process.env.HXSN_VERCEL_BUILD_INNER === '1') {
  process.stdout.write('Production inputs validated for Vercel function packaging.\n');
  process.exit(0);
}

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const build = spawnSync(command, ['--yes', 'vercel@65.4.0', 'build', '--yes'], {
  cwd: projectRoot,
  env: { ...process.env, HXSN_VERCEL_BUILD_INNER: '1' },
  stdio: 'inherit'
});

if (build.error) {
  process.stderr.write(`[build] Unable to start Vercel CLI: ${build.error.message}\n`);
  process.exit(1);
}
process.exitCode = build.status ?? 1;
