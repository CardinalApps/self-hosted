import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { Meta } from '@storybook/react'
import { RootState } from '../../../store'

import Select from './Select'
import { settingsActions } from '../../../store/slices/settings'
import { useAppSelector } from '../../../hooks/useAppSelector'

const meta = {
  title: 'Forms/Select',
  component: Select,
  argTypes: {},
} satisfies Meta<typeof Select>

export const MultiSelect = () => {
  const field = 'dropdown-multi'
  const dispatch = useDispatch()
  const storeValue = useAppSelector((state) => state.settings?.current?.[field]) as string
  return (
    <Select
      name={field}
      value={storeValue}
      selectedPrefix={'Selected: '}
      label={'Choose a thing'}
      onChange={(val) => dispatch(settingsActions.set({ key: field, value: val }))}
      options={[
        {
          label: `Labrador`,
          value: 'dog',
          sentenceCase: 'labrador',
        },
        {
          label: `Standard Issue House Cat`,
          value: 'cat',
        },
        {
          label: `Horse`,
          value: 'horse',
        },
        {
          label: `North American House Hippo`,
          value: 'house-hippo',
        },
        {
          label: `Snek`,
          value: 'snek',
        },
        {
          label: `Labrador`,
          value: 'dog2',
        },
        {
          label: `Standard Issue House Cat`,
          value: 'cat2',
        },
        {
          label: `Horse`,
          value: 'horse2',
        },
        {
          label: `North American House Hippo`,
          value: 'house-hippo2',
        },
        {
          label: `Snek`,
          value: 'snek2',
        },
        {
          label: `Labrador`,
          value: 'dog3',
        },
        {
          label: `Standard Issue House Cat`,
          value: 'cat3',
        },
        {
          label: `Horse`,
          value: 'horse3',
        },
        {
          label: `North American House Hippo`,
          value: 'house-hippo3',
        },
        {
          label: `Snek`,
          value: 'snek3',
        },
      ]}
    />
  )
}

export const MinumumOf3 = () => {
  const field = 'dropdown-multi'
  const [selected, setSelected] = useState(['dog', 'cat', 'horse'])
  return (
    <Select
      name={field}
      value={selected}
      onChange={(val) => setSelected(val)}
      min={3}
      options={[
        {
          label: `Labrador`,
          value: 'dog',
        },
        {
          label: `Standard Issue House Cat`,
          value: 'cat',
        },
        {
          label: `Horse`,
          value: 'horse',
        },
        {
          label: `North American House Hippo`,
          value: 'house-hippo',
        },
        {
          label: `Snek`,
          value: 'snek',
        },
        {
          label: `Labrador`,
          value: 'dog2',
        },
        {
          label: `Standard Issue House Cat`,
          value: 'cat2',
        },
        {
          label: `Horse`,
          value: 'horse2',
        },
        {
          label: `North American House Hippo`,
          value: 'house-hippo2',
        },
        {
          label: `Snek`,
          value: 'snek2',
        },
        {
          label: `Labrador`,
          value: 'dog3',
        },
        {
          label: `Standard Issue House Cat`,
          value: 'cat3',
        },
        {
          label: `Horse`,
          value: 'horse3',
        },
        {
          label: `North American House Hippo`,
          value: 'house-hippo3',
        },
        {
          label: `Snek`,
          value: 'snek3',
        },
      ]}
    />
  )
}

export const MaximumOf3 = () => {
  const field = 'dropdown-multi'
  const [selected, setSelected] = useState()
  return (
    <Select
      name={field}
      value={selected}
      onChange={(val) => setSelected(val)}
      max={3}
      options={[
        {
          label: `Labrador`,
          value: 'dog',
        },
        {
          label: `Standard Issue House Cat`,
          value: 'cat',
        },
        {
          label: `Horse`,
          value: 'horse',
        },
        {
          label: `North American House Hippo`,
          value: 'house-hippo',
        },
        {
          label: `Snek`,
          value: 'snek',
        },
        {
          label: `Labrador`,
          value: 'dog2',
        },
        {
          label: `Standard Issue House Cat`,
          value: 'cat2',
        },
        {
          label: `Horse`,
          value: 'horse2',
        },
        {
          label: `North American House Hippo`,
          value: 'house-hippo2',
        },
        {
          label: `Snek`,
          value: 'snek2',
        },
        {
          label: `Labrador`,
          value: 'dog3',
        },
        {
          label: `Standard Issue House Cat`,
          value: 'cat3',
        },
        {
          label: `Horse`,
          value: 'horse3',
        },
        {
          label: `North American House Hippo`,
          value: 'house-hippo3',
        },
        {
          label: `Snek`,
          value: 'snek3',
        },
      ]}
    />
  )
}

export const SingleSelect = () => {
  const field = 'dropdown-single'
  const dispatch = useDispatch()
  const storeValue = useSelector((state: RootState) => state.settings?.current?.[field]) as string
  return (
    <Select
      name={field}
      value={storeValue}
      multi={false}
      onChange={(val) => dispatch(settingsActions.set({ key: field, value: val }))}
      options={[
        {
          label: `Cardinal Music`,
          value: 'cardinal-music',
        },
        {
          label: `Cardinal Photos`,
          value: 'cardinal-photos',
        },
        {
          label: `Cardinal Cinema`,
          value: 'cardinal-cinema',
        },
        {
          label: `Cardinal Books`,
          value: 'cardinal-books',
        },
      ]}
    />
  )
}

