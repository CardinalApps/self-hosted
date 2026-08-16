import * as net from 'net'

/* Every TLS connection opens with a handshake record, whose first byte is 0x16. No HTTP request
   can start with it, which is what makes one byte enough to tell the two apart. */
export const TLS_HANDSHAKE_FIRST_BYTE = 0x16

/* A connection that has not said anything yet holds an accepted socket, so it cannot be allowed to
   wait forever. Generous enough for a slow client on a bad link to finish sending one byte. */
export const PEEK_TIMEOUT_MS = 5000

export type MuxHandlers = {
  onTls: ((socket: net.Socket) => void) | null,
  onPlain: (socket: net.Socket) => void,
}

/**
 * Sends an accepted socket to the half of the server that speaks its protocol,
 * decided by the first byte the client sends. The byte is put back before the
 * socket is handed over, so the receiving half reads the connection from its
 * very start. With no TLS half registered, a handshake is closed rather than
 * answered with an HTTP error nothing would be able to read.
 */
export function routeSocket(socket: net.Socket, handlers: MuxHandlers, peekTimeoutMs = PEEK_TIMEOUT_MS): void {
  const onReadable = () => {
    const chunk = socket.read(1) as Buffer | null

    // 'readable' also fires for an end-of-stream with nothing buffered
    if (chunk === null) {
      socket.once('readable', onReadable)
      return
    }

    stopWaiting()
    socket.unshift(chunk)

    if (chunk[0] !== TLS_HANDSHAKE_FIRST_BYTE) {
      handlers.onPlain(socket)
      return
    }

    if (!handlers.onTls) {
      socket.destroy()
      return
    }

    handlers.onTls(socket)
  }

  const onHangup = () => {
    stopWaiting()
    socket.destroy()
  }

  const timer = setTimeout(onHangup, peekTimeoutMs)
  timer.unref?.()

  function stopWaiting(): void {
    clearTimeout(timer)
    socket.off('readable', onReadable)
    socket.off('end', onHangup)
    socket.off('error', onHangup)
  }

  socket.once('readable', onReadable)
  socket.once('end', onHangup)
  socket.once('error', onHangup)
}
