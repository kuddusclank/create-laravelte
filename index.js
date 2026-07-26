#!/usr/bin/env node

import { downloadTemplate } from 'giget';
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import * as clack from '@clack/prompts';
import pc from 'picocolors';

const REPO = 'gh:kuddusclank/laravel-svelte-starter';

// AI Agent Rule Templates
const AGENT_TEMPLATES = {
  cursor: {
    files: {
      '.cursorrules': `# Global Cursor Rules\n\nProject Tech Stack: Laravel 12, Svelte 5 (with Runes), SvelteKit, SQLite, Pest PHP, Shadcn-Svelte.\n`,
      '.cursor/rules/laravel.mdc': `---\ndescription: Enforce Laravel 11/12 coding standards, pest testing, and architecture.\nglobs: ["app/**/*.php", "routes/**/*.php", "config/**/*.php", "tests/**/*.php"]\nalwaysApply: false\n---\n\n# Laravel Guidelines\n- Prefer using \`php artisan\` commands to generate code structure.\n- Always use type-hinting for class properties, arguments, and return values.\n- Never use \`env()\` outside configuration files; use \`config('key')\` instead.\n- Use \`match\` expressions instead of \`switch\` statements where applicable.\n- Write tests using Pest PHP.\n`,
      '.cursor/rules/svelte.mdc': `---\ndescription: Enforce Svelte 5 runes, Shadcn-Svelte, and TypeScript styles.\nglobs: ["src/**/*.svelte", "src/**/*.ts", "src/**/*.js"]\nalwaysApply: false\n---\n\n# Svelte 5 / Frontend Guidelines\n- Always use Svelte 5 runes (\`$state\`, \`$derived\`, \`$props\`, \`$effect\`) instead of Svelte 4 reactive stores.\n- Use TypeScript for all component scripts (\`<script lang="ts">\`).\n- Rely on Tailwind CSS v4 and Shadcn-Svelte components for layouts.\n- Leverage the cn() utility function from $lib/utils/utils.ts for concatenating CSS class names.\n- Avoid raw style tags; prefer utility classes.\n`
    }
  },
  windsurf: {
    files: {
      '.windsurfrules': `# Windsurf Agent Rules\nYou are an expert full-stack developer working on a Laravel 12 + Svelte 5 project.\n\n## Tech Stack & Conventions\n- **Backend:** Laravel 12, Fortify, SQLite, Pest PHP.\n- **Frontend:** Svelte 5 (using runes), SvelteKit, Tailwind CSS v4, Shadcn-Svelte.\n\n## Core Directives\n1. Always keep the backend and frontend decoupled; rely on REST/Inertia where applicable.\n2. Prioritize security: do not bypass CSRF checks, and make sure Fortify rules are followed.\n3. Leverage the cn() helper ($lib/utils/utils) to resolve conditional class mergers.\n4. If database migrations are edited, tell the user to run \`php artisan migrate\`.\n`
    }
  },
  copilot: {
    files: {
      '.github/copilot-instructions.md': `# GitHub Copilot System Instructions\n\n## Project Context\n- **Name:** Laravel Svelte Starter App\n- **Architecture:** Monolith API backend + SvelteKit frontend.\n\n## Coding Style\n- Follow PSR-12 formatting rules for PHP files.\n- Follow ESLint / Prettier formats for Svelte and TypeScript files.\n- Use Tailwind CSS v4, Lucide Svelte, or pre-scaffolded Shadcn-Svelte UI components.\n- Class names must be merged using the cn(...) helper from $lib/utils/utils.\n`
    }
  },
  claude: {
    files: {
      '.clauderules': `# Claude Code Instructions\nYou are operating inside a Laravel 12 + Svelte 5 full-stack application with Shadcn-Svelte.\n\n## Coding Conventions\n- Prefer Pest PHP for back-end tests.\n- Always use strongly-typed properties, arguments, and return types in PHP.\n- For Svelte components, implement script tag lang="ts" and utilize Svelte 5 runes (\`$state\`, \`$props\`).\n- Leverage the cn() class-merging helper ($lib/utils/utils) to build responsive layouts.\n\n## Approved Command Guidelines\n- Safe to execute: \`php artisan route:list\`, \`php artisan test\`, \`npm run build\`, \`npm run dev\`\n`
    }
  },
  kimi: {
    files: {
      '.kimirules': `# Kimi Rules & Directives\n- **Technical Stack:** Laravel backend + Svelte 5/SvelteKit frontend.\n- **Frontend Guidelines:** Use Tailwind CSS v4 and Shadcn-Svelte components.\n- **Utilities:** Use cn() from $lib/utils/utils to merge conditional Tailwind classes.\n- **Backend Guidelines:** Standard Laravel MVC pattern. Avoid complex repository patterns unless strictly necessary.\n`
    }
  },
  gemini: {
    files: {
      '.agents/AGENTS.md': `# Gemini & Antigravity Coding Constraints\n- Always use standard Laravel conventions (PSR-12).\n- Svelte components must use Svelte 5 runes.\n- Standard UI components are scaffolded under $lib/components/ui/.\n- Class names must be merged using the cn(...) helper from $lib/utils/utils.\n- Write explanatory commit messages describing non-obvious code paths.\n`
    }
  },
  llmstxt: {
    files: {
      'llms.txt': `# Laravel Svelte Starter\n\n> A premium Laravel 12 and Svelte 5 boilerplate with built-in Fortify Auth, SSO, 2FA, and Shadcn-Svelte.\n\n## Folders & Architecture\n- [app/](file:///app): Core Laravel backend code (Controllers, Models, Middleware).\n- [src/lib/components/ui/](file:///src/lib/components/ui): Pre-scaffolded Shadcn UI elements (Button, Card).\n- [src/routes/](file:///src/routes): SvelteKit frontend routes and views.\n\n## Key APIs\n- [Auth Flow](/docs/auth.md): Authentication presets (Fortify + SSO callback).\n- [SSO Setup](/docs/sso.md): How to setup GitHub, Google, Facebook, Apple, and X keys.\n`
    }
  }
};

