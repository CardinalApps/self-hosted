# @cardinalapps/remote-access

Isomorphic protocol library shared by the Cardinal Remote Access Server, the Cardinal Media Server, and any client (browser / Node / Cloudflare Worker) that participates in the Remote Access protocol.

Phase 1 ships:

- TypeScript types for the WSS control-channel messages, negotiation API responses, and binary relay frames.
- Header names, message-type strings, default ports, WSS close codes, protocol version.
- Error classes thrown by Remote Access consumers.

Runtime helpers (HMAC sign/verify, binary frame codec, the `negotiateConnection()` function) land in later tickets.

## Consuming the package

Like the other workspace libraries, consumers import from the CJS build:

```ts
import { HEADERS, ServerOfflineError } from '@cardinalapps/remote-access/dist/cjs'
```

## Scripts

- `pnpm build` — compile TypeScript to `dist/cjs/` and drop the CJS-flavoured `package.json` so Node treats the output as CommonJS.
- `pnpm typecheck` — type-check only.
- `pnpm test` — Jest unit tests.
- `pnpm lint` — ESLint.
