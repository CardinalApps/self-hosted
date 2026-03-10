import { useAppDispatch } from '../../../../hooks/useAppDispatch'
import { useAppSelector } from '../../../../hooks/useAppSelector'
import { useGetLibrariesQuery } from '../../../../store/apis/libraries'
import { layoutSelectors } from '../../../../store/slices/layout'
import { libraryActions, librarySelectors } from '../../../../store/slices/library'
import { settingsSelectors } from '../../../../store/slices/settings'
import Select from '../../../forms/Select'

import i18n from '../i18n'

const LibrarySwitcher = () => {
  const dispatch = useAppDispatch()
  const { lang } = useAppSelector(settingsSelectors.current)
  const currentLibrary = useAppSelector(librarySelectors.current)
  const showLibrarySwitcher = useAppSelector(layoutSelectors.showLibrarySwitcher)

  const {
    data: allLibrariesResponse,
  } = useGetLibrariesQuery({ take: 9999, skip: 0, order: 'ASC' })
  const allLibraries = allLibrariesResponse

  const libraryOptions = (): Record<string, string>[] => {
    if (Array.isArray(allLibraries)) {
      return allLibraries.map((lib) => {
        return {
          label: lib.name,
          value: lib.libraryId,
        }
      })
    }
  }

  const handleSwitchLibrary = (val) => {
    dispatch(libraryActions.set(val))
  }

  return showLibrarySwitcher
    ? (
        <div className="library-switcher">
          <Select
            name="library-context"
            selectPlaceholder={i18n['libraries.placeholder'][lang]}
            options={libraryOptions()}
            value={currentLibrary}
            multi={true}
            size="s"
            onChange={(val) => handleSwitchLibrary(val)}
          />
        </div>
      )
    : null
}

export default LibrarySwitcher
