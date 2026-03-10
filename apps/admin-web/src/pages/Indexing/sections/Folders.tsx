import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'

import CardGrid from '@cardinalapps/ui/src/components/layout/CardGrid'
import H5 from '@cardinalapps/ui/src/components/typography/H5'
import List from '@cardinalapps/ui/src/components/interaction/List'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import homeServerAPI from '@cardinalapps/ui/src/lib/homeserver/homeServerAPI'

import i18n from '../i18n.json'

type MediaDirs = {
  music?: string,
  photos?: string,
  movies?: string,
  tv?: string,
}

function MediaFolders() {
  const { lang } = useSelector(settingsSelectors.current)
  const [mediaDirs, setMediaDirs] = useState<MediaDirs>({})

  /**
   * Fetch media directories on page load.
   */
  useEffect(() => {
    homeServerAPI('/index/directories')
      .then((res: MediaDirs) => {
        setMediaDirs(res)
      })
      .catch(() => {
        console.error('Could not fetch media directories')
      })
  }, [])

  return (
    <CardGrid.Card
      size="m"
      header={
        <>
          <H5 className={'title'}>{i18n['dirs.title'][lang]}</H5>
        </>
      }
      footer={i18n['dirs.tooltip-docker'][lang]}
    >
      <List
        className="server-info-list"
        layout="compact"
        items={[
          {
            icon: { fa: 'far fa-folder-open' },
            name: i18n['dirs.music'][lang],
            label: mediaDirs?.music ? mediaDirs.music : i18n['dirs.no-dir'][lang],
          },
          {
            icon: { fa: 'far fa-folder-open' },
            name: i18n['dirs.photos'][lang],
            label: mediaDirs?.photos ? mediaDirs.photos : i18n['dirs.no-dir'][lang],
          },
          {
            icon: { fa: 'far fa-folder-open' },
            name: i18n['dirs.movies'][lang],
            label: mediaDirs?.movies ? mediaDirs.movies : i18n['dirs.no-dir'][lang],
          },
          {
            icon: { fa: 'far fa-folder-open' },
            name: i18n['dirs.tv'][lang],
            label: mediaDirs?.tv ? mediaDirs.tv : i18n['dirs.no-dir'][lang],
          },
        ]}
      />
    </CardGrid.Card>
  )
}

export default MediaFolders
