import { CSSProperties, useState } from 'react'
import type { Meta } from '@storybook/react'

import PhotoViewerLayer from '../../features/PhotoViewer/PhotoViewerLayer'
import Thumb from './Thumb'

import sampleData from './sample.json'

const meta = {
  title: 'Interaction/Thumb',
  component: Thumb,
  argTypes: {},
} satisfies Meta<typeof Thumb>

const parentStyles: CSSProperties = {
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'fixed',
}

export const PeekEnabled = () => {
  return (
    <div style={{ ...parentStyles }}>
      <Thumb
        w="240px"
        h="180px"
        src={sampleData[6].thumbs.small}
        peekImage={sampleData[6].public}
        peek={true}
      />
    </div>
  )
}

export const PeekDisabled = () => {
  return (
    <div style={{ ...parentStyles }}>
      <Thumb
        w="240px"
        h="180px"
        src={sampleData[4].thumbs.small}
        peek={false}
      />
    </div>
  )
}

export const Selectable = () => {
  const [selected, setSelected] = useState(false)
  return (
    <div style={{ ...parentStyles }}>
      <Thumb
        w="240px"
        h="180px"
        src={sampleData[9].thumbs.small}
        peek={true}
        selectable={true}
        selected={selected}
        onSelect={() => {
          setSelected(true)
        }}
        onDeselect={() => {
          setSelected(false)
        }}
      />
    </div>
  )
}

export const PeekWithMetadata = () => {
  return (
    <div style={{ ...parentStyles }}>
      <Thumb
        w="240px"
        h="180px"
        src={sampleData[10].thumbs.small}
        peekImage={sampleData[10].public}
        peek={true}
      >
        <>
          <p>leaf.jpg</p>
          <p>600x800px</p>
        </>
      </Thumb>
    </div>
  )
}

export const WithPhotoViewer = () => {
  return (
    <div>
      <PhotoViewerLayer />
      <div style={{ ...parentStyles }}>
        <Thumb
          w="240px"
          h="180px"
          src={sampleData[0].thumbs.small}
          peekImage={sampleData[0].public}
          peek={true}
          photoViewerInitiallyOpen={false}
          photoViewerProps={{
            photos: [sampleData[0].public],
          }}
        >
          <>
            <p>3d.jpg</p>
          </>
        </Thumb>
      </div>
    </div>
  )
}

export const LazyLoad = () => {
  const [selected, setSelected] = useState([])
  const arr = Array.from({ length: 1000 }).map(() => sampleData[0].public)

  return (
    <div style={{
      ...parentStyles,
      flexWrap: 'wrap',
      gap: 10,
      overflow: 'scroll',
    }}>
      <PhotoViewerLayer />
      {arr.map((item, i) => {
        return (
          <Thumb
            key={`item-${i}`}
            w="240px"
            h="180px"
            src={sampleData[1].thumbs.small}
            peekImage={sampleData[1].public}
            peek={true}
            selectable={true}
            selected={selected.includes(i)}
            onSelect={() => {
              const copy = [...selected]
              copy.push(i)
              setSelected(copy)
            }}
            onDeselect={() => {
              const copy = [...selected]
              copy.splice(copy.indexOf(i), 1)
              setSelected(copy)
            }}
            photoViewerProps={{
              photos: arr,
            }}
          />
        )
      })}
    </div>
  )
}

export default meta
