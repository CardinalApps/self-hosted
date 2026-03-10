/**
 * Recursively flattens an object
 */
export function flattenObject(ob) {
  const flat = {}

  for (const i in ob) {
    if (!Object.prototype.hasOwnProperty.call(ob, i)) continue
    // eslint-disable-next-line no-prototype-builtins
    if (!ob.hasOwnProperty(i)) continue

    if ((typeof ob[i]) === 'object' && ob[i] !== null) {
      const flatObject = flattenObject(ob[i])

      for (const x in flatObject) {
        // eslint-disable-next-line no-prototype-builtins
        if (!flatObject.hasOwnProperty(x)) continue
        flat[i + '.' + x] = flatObject[x]
      }
    } else {
      flat[i] = ob[i]
    }
  }

  return flat
}
