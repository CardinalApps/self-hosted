# Quick Start

This monorepo is built with pnpm and Turborepo.

## 1. Set up your computer

Before beginning, your machine will need:

1. Node.js >= 18.17.0
2. Docker
3. pnpm
    1. Install it by running `npm i -g pnpm@10` after installing Node.js

## 2. Install the monorepo dependencies

  ```bash
  # In the monorepo root
  pnpm i

  # Then start the development databases
  cd compose/databases/
  docker compose up -d
  ```

## 3. Run the development apps

  ```bash
  # Back in the monorepo root, start all apps in development mode
  pnpm dev
  ```

  Some apps may require environment variables. Those apps will have a
  `.env.template` file that you can copy, and the app runtime should tell you
  which variables are missing.