// Helper to resolve paths in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to check command availability and get outputs/versions
function checkCommand(command, versionArgs = '--version') {
  try {
    const output = execSync(`${command} ${versionArgs}`, { stdio: 'pipe' }).toString().trim();
    return { available: true, output };
  } catch {
    return { available: false, output: '' };
  }
}

// Inspect the environment without throwing. Node is the only hard requirement
// for the CLI itself; PHP and Composer are only needed for the optional
// install + setup-wizard step, so we report their status and let the caller
// decide how to proceed (scaffold now, install later).
function checkEnvironment() {
  const nodeVersion = process.versions.node;
  const majorNode = parseInt(nodeVersion.split('.')[0], 10);
  const nodeOk = !isNaN(majorNode) && majorNode >= 18;

  // PHP presence and version (8.2+ required for Laravel 12)
  const phpCheck = checkCommand('php', '-r "echo PHP_VERSION;"');
  const php = { available: phpCheck.available, version: null, ok: false };
  if (phpCheck.available) {
    php.version = phpCheck.output.trim();
    const major = parseInt(php.version.split('.')[0], 10);
    const minor = parseInt(php.version.split('.')[1], 10);
    php.ok = !isNaN(major) && (major > 8 || (major === 8 && minor >= 2));
  }

  const composer = { available: checkCommand('composer', '--version').available };

  return { nodeVersion, nodeOk, php, composer };
}

// OS-aware guidance for installing PHP 8.2+ and Composer.
function installHints() {
  const lines = ['To install PHP 8.2+ and Composer, then re-run this command:'];
  if (process.platform === 'darwin') {
    lines.push('  macOS:  /bin/bash -c "$(curl -fsSL https://php.new/install/mac)"');
  } else if (process.platform === 'win32') {
    lines.push('  Windows (PowerShell): see https://php.new');
  } else {
    lines.push('  Linux:  /bin/bash -c "$(curl -fsSL https://php.new/install/linux)"');
  }
  lines.push('  Or use Laravel Herd: https://herd.laravel.com');
  lines.push('  Composer docs: https://getcomposer.org/download/');
  return lines;
}

