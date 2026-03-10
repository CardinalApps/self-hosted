import MusicTrack from '../../MusicTrack'
import { useGetMusicTrackQuery } from '../../../../store/apis/musicTracks'

const MusicTrackItem = (props: {
  musicTrackId: string,
  position: number,
  format: 'list' | 'interactive',
}) => {
  const { data: musicTrack } = useGetMusicTrackQuery({ id: props.musicTrackId })

  return musicTrack
    ? (
        props.format === 'interactive'
          ? (
            <MusicTrack
              trackNumber={props.position}
              musicTrackId={props.musicTrackId}
              trackTitle={musicTrack?.title}
              releaseTitle={musicTrack?.release?.title}
              canFav={false}
            />
          )
          : (
            musicTrack.title
          )
      )
    : null
}

export default MusicTrackItem
