import { Logger } from '@nestjs/common'

/**
 * There are some naughty characters in the Google Photos JSON.
 *
 * The usual suspects:
 * U+00E2 LATIN SMALL LETTER A WITH CIRCUMFLEX character (&#x00E2;)
 * U+0080 <control> character (&#x0080;)
 * U+00AF MACRON character (&#x00AF;)
 *
 * `+` has to survive, because it carries the sign of a UTC offset. Replacing it
 * does not make the string unparseable, which is what makes dropping it so
 * dangerous: `Date.parse` still accepts "GMT 0100", but ignores the orphaned
 * offset and reads the wall time as UTC, moving the instant by the offset. That
 * silently shifted every Exif photo date on servers east of Greenwich.
 */
export function sanitizeDateString(string: string): string {
  if (typeof string !== 'string') {
    Logger.error(`sanitizeDateString() received data of type ${typeof string} instead of a string.`, 'Indexing')
    return ''
  }
  return string.replace(/[^a-zA-Z0-9,:\-+()]/g, ' ')
}
