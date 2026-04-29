import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(currentFile);
const projectRoot = path.resolve(scriptsDir, '..', '..');
const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

const args = process.argv.slice(2);
const platformArgIndex = args.indexOf('--platform');

if (platformArgIndex === -1 || !args[platformArgIndex + 1]) {
  console.error('Usage: node scripts/cli/build-cli.mjs --platform macos|linux');
  process.exit(2);
}

const targetPlatform = args[platformArgIndex + 1];
if (!['macos', 'linux'].includes(targetPlatform)) {
  console.error(`Unsupported platform: ${targetPlatform}. Use macos or linux.`);
  process.exit(2);
}

const currentPlatform = process.platform === 'darwin' ? 'macos' : process.platform;
if (currentPlatform !== targetPlatform) {
  console.error(`This script is intended for ${targetPlatform} machine. Current platform: ${process.platform}`);
  process.exit(2);
}

const archMap = {
  x64: 'x64',
  arm64: 'arm64'
};

const targetArch = archMap[process.arch];
if (!targetArch) {
  console.error(`Unsupported architecture for CLI build: ${process.arch}`);
  process.exit(2);
}

function run(command, commandArgs, cwd = projectRoot) {
  const result = spawnSync(command, commandArgs, {
    cwd,
    stdio: 'inherit',
    env: process.env
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function resolvePkgRunner() {
  const localPkg = path.join(projectRoot, 'node_modules', '.bin', 'pkg');
  if (!existsSync(localPkg)) {
    console.error('Missing local pkg binary. Run `npm install` in any-code-fingerprint first.');
    process.exit(2);
  }
  return localPkg;
}

function sha256File(filePath) {
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

const pkgPlatform = targetPlatform === 'macos' ? 'macos' : 'linux';
const pkgTarget = `node18-${pkgPlatform}-${targetArch}`;

const outDir = path.join(projectRoot, 'artifacts', 'cli', `v${packageJson.version}`);
mkdirSync(outDir, { recursive: true });

const binaryName = `acf-${targetPlatform}-${targetArch}`;
const binaryPath = path.join(outDir, binaryName);
const archiveName = `${binaryName}.tar.gz`;
const archivePath = path.join(outDir, archiveName);

console.log(`[build-cli] package version: ${packageJson.version}`);
console.log(`[build-cli] target: ${pkgTarget}`);
console.log('[build-cli] building dist artifacts...');
run('npm', ['run', 'build']);

const cliCjsPath = path.join(projectRoot, 'dist/cli.cjs');
const cliContent = readFileSync(cliCjsPath, 'utf8');
writeFileSync(
  cliCjsPath,
  cliContent.replace(
    'const EMBEDDED_VERSION = null',
    `const EMBEDDED_VERSION = '${packageJson.version}'`
  )
);
console.log(`[build-cli] injected version ${packageJson.version} into dist/cli.cjs`);

const pkgRunner = resolvePkgRunner();
console.log(`[build-cli] using pkg runner: ${pkgRunner}`);
run(pkgRunner, [
  'dist/cli.cjs',
  '--targets',
  pkgTarget,
  '--output',
  binaryPath
]);

chmodSync(binaryPath, 0o755);

console.log(`[build-cli] creating archive: ${archiveName}`);
run('tar', ['-czf', archivePath, '-C', outDir, binaryName]);

const checksum = sha256File(archivePath);
writeFileSync(`${archivePath}.sha256`, `${checksum}  ${archiveName}\n`, 'utf8');

console.log('[build-cli] done');
console.log(`[build-cli] binary:   ${binaryPath}`);
console.log(`[build-cli] archive:  ${archivePath}`);
console.log(`[build-cli] checksum: ${archivePath}.sha256`);
