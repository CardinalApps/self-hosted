# Self-Hosted Cardinal Apps

This monorepo contains the source code for all self-hosted [Cardinal
apps](https://cardinalapps.io).

Made with:

- TypeScript
- Node.js (Nest.js)
- React (Vite)
- Redux (RTK)
- SQLite and PostgreSQL

### Packages

These are the packages in this monorepo.

| Package            | Directory    | Dev Port        | Description                                                                          |
|--------------------|--------------|-----------------|--------------------------------------------------------------------------------------|
| `admin-web`        | `/apps`      | `3090`          | [Cardinal Media Server Admin](https://cardinalapps.io/cardinal-media-server) web app |
| `cinema-web`       | `/apps`      | `3096`          | [Cardinal Cinema](https://cardinalapps.io/cardinal-cinema) web app                   |
| `music-web`        | `/apps`      | `3094`          | [Cardinal Music](https://cardinalapps.io/cardinal-music) web app                     |
| `photos-web`       | `/apps`      | `3092`          | [Cardinal Photos](https://cardinalapps.io/cardinal-photos) web app                   |
| `eslint`           | `/config`    | -               | ESLint configurations                                                                |
| `typescript`       | `/config`    | -               | TypeScript configurations                                                            |
| `access-control`   | `/libraries` | -               | Access Control (RBAC) core                                                           |
| `app-settings`     | `/libraries` | -               | App settings and utils                                                               |
| `e2e-helpers`      | `/libraries` | -               | Used for end-to-end testing                                                          |
| `products`         | `/libraries` | -               | Data about Cardinal's products                                                       |
| `topology`         | `/libraries` | -               | Infrastructure topology                                                              |
| `ui`               | `/libraries` | `3099`          | UI layer & React component library with Storybook                                    |
| `media`            | `/servers`   | `3080`, `24800` | Monolithic [Media Server](https://cardinalapps.io/cardinal-media-server)             |

## About This Repository

<details>
  <summary>How does this repo work?</summary>
  <p>Cardinal uses an internal monorepo that is a mix of open and closed source code. This monorepo, the self-hosted monorepo, contains only the open source code, cherry-picked from the internal repo into this repo.</p>
  <p>This repo was created in March 2026, that's why the commit history only goes back that far despite the development of the internal repo going back to 2022.</p>
  <p>Every few days to few weeks, a CI job within the internal repo will extract all of the open source code and create a PR to update the self-hosted repo. This operation brings over the code, commit messages, and authorship without any alterations.</p>
  <p>The <a href="https://github.com/CardinalApps/self-hosted/commit/dfbd64ef15e02999026a6f4597d2bd31514c0135" target="_blank">second commit</a> in this repo is a squashed commit containing all the self-hosted code from the internal repo since 2022. That one commit adds 270k lines of code, and it is also the last commit before AI coding assistants were allowed to contribute.</p>
  <p>It's normal that sometimes a commit message will mention packages from the internal repo that do not exist here.</p>
</details>

<details>
  <summary>How do I build the apps?</summary>
  <p>The official builds that are on <a href="https://hub.docker.com/r/cardinalapps/media-server" target="_blank">Docker Hub</a> are built and published by Cardinal's CI using the internal repo. While you can definitely build and run Docker images using the self-hosted code, doing so is out of scope of this repository and there is no orchestration available for it beyond running the pnpm commands yourself one by one.</p>
  <p>Running self-built containers is not offically supported, and this repository may change at any time in ways that break self-build setups.</p>
</details>

<details>
  <summary>How is AI used with this project?</summary>
  <p>From 2022 to March 2026, all of the code was written by @briiian.</p>
  <p>As of March 2026, Claude is used for:</p>
  <ol>
    <li>Testing: unit testing, integration testing, end-to-end testing with Playwright, and pentesting.</li>
    <li>Documentation: as an author of help articles. When <a href="https://help.cardinalapps.io/guides/cardinal-music/music-tracks">a page on the help site</a> is authored by Claude, it is made clear to the reader.</li>
    <li>Development: as a fully TDD real-time pair programmer. All code is reviewed by people before being merged.</li>
  </ol>
</details>

<details>
  <summary>Contributing</summary>
  <ul>
    <li><strong>Suggestions:</strong> Create a post on <a href="https://itsasmall.world/c/cardinal-media-server" target="_blank">itsasmall.world</a>, or create a GitHub issue.</li>
    <li><strong>Bug Reports:</strong> Create a GitHub issue. For a serious vulnerability, please disclose responsibly using the email on the <a href="https://cardinalapps.io/contact" target="_blank">Contact page</a>.</li>
    <li><strong>Code Contributions:</strong> Public contributions are currently closed. If you particularly like this project then come say hello on <a href="https://itsasmall.world/c/cardinal-media-server" target="_blank">itsasmall.world</a>.</li>
  </ul>
</details>

## Quick Start

<details>
  <summary>Run the self-hosted dev env</summary>
  
  <p><strong>1. Before beginning, your machine will need:</strong></p>

  <ol>
    <li>Node.js >= 22</li>
    <li>Docker</li>
    <li>pnpm (install it by running <code>npm i -g pnpm@10</code> after installing Node.js)</li>
  </ol>

  <p><strong>2. Start the dev databases:</strong></p>

  <pre>
cd compose/databases/
docker compose up -d</pre>

  <p><strong>3. Install all dependencies:</strong></p>

  <pre>pnpm i --frozen-lock-file</pre>

  <p><strong>4. Start all apps:</strong></p>

  <pre>pnpm dev:oss</pre>

Some apps may require environment variables. Those apps will have a
`.env.template` file that you can copy, and the app logs should tell you
which variables are missing.
</details>

## License

[Licensed under DISL (dualinterestlicense.com)](/LICENSE)

Copyright Cardinal Apps Inc. 2023 - 2026
