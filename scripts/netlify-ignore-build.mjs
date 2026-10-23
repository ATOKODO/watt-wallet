import { spawnSync } from 'node:child_process';

// Netlify's ignore hook runs before dependencies are installed (currently Node 18).
// Exit 0 skips a build; exit 1 continues it. Keep paths aligned with angular.json.
const previous = process.env.CACHED_COMMIT_REF;
const current = process.env.COMMIT_REF;

if (!previous || !current || previous === current) {
  console.log('Build the app: initial deployment or explicit redeployment.');
  process.exit(1);
}

const result = spawnSync(
  'git',
  [
    'diff',
    '--quiet',
    previous,
    current,
    '--',
    'src/',
    'public/',
    'angular.json',
    'ngsw-config.json',
    'package.json',
    'package-lock.json',
    'npm-shrinkwrap.json',
    'tsconfig.json',
    'tsconfig.app.json',
    '.npmrc',
    '.nvmrc',
    '.node-version',
    'netlify.toml',
    'scripts/netlify-ignore-build.mjs',
    ':(exclude)src/stories/**',
  ],
  { encoding: 'utf8' },
);

if (!result.error && result.status === 0) {
  console.log('Skip app build: no browser application inputs changed.');
  process.exit(0);
}

// A missing Git reference or another comparison error must never block a release.
console.log('Build the app: browser inputs changed or Git comparison unavailable.');
process.exit(1);