// Function to run spawn as a Promise, capturing or passing stdio
function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command "${command} ${args.join(' ')}" failed with exit code ${code}`));
      }
    });
    child.on('error', (err) => {
      reject(err);
    });
  });
}

// Function to run a background silent command (capturing output for errors)
function runCommandSilent(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'pipe', ...options });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || stdout || `Process failed with exit code ${code}`));
      }
    });
    child.on('error', (err) => {
      reject(err);
    });
  });
}

// Function to detect package manager
function detectPackageManager() {
  const userAgent = process.env.npm_config_user_agent || '';
  if (userAgent.includes('pnpm')) return 'pnpm';
  if (userAgent.includes('yarn')) return 'yarn';
  if (userAgent.includes('bun')) return 'bun';
  return 'npm';
}

function printUsage() {
  console.log(`
Usage:
  ${pc.cyan('npm create laravelte')} ${pc.yellow('[project-name]')} ${pc.dim('[options]')}

Options:
  ${pc.cyan('-h, --help')}       Show this help message
  ${pc.cyan('-v, --version')}    Show the version of create-laravelte
  ${pc.cyan('-f, --force')}      Force overwrite of target directory if it exists
  ${pc.cyan('--no-git')}         Skip Git initialization
  ${pc.cyan('--no-install')}    Skip running composer install & artisan setup wizard
  ${pc.cyan('--agents')}         Pre-configure AI agents (comma-separated: cursor,windsurf,copilot,claude,kimi,gemini,llmstxt)
