import { Logger } from '@nestjs/common'

/**
 * There are some naughty characters in the Google Photos JSON.
 * 
 * The usual suspects:
 * U+00E2 LATIN SMALL LETTER A WITH CIRCUMFLEX character (&#x00E2;)
 * U+0080 <control> character (&#x0080;)
 * U+00AF MACRON character (&#x00AF;)
 */
export function sanitizeDateString(string: string): string {
  if (typeof string !== 'string') {
    Logger.error(`sanitizeDateString() received data of type ${typeof string} instead of a string.`, 'Indexing')
    return ''
  }
  return string.replace(/[^a-zA-Z0-9,:\-()]/g, ' ')
}
