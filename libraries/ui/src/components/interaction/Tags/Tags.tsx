import type { PropsWithChildren } from 'react'

import Tag, { TagProps } from './Tag'

import './Tags.css'

export type TagsProps = {
  tags: Array<TagProps | string>,
}

/**
 * Renders tags.
 */
const Tags = ({
  tags: givenTags = [],
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
            onClick={params?.onClick}
          />
        )
      })}
    </div>
  )
}

export default Tags
