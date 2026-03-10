import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import DirectoryTree, { TreeNode } from './DirectoryTree'

const meta = {
  title: 'Interaction/DirectoryTree',
  component: DirectoryTree,
  argTypes: {},
} satisfies Meta<typeof DirectoryTree>
type Story = StoryObj<typeof meta>

const initialPathsShort: TreeNode = {
  "path": "/photos",
  "name": "photos",
  "size": 600,
  "type": "directory",
  "children": [
    {
      "path": "/photos/winter",
      "name": "winter",
      "size": 200,
      "type": "directory",
    },
  ],
}
const initialPaths: TreeNode = {
  "path": "/photos",
  "name": "photos",
  "size": 600,
  "type": "directory",
  "children": [
    {
      "path": "/photos/summer",
      "name": "summer",
      "size": 400,
      "type": "directory",
      "children": [
        {
          "path": "/photos/summer/june",
          "name": "june",
          "size": 400,
          "type": "directory",
          "children": [
            {
              "path": "/photos/summer/june/windsurf.jpg",
              "name": "windsurf.jpg",
              "size": 400,
              "type": "file",
              "extension": ".jpg",
            },
          ],
        },
      ],
    },
    {
      "path": "/photos/winter",
      "name": "winter",
      "size": 200,
      "type": "directory",
      "children": [
        {
          "path": "/photos/winter/january",
          "name": "january",
          "size": 200,
          "type": "directory",
          "children": [],
        },
      ],
    },
  ],
}
const expandedPaths: TreeNode[] = [
  {
    "path": "/photos/winter/january/ski.png",
    "name": "ski.png",
    "size": 100,
    "type": "file",
    "extension": ".png",
  },
  {
    "path": "/photos/winter/january/snowboard.jpg",
    "name": "snowboard.jpg",
    "size": 100,
    "type": "file",
    "extension": ".jpg",
  },
]

export const Default: Story = {
  args: {
    initialPaths: initialPaths,
    style: { display: 'inline-flex' },
    onSelect: (child, tree) => {
      console.log('Selected', child, tree)
    },
    onExpand: (child, tree, cb) => {
      console.log('Expanded', child, tree)
      cb(expandedPaths)
    },
  },
}

export function ExternalChange() {
  const [initialState, setInitialState] = useState(initialPaths)
  return (
    <>
      <DirectoryTree
        initialPaths={initialState}
        style={{ display: 'inline-flex' }}
        onClick={(item, tree) => console.log('Clicked', item, tree)}
        onExpand={(child, tree, cb) => {
          console.log('Expanded', child, tree)
          cb(expandedPaths)
        }}
      />
      <div style={{ paddingTop: 20 }}>
        <button onClick={() => setInitialState(initialPathsShort)}>Change initial state externally</button>
      </div>
    </>
  )
}

export const SelectDirs: Story = {
  args: {
    title: "Choose a folder",
    initialPaths: initialPaths,
    selectDirectory: true,
    style: { display: 'inline-flex' },
    onSelect: (child, tree) => {
      console.log('Selected', child, tree)
    },
    onExpand: (child, tree, cb) => {
      console.log('Expanded', child, tree)
      cb(expandedPaths)
    },
  },
}

export const SelectFiles: Story = {
  args: {
    title: "Choose folders and files",
    multi: true,
    initialPaths: initialPaths,
    selectDirectory: true,
    selectFile: true,
    style: { display: 'inline-flex' },
    onSelect: (child, tree) => {
      console.log('Selected', child, tree)
    },
    onExpand: (child, tree, cb) => {
      console.log('Expanded', child, tree)
      cb(expandedPaths)
    },
  },
}

export function RealMusic() {
  return (
    <>
      <p>Uses real music from the dev home server if you are logged in here.</p>
      <DirectoryTree
        rootDir="music"
        style={{ display: 'inline-flex' }}
        onSelect={(child, tree) => {
          console.log('Selected', child, tree)
        }}
      />
    </>
  )
}

export default meta
