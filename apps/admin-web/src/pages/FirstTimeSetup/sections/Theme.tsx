import { useSelector, useDispatch } from 'react-redux'
import { TargetAndTransition, motion } from 'framer-motion'

import H1 from '@cardinalapps/ui/src/components/typography/H1'

import { settingsSelectors, settingsActions } from '@cardinalapps/ui/src/store/slices/settings'

import i18n from '../i18n.json'

import '../styles.css'

type ThemeProps = {
  next: () => void,
  setTheme: (theme: string) => void,
  cardAnimation: TargetAndTransition,
}

function Theme({
  next,
  setTheme,
  cardAnimation,
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
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={cardAnimation}
      >
        <H1 className={'title center'}>{i18n['theme.title'][lang]}</H1>
        <div className={'themeSwatches'}>
          <button
            className={'themeSwatch lightSwatch'}
            onFocus={() => handleThemeChange('light')}
            onMouseEnter={() => handleThemeChange('light')}
            onClick={() => next()}
          >
            <i className="fas fa-sun" />
            <p>{i18n['theme.name.light'][lang]}</p>
          </button>
          <button
            className={'themeSwatch darkSwatch'}
            onFocus={() => handleThemeChange('dark')}
            onMouseEnter={() => handleThemeChange('dark')}
            onClick={() => next()}
          >
            <i className="fas fa-moon" />
            <p>{i18n['theme.name.dark'][lang]}</p>
          </button>
        </div>
      </motion.div>
    </>
  )
}

export default Theme
