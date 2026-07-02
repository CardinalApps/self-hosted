import { useSelector, useDispatch } from 'react-redux'

import H1 from '@cardinalapps/ui/src/components/typography/H1'
import Icon from '@cardinalapps/ui/src/components/typography/Icon'
import I11nFadeIn from '@cardinalapps/ui/src/components/layout/I11nFadeIn'

import { settingsSelectors, settingsActions } from '@cardinalapps/ui/src/store/slices/settings'

import i18n from '../i18n.json'

import '../styles.css'

type ThemeProps = {
  next: () => void,
  setTheme: (theme: string) => void,
}

function Theme({
  next,
  setTheme,
}: ThemeProps) {
  const dispatch = useDispatch()
  const { lang } = useSelector(settingsSelectors.current)

  const handleThemeChange = (theme) => {
    // This will be sent with the rest of the setup data
    setTheme(theme)

    // This sets the currently active theme
    dispatch(settingsActions.set({ key: 'theme', value: theme }))
  }

  return (
    <div data-testid="setup-step" data-step-name="theme">
      <I11nFadeIn duration={0.3}>
        <H1 className={'title center'}>{i18n['theme.title'][lang]}</H1>
        <div className={'themeSwatches'}>
          <button
            data-testid="setup-theme-swatch"
            data-theme-value="light"
            className={'themeSwatch lightSwatch'}
            onFocus={() => handleThemeChange('light')}
            onMouseEnter={() => handleThemeChange('light')}
            onClick={() => next()}
          >
            <Icon fa="fas fa-sun" />
            <p>{i18n['theme.name.light'][lang]}</p>
          </button>
          <button
            data-testid="setup-theme-swatch"
            data-theme-value="dark"
            className={'themeSwatch darkSwatch'}
            onFocus={() => handleThemeChange('dark')}
            onMouseEnter={() => handleThemeChange('dark')}
            onClick={() => next()}
          >
            <Icon fa="fas fa-moon" />
            <p>{i18n['theme.name.dark'][lang]}</p>
          </button>
        </div>
      </I11nFadeIn>
    </div>
  )
}

export default Theme
