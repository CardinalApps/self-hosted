import { useEffect, useState } from 'react'
import {
  ACi18n,
  hasCapability,
  MediaServerAspect,
  MediaServerCapability,
  MediaServerCapabilities,
  MediaServerRoles,
  MediaServerAspects,
  MediaServerRoleNames,
} from '@cardinalapps/access-control/src'

import { useAppSelector } from '@cardinalapps/ui/src/hooks/useAppSelector'

import H5 from '@cardinalapps/ui/src/components/typography/H5'
import List from '@cardinalapps/ui/src/components/interaction/List'
import CardGrid from '@cardinalapps/ui/src/components/layout/CardGrid'
import { ListItem } from '@cardinalapps/ui/src/components/interaction/List/List'
import Select from '@cardinalapps/ui/src/components/forms/Select'
import Form from '@cardinalapps/ui/src/components/forms/Form'
import { pluralize } from '@cardinalapps/ui/src/lib/formatting/text'

import { settingsSelectors } from '@cardinalapps/ui/src/store/slices/settings'

import i18n from './i18n.json'

type CapabilitiesListProps = {
  globallySelectedAspect: MediaServerAspect,
  globallySelectedRole: MediaServerRoleNames,
  setGloballySelectedAspect: (AspectNames) => void
  setGloballySelectedRole: (RoleNames) => void
}

function CapabilitiesList({
  globallySelectedAspect: globallySelectedAspect,
  globallySelectedRole,
  setGloballySelectedAspect,
  setGloballySelectedRole,
}: CapabilitiesListProps) {
  const { lang } = useAppSelector(settingsSelectors.current)
  const [filteredItems, setFilteredItems] = useState([])

  const filteredString = () => {
    const pluralizedCapability = pluralize(
      filteredItems.length,
      i18n['caps.singular'][lang],
      i18n['caps.plural'][lang],
    )

    if (!globallySelectedAspect && !globallySelectedRole) {
      return i18n['caps-list.total'][lang]
        .replace('{total}', MediaServerCapabilities.length)
    }

    if (!globallySelectedAspect && globallySelectedRole) {
      return i18n['caps-list.only-role'][lang]
        .replace('{role}', ACi18n[`role.${globallySelectedRole}.name`]?.[lang])
        .replace('{num}', filteredItems.length)
        .replace('{total}', MediaServerCapabilities.length)
        .replace('{capabilities}', pluralizedCapability)
    }

    if (globallySelectedAspect && !globallySelectedRole) {
      return i18n['caps-list.only-aspect'][lang]
        .replace('{aspect}', globallySelectedAspect)
        .replace('{num}', filteredItems.length)
        .replace('{total}', MediaServerCapabilities.length)
        .replace('{capabilities}', pluralizedCapability)
    }

    if (globallySelectedAspect && globallySelectedRole) {
      return i18n['caps-list.aspect-and-role'][lang]
        .replace('{role}', ACi18n[`role.${globallySelectedRole}.name`]?.[lang])
        .replace('{aspect}', globallySelectedAspect)
        .replace('{num}', filteredItems.length)
        .replace('{total}', MediaServerCapabilities.length)
        .replace('{capabilities}', pluralizedCapability)
    }
  }

  useEffect(() => {
    const filtered = MediaServerCapabilities
      .filter((cap) => {
        if (globallySelectedRole) {
          return !!hasCapability<MediaServerCapability>(cap, MediaServerRoles?.[globallySelectedRole]?.capabilities)
        } else {
          return true
        }
      })
      .filter((cap) => {
        if (globallySelectedAspect) {
          return !!cap.includes(globallySelectedAspect)
        } else {
          return true
        }
      })
      .sort()
      .map((cap) => {
        return {
          name: <code>{cap}</code>,
          value: cap,
        } as ListItem
      })

    setFilteredItems(filtered)
  }, [globallySelectedAspect, globallySelectedRole])

  return (
    <CardGrid.Card
      size="l"
      className={'capabilities-list'}
      header={<H5 className={'title'}>{i18n['caps-list.title'][lang]}</H5>}
      footer={filteredString()}
      headerRight={(
        <Form>
          <>
            <Select
              name="role"
              size='s'
              layout="underline"
              multi={false}
              selectPlaceholder={i18n['caps-list.role-filter'][lang]}
              value={globallySelectedRole}
              options={Object.keys(MediaServerRoles).map((role) => {
                return {
                  label: ACi18n[`role.${role}.name`]?.[lang],
                  value: role,
                }
              })}
              onChange={(selected) => setGloballySelectedRole(selected)}
            />
            <Select
              name="aspect"
              size='s'
              layout="underline"
              multi={false}
              selectPlaceholder={i18n['caps-list.aspect-filter'][lang]}
              value={globallySelectedAspect}
              options={MediaServerAspects.map((aspect) => {
                return {
                  label: aspect,
                  value: aspect,
                }
              })}
              onChange={(selected) => setGloballySelectedAspect(selected)}
            />
          </>
        </Form>
      )}
    >
      <List
        layout="compact"
        items={filteredItems}
      />
    </CardGrid.Card>
  )
}

export default CapabilitiesList
