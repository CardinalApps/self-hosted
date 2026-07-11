# Quick Start

This monorepo is built with pnpm and Turborepo.

## 1. Set up your computer

Before beginning, your machine will need:

1. Node.js >= 22
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
  pnpm i --frozen-lock-file

  # Interactive launch
  pnpm dev:oss
  ```

  Some apps may require environment variables. Those apps will have a
  `.env.template` file that you can copy, and the app logs should tell you
  which variables are missing.
