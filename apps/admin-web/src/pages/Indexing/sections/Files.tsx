import { useEffect } from 'react'
import { useAppDispatch } from '@cardinalapps/ui/src/hooks/useAppDispatch'
import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'
import { indexingSelectors } from '@cardinalapps/ui/src/store/slices/indexing'
import fetchTotalFileCounts from '@cardinalapps/ui/src/store/slices/indexing/thunks/fetchTotalFileCounts'
import CardGrid from '@cardinalapps/ui/src/components/layout/CardGrid'
import H5 from '@cardinalapps/ui/src/components/typography/H5'
import List from '@cardinalapps/ui/src/components/interaction/List'

import { formatWithCommas } from '@cardinalapps/ui/src/lib/formatting/number'

import i18n from '../i18n.json'

function FileCounts() {
  const dispatch = useAppDispatch()
  const { lang } = useAppSelector(settingsSelectors.current)
  const totalMusicFilesIndexed = useAppSelector(indexingSelectors.totalMusicFilesIndexed)
  const totalPhotoFilesIndexed = useAppSelector(indexingSelectors.totalPhotoFilesIndexed)
  const totalMovieFilesIndexed = useAppSelector(indexingSelectors.totalMovieFilesIndexed)
  const totalTVFilesIndexed = useAppSelector(indexingSelectors.totalTVFilesIndexed)

  /**
   * On page load, fetch the total file counts.
   */
  useEffect(() => {
    dispatch(fetchTotalFileCounts())
  }, [])

  return (
    <CardGrid.Card
      size="s"
      header={<H5>{i18n['counts.title'][lang]}</H5>}
    >
      <List
        className="server-info-list"
        layout="compact"
        items={[
          {
            icon: { fa: 'far fa-file-audio' },
            name: i18n['counts.songs'][lang],
            label: `${formatWithCommas(totalMusicFilesIndexed)} ${i18n['files'][lang]}`,
          },
          {
            icon: { fa: 'far fa-file-image' },
            name: i18n['counts.photos'][lang],
            label: `${formatWithCommas(totalPhotoFilesIndexed)} ${i18n['files'][lang]}`,
          },
          {
            icon: { fa: 'far fa-file-video' },
            name: i18n['counts.movies'][lang],
            label: `${formatWithCommas(totalMovieFilesIndexed)} ${i18n['files'][lang]}`,
          },
          {
            icon: { fa: 'far fa-file-video' },
            name: i18n['counts.tv'][lang],
            label: `${formatWithCommas(totalTVFilesIndexed)} ${i18n['files'][lang]}`,
          },
        ]}
      />
    </CardGrid.Card>
  )
}

export default FileCounts
