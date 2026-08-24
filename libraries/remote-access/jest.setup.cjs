// Node 18 + Jest 29 runs each test file in a fresh VM context that doesn't
// inherit `globalThis.crypto`. Bridge the Web Crypto API in so isomorphic
// code that targets `crypto.subtle` works under Jest the same way it does
// in Node, browsers, and Cloudflare Workers.
if (typeof globalThis.crypto === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  globalThis.crypto = require('node:crypto').webcrypto
}
