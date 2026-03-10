/**
 * Do not reuse codes.
 */
export enum HelpCodes {
  // Cardinal Media Server - General
  ERR_CHS_0009 = 'ERR_CHS_0009',
  ERR_CHS_0010 = 'ERR_CHS_0010',
  ERR_CHS_0011 = 'ERR_CHS_0011',
  ERR_CHS_0012 = 'ERR_CHS_0012',
  ERR_CHS_0013 = 'ERR_CHS_0013',
  ERR_CHS_0014 = 'ERR_CHS_0014',
  ERR_CHS_0015 = 'ERR_CHS_0015',
  ERR_CHS_0016 = 'ERR_CHS_0016',
  ERR_CHS_0017 = 'ERR_CHS_0017',
  ERR_CHS_0018 = 'ERR_CHS_0018',

  // Cardinal Media Server - Indexing
  ERR_CHS_0100 = 'ERR_CHS_0100',

  // Cardinal Media Server - Jobs
  ERR_CHS_0200 = 'ERR_CHS_0200',

  // Cardinal Photos - General
  ERR_CP_0010 = 'ERR_CP_0010',
}

export function helpCode(code: string) {
  return `Help Code: ${HelpCodes[`ERR_CHS_${code}`]}. More information: help.cardinalapps.io/help-codes/ERR_CHS_${code}`
}
