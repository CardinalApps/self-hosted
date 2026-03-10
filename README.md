# Self-Hosted Cardinal Apps

This monorepo contains the source code for all self-hosted [Cardinal
apps](https://cardinalapps.io).

Made with:

- TypeScript
- React (Vite)
- Redux (RTK)
- Node.js (Nest.js)

## Quick start

See [Quick Start](/docs/quick-start.md) for instructions on how to run this code.

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
| `products`         | `/libraries` | -               | Data about Cardinal's products                                                       |
| `topology`         | `/libraries` | -               | Infrastructure topology                                                              |
| `types`            | `/libraries` | -               | Not used                                                                             |
| `ui`               | `/libraries` | `3099`          | UI layer & React component library with Storybook                                    |
| `media`            | `/servers`   | `3080`, `24800` | Monolithic [Media Server](https://cardinalapps.io/cardinal-media-server)             |

## About This Repository

<details>
  <summary>How do I use this repository as someone that wants to build an app that uses Cardinal's APIs?</summary>
  <p>You should develop against the beta release instead of this repo. Use this repo only if you want to develop against latest.</p>
</details>

<details>
  <summary>Was this made with AI?</summary>
  <p>No. This is, for better or for worse, all written by a human. Vive la révolution!</p>
</details>

<details>
  <summary>How do I build the apps?</summary>
  <p>The official builds that are on <a href="https://hub.docker.com/r/cardinalapps/media-server">Docker Hub</a> are built and published by Cardinal's CI. While you can definitely build and use Docker images using this repository, doing so is out of scope of this repository and there is no orchestration available for it beyond running the pnpm commands yourself one by one.</p>
  <p>Running self-built containers is not offically supported, and this repository may change at any time in ways that break self-build setups.</p>
</details>

<details>
  <summary>Can I use this to verify the integrity of the public builds?</summary>
  <p>Sort of? The Media Server binary that you can build with this repository will exactly match the one that is shipped in the public Docker builds.</p>
  <p>But, like other CI things, this is out of scope of this repository.</p>
</details>

<details>
  <summary>Something isn't working</summary>
  <p>All self-hosted features should work in the development environment. But since this repo only runs self-hosted apps, Cardinal's cloud services will not function here (you won't be able to log into your Cardinal account in the dev env).</p>
  <p>If you are still having issues with something that should work locally then please create a GitHub issue.</p>
</details>

<details>
  <summary>Why so few commits?</summary>
  <p>This repository was created in March 2026. Prior to that, this project was closed source. The first commit in this repo is a squashed commit containing all the work since the beginning.</p>
</details>

<details>
  <summary>Contributing</summary>
  <ul>
    <li><strong>Suggestions:</strong> Create a post on the forums or create a GitHub issue.</li>
    <li><strong>Bug Reports:</strong> Create a GitHub issue. For a serious vulnerability, please disclose responsibly using the email on the <a href="https://cardinalapps.io/contact">Contact page</a>.</li>
    <li><strong>Code Contributions:</strong> Public contributions are currently closed. If you particularly like this project then come say hello in the forums.</li>
  </ul>
</details>

## License

[Elastic License 2.0](/LICENSE)

Copyright Cardinal Apps Inc. 2023 - 2026
