import { RootState } from '../../..'

// A negotiation cannot survive a reload, so anything persisted mid-flight starts over
export default function beforeStoreInit(state: RootState) {
  Object.values(state.remoteAccess ?? {}).forEach((entry) => {
    if (entry.status === 'negotiating') {
      entry.status = 'idle'
    }
  })
}
