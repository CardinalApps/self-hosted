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
  <summary>How do I use this as someone that wants to build an app that uses Cardinal's APIs?</summary>
  <p>You should develop against the <code>beta</code> or <code>latest</code> release available on Docker Hub instead.</p>
</details>

<details>
  <summary>How do I build the apps?</summary>
  <p>The official builds that are on <a href="https://hub.docker.com/r/cardinalapps/media-server" target="_blank">Docker Hub</a> are built and published by Cardinal's CI. While you can definitely build and use Docker images using this repository, doing so is out of scope of this repository and there is no orchestration available for it beyond running the pnpm commands yourself one by one.</p>
  <p>Running self-built containers is not offically supported, and this repository may change at any time in ways that break self-build setups.</p>
</details>

<details>
  <summary>Can I use this to verify the integrity of the public builds?</summary>
  <p>Sort of? The Media Server binary that you can build with this repository will exactly match the one that is shipped in the public Docker builds.</p>
  <p>But, like other CI things, this is out of scope of this repository.</p>
</details>

<details>
  <summary>Is this made with AI?</summary>
  <p>Guidelines for working with AI coding assistants can be found in the <a href="https://github.com/CardinalApps/self-hosted/blob/main/docs/contributors.md#working-with-ai" target="_blank">Contributors docs</a>. The first AI code was added in 2026. All code prior to that was pure human.</p>
</details>

<details>
  <summary>About the commit history</summary>
  <p>This repository was created in March 2026. Prior to that, this project was closed source.</p>
  <p>In 2023 this project began in pure JavaScript in separate repositories, and by 2026 it had become the fully TypeScript monorepo that is seen here. During those years the code went through a few different repositories, so there is unfortunately no single linear history of commits.</p>
  <p>The second commit in this repository is a squashed commit containing all the self-hosted code since the beginning. That one commit adds 270k lines of code, and it is also the last commit before AI coding assistants were allowed to contribute.</p>
</details>

<details>
  <summary>Contributing</summary>
  <ul>
    <li><strong>Suggestions:</strong> Create a post on the forums or create a GitHub issue.</li>
    <li><strong>Bug Reports:</strong> Create a GitHub issue. For a serious vulnerability, please disclose responsibly using the email on the <a href="https://cardinalapps.io/contact" target="_blank">Contact page</a>.</li>
    <li><strong>Code Contributions:</strong> Public contributions are currently closed. If you particularly like this project then come say hello in the <a href="https://cardinal.discourse.group" target="_blank">Forums</a> or on <a href="https://reddit.com/r/CardinalApps" target="_blank">Reddit<a/>.</li>
  </ul>
</details>

## License

[Elastic License 2.0](/LICENSE)

Copyright Cardinal Apps Inc. 2023 - 2026
