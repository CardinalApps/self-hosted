import { useContext } from "react"

import { RouterContext } from "@cardinalapps/ui/src/context/router"
import { MusicReleaseType } from "@cardinalapps/ui/src/store/apis/musicReleases"
import List from "@cardinalapps/ui/src/components/interaction/List"
import { getAppUrl } from "@cardinalapps/ui/src/lib/net/router"

type ReleaseMetaProps = {
  release: MusicReleaseType,
}

import i18n from './i18n.json'

function ReleaseMeta({
  release,
}: ReleaseMetaProps) {
  const { Link } = useContext(RouterContext)

  const countDiscs = () => {
    const discs = release?.tracks?.map((track) => Number(track.discNumber) || 1) || []
    const uniqueDiscs = Array.from(new Set(discs))
    return uniqueDiscs.length
  }

  const artists = release?.artists || []
  const genres = release?.genres || []

  return (
    <div className="release-meta">
      <p className="meta-section-title">{i18n['music-release.meta.meta']['en']}</p>
      <div className="release-meta-cols">
        <List
          className="release-meta-list"
          layout="compact"
          items={[
            {
              name: (
                <>
                  <strong>{i18n['music-release.meta.artists']['en']}</strong>
                  <span className="release-meta-artists">
                    {artists.length
                      ? artists.map((artist, index) => (
                          <span key={artist.musicArtistId as string || index}>
                            {index > 0 && ', '}
                            {Link && artist.musicArtistId
                              ? <Link to={getAppUrl('artist', { params: { ':id': artist.musicArtistId as string } })}>{artist.name as string}</Link>
                              : artist.name as string
                            }
                          </span>
                        ))
                      : i18n['music-release.meta.artists.none']['en']
                    }
                  </span>
                </>
              ),
              title: i18n['music-release.meta.artists']['en'],
            },
            {
              name: (
                <>
                  <strong>{i18n['music-release.meta.genres']['en']}</strong>
                  <span>
                    {genres.length
                      ? genres.map((genre) => genre.name).join(', ')
                      : i18n['music-release.meta.genres.none']['en']
                    }
                  </span>
                </>
              ),
              title: i18n['music-release.meta.genres']['en'],
            },
          ]}
        />
        <List
          className="release-meta-list"
          layout="compact"
          items={[
            {
              name: <><strong>{i18n['music-release.meta.tracks']['en']}</strong> <span>{release?.tracks?.length.toString() || '0'}</span></>,
              title: i18n['music-release.meta.tracks']['en'],
            },
            {
              name: <><strong>{i18n['music-release.meta.discs']['en']}</strong> <span>{countDiscs()}</span></>,
              title: i18n['music-release.meta.discs']['en'],
            },
          ]}
        />
      </div>
    </div>
  )
}

export default ReleaseMeta
