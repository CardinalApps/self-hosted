// Errors thrown by Remote Access consumers (clients, the Media Server's
// ConnectSDK, the Remote Access Server itself). Every class extends Error
// and accepts the standard ES2022 `{ cause }` options bag.

class RemoteAccessError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options)
    this.name = new.target.name
    // Restore prototype chain for environments that transpile `extends Error`
    // (esp. older TS targets — defensive even though ES2021 generally handles
    // it).
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

// Matchmaker says the requested instanceId is offline (no live WSS).
export class ServerOfflineError extends RemoteAccessError {}

// Matchmaker has never seen the requested instanceId.
export class ServerNotFoundError extends RemoteAccessError {}

// Couldn't reach the matchmaker itself (network, 5xx).
export class MatchmakerUnavailableError extends RemoteAccessError {}

// User has exhausted their relay bandwidth quota.
export class QuotaExceededError extends RemoteAccessError {}

// User has too many concurrent relay sessions open.
export class RelayLimitError extends RemoteAccessError {}

// Probe-header HMAC didn't verify (wrong key, stale timestamp, malformed).
export class InvalidProbeSignatureError extends RemoteAccessError {}

// A relay session was aborted mid-stream (client disconnect, hard ceiling,
// quota tripped during the session, etc.).
export class RelayAbortedError extends RemoteAccessError {}
