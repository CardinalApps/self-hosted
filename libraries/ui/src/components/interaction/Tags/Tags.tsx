import type { PropsWithChildren } from 'react'

import Tag, { TagProps, TagSize } from './Tag'

import './Tags.css'

export type TagsProps = {
  tags: Array<TagProps | string>,
  /** Applied to every tag that doesn't set its own size. */
  size?: TagSize,
  /** Applied to every tag that doesn't set its own. */
  glass?: boolean,
}

/**
 * Renders tags.
 */
const Tags = ({
  tags: givenTags = [],
  size,
  glass,
}: PropsWithChildren<TagsProps>) => {
  const makeParams = (givenTag) => {
    if (typeof givenTag === 'string') {
      return {
        label: givenTag,
      }
    } else {
      return { ...givenTag }
    }
  }

  return (
    <div className="tags">
      {givenTags.map((givenTag) => {
        const params = makeParams(givenTag)
        return (
          <Tag
            key={params.label}
            label={params.label}
            href={params.href}
            icon={params?.icon}
            color={params?.color}
            size={params?.size ?? size}
            glass={params?.glass ?? glass}
            onClick={params?.onClick}
          />
        )
      })}
    </div>
  )
}

export default Tags