`);
}

async function main() {
  // 1. Parse arguments using node:util
  const config = {
    options: {
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
      force: { type: 'boolean', short: 'f' },
      git: { type: 'boolean', default: true },
      'no-git': { type: 'boolean' },
      install: { type: 'boolean', default: true },
      'no-install': { type: 'boolean' },
      agents: { type: 'string' }
    },
    allowPositionals: true
  };

  let args;
  try {
    args = parseArgs(config);
  } catch (err) {
    console.error(pc.red(`Error: ${err.message}`));
    printUsage();
    process.exit(1);
  }

  const { values, positionals } = args;

  // --help
  if (values.help) {
    printUsage();
    process.exit(0);
  }

  // --version
  if (values.version) {
    try {
      const packageJsonPath = path.resolve(__dirname, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      console.log(`create-laravelte v${packageJson.version}`);
    } catch {
      console.log('create-laravelte v0.2.0');
    }
    process.exit(0);
  }

  // 2. Banner/Intro
  console.log();
  clack.intro(pc.bgMagenta(pc.white(pc.bold(' CREATE-LARAVELTE '))));
  clack.log.message(pc.dim('Scaffold a new Laravel + Svelte application with rich presets\n'));

  // 3. Determine and prompt project name
  let projectName = positionals[0];
  if (!projectName) {
    const inputName = await clack.text({
      message: 'What is the name of your project?',
      placeholder: 'my-laravelte-app',
      validate(value) {
        if (!value.trim()) return 'Project name is required.';
        if (/[^a-zA-Z0-9-_]/.test(value)) return 'Project name can only contain letters, numbers, dashes, and underscores.';
      }
    });

    if (clack.isCancel(inputName)) {
      clack.cancel('Scaffolding cancelled. Goodbye!');
      process.exit(0);
    }
    projectName = inputName;
  }

  // 3b. Prompt for AI Agent configurations
  let selectedAgents;
  if (values.agents) {
    selectedAgents = values.agents.split(',').map(s => s.trim().toLowerCase()).filter(s => s in AGENT_TEMPLATES);
  } else {
    selectedAgents = await clack.multiselect({
      message: 'Which AI coding assistants/agents would you like to pre-configure?',
      options: [
        { value: 'cursor', label: 'Cursor (.cursor/rules/ & .cursorrules)' },
        { value: 'windsurf', label: 'Windsurf (.windsurfrules)' },
        { value: 'copilot', label: 'GitHub Copilot (.github/copilot-instructions.md)' },
        { value: 'claude', label: 'Claude Code (.clauderules)' },
        { value: 'kimi', label: 'Kimi (.kimirules)' },
        { value: 'gemini', label: 'Gemini / Antigravity (.agents/AGENTS.md)' },
        { value: 'llmstxt', label: 'llms.txt (LLM directory map)' }
      ],
      required: false,
      hint: 'Use spacebar to select, enter to confirm. You can skip all.'
    });

    if (clack.isCancel(selectedAgents)) {
      clack.cancel('Scaffolding cancelled. Goodbye!');
      process.exit(0);
    }
  }

  const targetDir = path.resolve(process.cwd(), projectName);

  // Parse negative flag parameters
  const useGit = values.git !== false && !values['no-git'];
  let runInstall = values.install !== false && !values['no-install'];

  // 4. Directory collision checks
  if (fs.existsSync(targetDir)) {
    const files = fs.readdirSync(targetDir);
    if (files.length > 0) {
      if (values.force) {
        const cleanupSpinner = clack.spinner();
        cleanupSpinner.start(`Cleaning existing directory "${projectName}"...`);
        fs.rmSync(targetDir, { recursive: true, force: true });
        cleanupSpinner.stop(`Cleaned up existing folder: ${pc.yellow(projectName)}`);
      } else {
        const overwrite = await clack.select({
          message: `Directory "${projectName}" already exists and is not empty. What would you like to do?`,
          options: [
            { value: 'overwrite', label: 'Overwrite existing files (Deletes all contents!)', hint: 'dangerous' },
            { value: 'cancel', label: 'Cancel installation' }
          ],
          initialValue: 'cancel'
        });

        if (clack.isCancel(overwrite) || overwrite === 'cancel') {
          clack.cancel('Installation aborted.');
          process.exit(0);
        }

        const cleanupSpinner = clack.spinner();
        cleanupSpinner.start(`Overwriting directory "${projectName}"...`);
        fs.rmSync(targetDir, { recursive: true, force: true });
        cleanupSpinner.stop(`Directory cleaned: ${pc.yellow(projectName)}`);
      }
    }
  }

  // 5. Environmental checks
  const prereqSpinner = clack.spinner();
  prereqSpinner.start('Checking environment prerequisites...');
  const env = checkEnvironment();

  // Node is the only hard requirement — the CLI itself runs on it.
  if (!env.nodeOk) {
    prereqSpinner.stop(pc.red('Prerequisite check failed.'));
    clack.log.error(pc.red(`Node.js 18+ is required. You are running v${env.nodeVersion}.`));
    process.exit(1);
  }

  // PHP + Composer are only needed to install dependencies and run the setup
  // wizard. If they're missing/outdated we still scaffold the project and skip
  // that optional step, so the user isn't left empty-handed.
  const missing = [];
  if (!env.php.available) missing.push('PHP 8.2+ (not found in PATH)');
  else if (!env.php.ok) missing.push(`PHP 8.2+ (found v${env.php.version})`);
  if (!env.composer.available) missing.push('Composer (not found in PATH)');

  if (missing.length === 0) {
    prereqSpinner.stop(pc.green(`Environment OK (PHP v${env.php.version}, Node v${env.nodeVersion})`));
  } else {
    prereqSpinner.stop(pc.yellow('Some prerequisites are missing — the project will still be scaffolded.'));
    if (runInstall) {
      clack.log.warn(`Skipping dependency install & setup wizard. Missing:\n  - ${missing.join('\n  - ')}`);
      for (const line of installHints()) clack.log.message(pc.dim(line));
      runInstall = false;
    }
  }

  let downloadCompleted = false;

  try {
    // 6. Download template
    const downloadSpinner = clack.spinner();
    downloadSpinner.start(`Downloading template from ${pc.cyan(REPO)}...`);
    await downloadTemplate(REPO, { dir: targetDir });
    downloadCompleted = true;
    downloadSpinner.stop(pc.green('Template downloaded successfully!'));

    // Hotfix SetupCommand.php to run npm install / build with visible output
    const setupCommandPath = path.join(targetDir, 'app/Console/Commands/SetupCommand.php');
    if (fs.existsSync(setupCommandPath)) {
      try {
        let content = fs.readFileSync(setupCommandPath, 'utf8');
        const npmInstallRegex = /spin\(\s*callback:\s*fn\s*\(\s*\)\s*=>\s*exec\([\s\S]*?npm\s+install[\s\S]*?\),\s*message:\s*["\x27]Installing\s+npm\s+dependencies\.\.\.["\x27]\s*,\s*\);/gi;
        const npmBuildRegex = /spin\(\s*callback:\s*fn\s*\(\s*\)\s*=>\s*exec\([\s\S]*?npm\s+run\s+build[\s\S]*?\),\s*message:\s*["\x27]Building\s+frontend\s+assets\.\.\.["\x27]\s*,\s*\);/gi;

        content = content
          .replace(npmInstallRegex, "$this->info('Installing npm dependencies...');\n            passthru('npm install');")
          .replace(npmBuildRegex, "$this->info('Building frontend assets...');\n        passthru('npm run build');");

        fs.writeFileSync(setupCommandPath, content, 'utf8');
      } catch (err) {
        // Fail silently or log a warning, don't halt installation
        clack.log.warn('Could not apply real-time npm logging patch to SetupCommand.php.');
      }
    }

    // Write AI Agent Rule Files
    if (selectedAgents && selectedAgents.length > 0) {
      const agentSpinner = clack.spinner();
      agentSpinner.start('Writing AI agent rules...');
      try {
        for (const agent of selectedAgents) {
          const template = AGENT_TEMPLATES[agent];
          if (template && template.files) {
            for (const [relPath, content] of Object.entries(template.files)) {
              const fullPath = path.join(targetDir, relPath);
              const dir = path.dirname(fullPath);
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }
              fs.writeFileSync(fullPath, content, 'utf8');
            }
          }
        }
        agentSpinner.stop(pc.green('AI agent rules written successfully.'));
      } catch (err) {
        agentSpinner.stop(pc.yellow(`Failed to write AI agent rules: ${err.message}`));
      }
    }

    if (runInstall) {
      // 7. Install PHP dependencies
      clack.log.step('Installing PHP dependencies (composer install)...');
      console.log();
      try {
        await runProcess('composer', ['install', '--ansi'], { cwd: targetDir });
        console.log();
        clack.log.success(pc.green('PHP dependencies installed.'));
      } catch (err) {
        clack.log.error(pc.red('Composer installation failed.'));
        throw new Error(`Failed to install composer dependencies:\n${err.message}`);
      }

      // 8. Copy .env
      const envExample = path.join(targetDir, '.env.example');
      const envFile = path.join(targetDir, '.env');
      if (fs.existsSync(envExample) && !fs.existsSync(envFile)) {
        fs.copyFileSync(envExample, envFile);
      }

      // 9. Run setup wizard (Handover terminal control)
      clack.log.info(pc.magenta('Launching the Laravel Svelte setup wizard...'));
      console.log();
      await runProcess('php', ['artisan', 'app:setup'], { cwd: targetDir });
      console.log();
    } else if (missing.length === 0) {
      // Only announce the flag-based skip here; a missing-prereq skip was
      // already reported (with install hints) during the environment check.
      clack.log.warn('Skipping dependency installation and setup wizard (--no-install flagged).');
    }

    // 10. Initialize Git repo
    if (useGit) {
      const gitSpinner = clack.spinner();
      gitSpinner.start('Initializing local Git repository...');
      try {
        const gitCheck = checkCommand('git', '--version');
        if (!gitCheck.available) {
          gitSpinner.stop(pc.yellow('Skipped Git initialization (git binary not found in PATH).'));
        } else {
          // Initialize repo
          await runCommandSilent('git', ['init'], { cwd: targetDir });
          await runCommandSilent('git', ['add', '-A'], { cwd: targetDir });

          // Check if git user name and email are configured
          let hasUserConfig = true;
          try {
            const name = await runCommandSilent('git', ['config', 'user.name'], { cwd: targetDir });
            const email = await runCommandSilent('git', ['config', 'user.email'], { cwd: targetDir });
            if (!name.trim() || !email.trim()) {
              hasUserConfig = false;
            }
          } catch {
            hasUserConfig = false;
          }

          // Setup commit options with environment overrides if user identity is not set
          const commitOptions = { cwd: targetDir };
          if (!hasUserConfig) {
            commitOptions.env = {
              ...process.env,
              GIT_AUTHOR_NAME: 'Laravelte Bot',
              GIT_AUTHOR_EMAIL: 'bot@laravelte.dev',
              GIT_COMMITTER_NAME: 'Laravelte Bot',
              GIT_COMMITTER_EMAIL: 'bot@laravelte.dev'
            };
          }

          // Commit initial scaffolding
          await runCommandSilent('git', ['commit', '-m', 'Initial commit'], commitOptions);

          // Rename default branch to main
          try {
            await runCommandSilent('git', ['branch', '-M', 'main'], { cwd: targetDir });
          } catch {
            // older git versions might fail on branch -M, ignore silently
          }

          gitSpinner.stop(pc.green('Git repository initialized and committed.'));
        }
      } catch (err) {
        gitSpinner.stop(pc.yellow(`Skipped Git initialization: ${err.message}`));
      }
    }

    // 11. Custom Outro
    const pm = detectPackageManager();
    clack.outro(pc.green(pc.bold('Project setup complete! ✨')));
    
    console.log(pc.bold('Next steps to get started:'));
    if (missing.length > 0) {
      console.log(pc.yellow('  ⚠ Install PHP 8.2+ and Composer first (see hints above).'));
    }
    console.log(`  1. Run: ${pc.cyan(`cd ${projectName}`)}`);
    if (!runInstall) {
      console.log(`  2. Run: ${pc.cyan('composer install')}`);
      console.log(`  3. Run: ${pc.cyan('php artisan app:setup')}`);
      console.log(`  4. Run: ${pc.cyan('composer dev')}`);
    } else {
      console.log(`  2. Run: ${pc.cyan('composer dev')}`);
    }
    console.log();
    clack.log.info(pc.dim('Tip: If using SvelteKit, open the frontend port printed under [sveltekit] in your console (typically http://localhost:5173 or 5174). Laravel on port 8000 serves strictly as the API.'));
    console.log();
    
  } catch (err) {
    clack.log.error(pc.red(`\nSetup failed: ${err.message}\n`));

    // Smart Cleanup: Ask the user if they want to delete files or keep them.
    if (fs.existsSync(targetDir)) {
      let cleanupAction = 'keep';
      if (downloadCompleted) {
        const cleanupChoice = await clack.select({
          message: 'What would you like to do with the partial project directory?',
          options: [
            { value: 'keep', label: `Keep the directory "${projectName}" (recommended to debug/manually run setup)`, hint: 'keep files' },
            { value: 'delete', label: `Delete the directory "${projectName}"`, hint: 'remove files' }
          ],
          initialValue: 'keep'
        });
        
        cleanupAction = clack.isCancel(cleanupChoice) ? 'keep' : cleanupChoice;
      } else {
        // If we didn't even download the template successfully, clean up.
        cleanupAction = 'delete';
      }

      if (cleanupAction === 'delete') {
        const cleanupSpinner = clack.spinner();
        cleanupSpinner.start('Cleaning up folder...');
        fs.rmSync(targetDir, { recursive: true, force: true });
        cleanupSpinner.stop(`Deleted directory: ${pc.yellow(projectName)}`);
      } else {
        clack.log.info(pc.yellow(`Project files kept at: ${targetDir}`));
      }
    }

    process.exit(1);
  }
}

main().catch(err => {
  console.error(pc.red('Fatal unexpected error occurred:'));
  console.error(err);
  process.exit(1);
});
