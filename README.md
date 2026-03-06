# create-laravelte

Scaffold a new **Laravel + Svelte** project with a single command.

```bash
npm create laravelte my-app
```

## What it does

1. Checks that PHP 8.2+ and Composer are installed
2. Downloads the [laravel-svelte-starter](https://github.com/kuddusclank/laravel-svelte-starter) template
3. Runs `composer install`
4. Copies `.env.example` to `.env`
5. Launches an interactive setup wizard (`php artisan app:setup`)

The setup wizard walks you through:

- **Framework selection** — Svelte with Inertia.js or SvelteKit
- **Email verification** — Enable or disable
- **SSO providers** — Configure GitHub, Facebook, X, Google, and/or Apple OAuth
- **Credential entry** — Client ID and Client Secret for each selected provider

Once complete, everything is configured — database migrated, dependencies installed, assets built.

## Usage

```bash
# With npm
npm create laravelte my-app

# With npx
npx create-laravelte my-app

# Then start developing
cd my-app
composer dev
```

## Prerequisites

- **Node.js** 18+
- **PHP** 8.2+
- **Composer**

## What you get

- Laravel 12 with Fortify authentication
- Svelte 5 with TypeScript
- Tailwind CSS v4 with Skeleton UI components
- Login, registration, password reset, email verification
- Two-factor authentication (TOTP)
- Social login (GitHub, Facebook, X, Google, Apple)
- Settings pages (profile, password, 2FA, appearance, account deletion)
- Dark/light/system theme toggle
- SQLite database (ready to use, no setup needed)

See the full documentation in the [laravel-svelte-starter repo](https://github.com/kuddusclank/laravel-svelte-starter).

## License

MIT
