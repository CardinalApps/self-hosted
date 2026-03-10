import { createAsyncThunk } from '@reduxjs/toolkit'

import { STORE_KEY } from '../constants'

import homeServerAPI from '../../../../lib/homeserver/homeServerAPI'

type Counts = {
  musicFiles: string,
  photoFiles: string,
  movieFiles: string,
  tvFiles: string,
}

/**
 * Fetches the indexed file count for each media type.
 */
const fetchTotalFileCounts = createAsyncThunk(`${STORE_KEY}/fetchTotalFileCounts`, async () => {
  const counts = await homeServerAPI<Counts>('/index/counts')

  return {
    musicFiles: typeof parseInt(counts?.musicFiles) === 'number' ? counts?.musicFiles : 'Could not fetch',
    photoFiles: typeof parseInt(counts?.photoFiles) === 'number' ? counts?.photoFiles : 'Could not fetch',
    movieFiles: typeof parseInt(counts?.movieFiles) === 'number' ? counts?.movieFiles : 'Could not fetch',
    tvFiles: typeof parseInt(counts?.tvFiles) === 'number' ? counts?.tvFiles : 'Could not fetch',
  }
})

export default fetchTotalFileCounts
