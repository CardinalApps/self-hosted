# Quick Start

This monorepo is built with pnpm and Turborepo.

## 1. Set up your computer

Before beginning, your machine will need:

1. Node.js >= 18.17.0
2. Docker
3. pnpm
    1. Install it by running `npm i -g pnpm@10` after installing Node.js

## 2. Start the dev databases

  ```bash
  cd compose/databases/
  docker compose up -d
  ```

## 3. Run the dev env

Run these in the root of the monorepo.

  ```bash
  # Install all dependencies
  pnpm i

  # Build all packages
  pnpm build

  # Interactive launch
  pnpm dev

  # Optional: launch shortcuts
  pnpm dev -yyn
  ```

  Some apps may require environment variables. Those apps will have a
  `.env.template` file that you can copy, and the app runtime should tell you
  which variables are missing.
