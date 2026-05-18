import { useState, useEffect } from 'react'
import type { PropsWithChildren } from 'react'
import { useSelector } from 'react-redux'

import Loading from '../../layout/Loading'
import H2 from '../../typography/H2'
import H3 from '../../typography/H3'

import SidebarNav from '../../interaction/SidebarNav'
import Card from '../../layout/Card'

import { settingsSelectors } from '../../../store/slices/settings'
import { homeServerUserSelectors } from '../../../store/slices/homeServerUser'
import { modalSelectors } from '../../../store/slices/modal'
import { layoutActions, layoutSelectors } from '../../../store/slices/layout'
import set from '../../../store/slices/settings/thunks/set'
import sync from '../../../store/slices/settings/thunks/sync'
import Field from './Field'

import { useAppDispatch } from '../../../hooks/useAppDispatch'

import { getFields } from './fields'

import { CardinalApp } from '../../../lib/env/cardinal'

import i18n from './i18n'

import './SettingsPanel.css'

type SettingsPanelProps = {
  app: CardinalApp,
  customTabs?: unknown[],
  lang?: string,
  onChange?: (key?: string, value?: unknown) => void,
  onClose?: () => void,
}

const SettingsPanel = ({
  app,
  customTabs,
  onChange = () => {},
  onClose,
}: PropsWithChildren<SettingsPanelProps>) => {
  const dispatch = useAppDispatch()
  const settings = useSelector(settingsSelectors.current)
  const syncing = useSelector(settingsSelectors.syncing)
  const syncError = useSelector(settingsSelectors.syncError)
  const currentUser = useSelector(homeServerUserSelectors.current)
  const modalIsOpen = useSelector(modalSelectors.isOpen)
  const settingsPanelTop = useSelector(layoutSelectors.settingsPanelTop)
  const [tabs] = useState(getFields(app, settings?.lang))
  const [activeTabIndex, setActiveTabIndex] = useState(0)

  // Close the settings panel and notify the caller.
  const handleClose = () => {
    dispatch(layoutActions.setSettingsPanelOpen(false))
    onClose?.()
  }

  // Step the panel's vertical position through these landing zones.
  const positionStops = ['50px', '45vh', 'calc(-110px + 100vh)']
  const currentStopIdx = positionStops.indexOf(settingsPanelTop)
  const stepUp = () => {
    const idx = Math.max(0, (currentStopIdx === -1 ? 1 : currentStopIdx) - 1)
    dispatch(layoutActions.setSettingsPanelTop(positionStops[idx]))
  }
  const stepDown = () => {
    const idx = Math.min(positionStops.length - 1, (currentStopIdx === -1 ? 1 : currentStopIdx) + 1)
    dispatch(layoutActions.setSettingsPanelTop(positionStops[idx]))
  }

  /**
   * Inject all custom tabs after the default tabs.
   */
  const withCustomTabs = (tabs) => {
    if (customTabs) {
      return [...tabs, ...customTabs]
    } else {
      return tabs
    }
  }

  /**
   * Updates one or more settings.
   */
  const save = (changedFieldKey, changedFieldValue, app) => {
    onChange(changedFieldKey, changedFieldValue)
    dispatch(set({
      settings: {
        [changedFieldKey]: changedFieldValue,
      },
      app,
    }))
  }

  /**
   * Sync with server on init.
   */
  useEffect(() => {
    dispatch(sync(app))
  }, [])

  /**
   * Esc to close.
   */
  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === 'Escape' && !modalIsOpen) {
        handleClose()
      }
    }

    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [modalIsOpen])

  return (
    <section className="settings-panel" data-app={app}>
      <aside className="settings-panel-position-controls">
        <button type="button" className="close" aria-label="Close settings" onClick={handleClose}>
          <i className="fas fa-times" />
        </button>
        <button type="button" aria-label="Expand panel" onClick={stepUp}>
          <i className="fas fa-chevron-up" />
        </button>
        <button type="button" aria-label="Collapse panel" onClick={stepDown}>
          <i className="fas fa-chevron-down" />
        </button>
      </aside>
      <div className="panel">
        <aside className="sidebar">
          <div className="title">
            <H3 className="title-text">{i18n['settings.main-title']['en']}</H3>
            <div className="icons">
              {!!syncError && <i className="error-icon fas fa-exclamation-triangle" title={syncError} />}
              {!!syncing && <Loading size="s" />}
            </div>
          </div>
          <SidebarNav size="thin" overrideAppLayout="standard" showCollapseButton={false} overrideIsCollapsed={false}>
            {withCustomTabs(tabs).map((tab, index) => {
              return (
                <li className={`${index === activeTabIndex ? 'active' : ''}`} key={index}>
                  <button type="button" onClick={() => setActiveTabIndex(index)}>
                    <i className={tab?.tabIcon}></i>
                    <span>{tab?.tabName}</span>
                  </button>
                </li>
              )
            })}
          </SidebarNav>
        </aside>
        <div className="panel-content">
          <H2 className="panel-title">
            {withCustomTabs(tabs)[activeTabIndex].tabName}
          </H2>
          <form onSubmit={(e) => e.preventDefault()}>
            {withCustomTabs(tabs).map((tab, tabIndex) => {
              return (
                <Card
                  key={tab.tabName}
                  shadow={0}
                  border={1}
                  className={`tab-fields ${tabIndex === activeTabIndex ? 'active' : ''}`}
                >
                  {
                    tab.fields
                      ? tab.fields.map((fieldFactory, fieldIndex) => {
                        const field = fieldFactory(app, settings?.lang)
                        const valueInStore = settings?.[field.slug]

                        // The field can set the overrideApp value to null to
                        // apply the settings change to all apps
                        const fieldOnChange = (value, overrideApp) => {
                          const appNamespace = typeof overrideApp !== 'undefined'
                            ? overrideApp
                            : typeof field?.app !== 'undefined'
                              ? field.app
                              : app
                          save(field.slug, value, appNamespace)
                        }
                        return (
                          <Field key={field.slug || fieldIndex} field={field}>
                            <div className="settings-input">
                              {field.render({
                                field: field,
                                value: valueInStore,
                                user: currentUser,
                                onChange: fieldOnChange,
                              })}
                            </div>
                          </Field>
                        )
                      })
                      : tab.tabContent ? tab.tabContent : <>No tab content</>
                  }
                </Card>
              )
            })}
          </form>
        </div>
      </div>
    </section>
  )
}

export default SettingsPanel