export const WithLabel = () => {
  const field = 'dropdown-with-label'
  const dispatch = useDispatch()
  const storeValue = useSelector((state: RootState) => state.settings?.current?.[field]) as string
  return (
    <Select
      name={field}
      value={storeValue}
      multi={false}
      label="Choose app"
      onChange={(val) => dispatch(settingsActions.set({ key: field, value: val }))}
      options={[
        {
          label: `Cardinal Music`,
          value: 'cardinal-music',
        },
        {
          label: `Cardinal Photos`,
          value: 'cardinal-photos',
        },
        {
          label: `Cardinal Cinema`,
          value: 'cardinal-cinema',
        },
        {
          label: `Cardinal Books`,
          value: 'cardinal-books',
        },
      ]}
    />
  )
}

export const Medium = () => {
  const field = 'dropdown-medium'
  const dispatch = useDispatch()
  const storeValue = useSelector((state: RootState) => state.settings?.current?.[field]) as string
  return (
    <Select
      name={field}
      value={storeValue}
      multi={true}
      size="m"
      labelIcon="fas fa-folder-open"
      onChange={(val) => dispatch(settingsActions.set({ key: field, value: val }))}
      options={[
        {
          label: `Vacation 2028`,
          value: 'vacation-2028',
        },
        {
          label: `Cat memes`,
          value: 'cat-memes',
        },
        {
          label: `Isle of Man`,
          value: 'isle-of-man',
        },
        {
          label: `House`,
          value: 'house',
        },
        {
          label: `Pics of the car`,
          value: 'pics-of-the-car',
        },
        {
          label: `New album`,
          value: 'new-album',
        },
        {
          label: `New album 2`,
          value: 'new-album-2',
        },
      ]}
    />
  )
}

export const Small = () => {
  const field = 'dropdown-small'
  const dispatch = useDispatch()
  const storeValue = useSelector((state: RootState) => state.settings?.current?.[field]) as string
  return (
    <Select
      name={field}
      value={storeValue}
      multi={true}
      size="s"
      labelIcon="fas fa-folder-open"
      onChange={(val) => dispatch(settingsActions.set({ key: field, value: val }))}
      options={[
        {
          label: `Vacation 2028`,
          value: 'vacation-2028',
        },
        {
          label: `Cat memes`,
          value: 'cat-memes',
        },
        {
          label: `Isle of Man`,
          value: 'isle-of-man',
        },
        {
          label: `House`,
          value: 'house',
        },
        {
          label: `Pics of the car`,
          value: 'pics-of-the-car',
        },
        {
          label: `New album`,
          value: 'new-album',
        },
        {
          label: `New album 2`,
          value: 'new-album-2',
        },
      ]}
    />
  )
}

export const Underline = () => {
  const field = 'dropdown-underline'
  const [selected, setSelected] = useState()
  return (
    <Select
      name={field}
      value={selected}
      onChange={(val) => setSelected(val)}
      layout="underline"
      options={[
        {
          label: `Labrador`,
          value: 'dog',
        },
        {
          label: `Standard Issue House Cat`,
          value: 'cat',
        },
        {
          label: `Horse`,
          value: 'horse',
        },
        {
          label: `North American House Hippo`,
          value: 'house-hippo',
        },
        {
          label: `Snek`,
          value: 'snek',
        },
        {
          label: `Labrador`,
          value: 'dog2',
        },
        {
          label: `Standard Issue House Cat`,
          value: 'cat2',
        },
        {
          label: `Horse`,
          value: 'horse2',
        },
        {
          label: `North American House Hippo`,
          value: 'house-hippo2',
        },
        {
          label: `Snek`,
          value: 'snek2',
        },
        {
          label: `Labrador`,
          value: 'dog3',
        },
        {
          label: `Standard Issue House Cat`,
          value: 'cat3',
        },
        {
          label: `Horse`,
          value: 'horse3',
        },
        {
          label: `North American House Hippo`,
          value: 'house-hippo3',
        },
        {
          label: `Snek`,
          value: 'snek3',
        },
      ]}
    />
  )
}

export const Underline = () => {
  const field = 'dropdown-underline'
  const [selected, setSelected] = useState()
  return (
    <Select
      name={field}
      value={selected}
      onChange={(val) => setSelected(val)}
      layout="underline"
      options={[
        {
          label: `Labrador`,
          value: 'dog',
        },
        {
          label: `Standard Issue House Cat`,
          value: 'cat',
        },
        {
          label: `Horse`,
          value: 'horse',
        },
        {
          label: `North American House Hippo`,
          value: 'house-hippo',
        },
        {
          label: `Snek`,
          value: 'snek',
        },
        {
          label: `Labrador`,
          value: 'dog2',
        },
        {
          label: `Standard Issue House Cat`,
          value: 'cat2',
        },
        {
          label: `Horse`,
          value: 'horse2',
        },
        {
          label: `North American House Hippo`,
          value: 'house-hippo2',
        },
        {
          label: `Snek`,
          value: 'snek2',
        },
        {
          label: `Labrador`,
          value: 'dog3',
        },
        {
          label: `Standard Issue House Cat`,
          value: 'cat3',
        },
        {
          label: `Horse`,
          value: 'horse3',
        },
        {
          label: `North American House Hippo`,
          value: 'house-hippo3',
        },
        {
          label: `Snek`,
          value: 'snek3',
        },
      ]}
    />
  )
}

export default meta
