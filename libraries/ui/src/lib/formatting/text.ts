export const pluralize = (num, singular, plural) => {
  if (num === 1) {
    return singular
  } else {
    return plural
  }
}
