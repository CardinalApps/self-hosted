import * as fs from 'fs'
import * as os from 'os'

/**
 * Whether this process looks like it is running on a Docker bridge network,
 * where the container is sealed off from the LAN and the router. Both signals
 * are needed: host networking also reports `/.dockerenv`, and a plain host can
 * legitimately use 172.16/12.
 */
export function looksLikeDockerBridge(
  inContainer = fs.existsSync('/.dockerenv'),
  interfaces = os.networkInterfaces(),
): boolean {
  if (!inContainer) {
    return false
  }

  const addresses = Object.values(interfaces)
    .flatMap((entries) => entries ?? [])
    .filter((entry) => !entry.internal && entry.family === 'IPv4')
    .map((entry) => entry.address)

  return addresses.length > 0 && addresses.every(isDockerBridgeAddress)
}

// Whether an IPv4 address is inside 172.16.0.0/12, Docker's default bridge pool
export function isDockerBridgeAddress(address: string): boolean {
  const octets = address.split('.').map(Number)

  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) {
    return false
  }

  return octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31
}
