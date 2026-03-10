import slugify from 'slugify'

export const slug = (path: string): string => {
  return slugify(path, {
    lower: true,
  })
}
