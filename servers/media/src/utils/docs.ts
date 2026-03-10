export const enumToCodeTags = (myEnum: Record<string, unknown>): string => {
  return Object.values(myEnum).map((v) => `\`${v}\``).join(' ')
}
