export const MODE_DEV = 'dev'
export const MODE_PROD = 'prod'

/**
 * Determines the mode. Can be `dev` or `prod`.
 *
 * @returns {object}
 */
export function getMode(force?) {
  if (force) {
    return force
  }

  // 192.168.*.* and 10.*.*.* are actually considered prod because that's where users self-host
  if (window.location.href.includes('http://localhost') || window.location.href.includes('http://127.0.0.1')) {
    return MODE_DEV
  } else {
    return MODE_PROD
  }
}
