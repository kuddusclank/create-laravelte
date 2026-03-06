#!/usr/bin/env node

import { downloadTemplate } from 'giget';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REPO = 'gh:kuddusclank/laravel-svelte-starter';

// 1. Parse project name from args
let projectName = process.argv[2];
if (!projectName) {
  const rl = await import('node:readline/promises').then(m =>
    m.createInterface({ input: process.stdin, output: process.stdout })
  );
  projectName = await rl.question('Project name: ');
  rl.close();
  if (!projectName) {
    console.error('Project name is required.');
    process.exit(1);
  }
}

const targetDir = path.resolve(process.cwd(), projectName);

// 2. Check target directory
if (fs.existsSync(targetDir)) {
  console.error(`Directory "${projectName}" already exists.`);
  process.exit(1);
}

// 3. Check prerequisites
try {
  execSync('php -v', { stdio: 'ignore' });
} catch {
  console.error('PHP is required but not found. Install PHP 8.2+ first.');
  process.exit(1);
}

try {
  execSync('composer --version', { stdio: 'ignore' });
} catch {
  console.error('Composer is required but not found. Install Composer first.');
  process.exit(1);
}

// 4. Download template
console.log(`\nScaffolding project in ${targetDir}...\n`);
await downloadTemplate(REPO, { dir: targetDir });

// 5. Run composer install
console.log('Installing PHP dependencies...\n');
execSync('composer install', { cwd: targetDir, stdio: 'inherit' });

// 6. Copy .env
const envExample = path.join(targetDir, '.env.example');
const envFile = path.join(targetDir, '.env');
if (fs.existsSync(envExample) && !fs.existsSync(envFile)) {
  fs.copyFileSync(envExample, envFile);
}

// 7. Run setup wizard
console.log('\nStarting setup wizard...\n');
execSync('php artisan app:setup', { cwd: targetDir, stdio: 'inherit' });

// 8. Done
console.log(`\nDone! Your project is ready.\n`);
console.log(`  cd ${projectName}`);
console.log(`  composer dev\n`);
