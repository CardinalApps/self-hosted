import { useMemo, type PropsWithChildren } from 'react'
import clsx from 'clsx'
import { getMediaServerRole, hasCapabilities, MediaServerCapability } from '@cardinalapps/access-control/src'
import AccessError from '../AccessError'

import Card, { CardProps } from '../Card/Card'
import { useAppSelector } from '../../../hooks/useAppSelector'
import { homeServerUserSelectors } from '../../../store/slices/homeServerUser'

import './CardWithCapabilities.css'

type CardWithCapabilitiesProps = {
  capabilities: MediaServerCapability[],
} & CardProps

/**
 * This component exists separately from Card so that Card can be used in
 * non-self-hosted-apps like the website and help site without crashing
 * (useSelector has no context, user doens't exist, etc).
 */
const CardWithCapabilities = (props: PropsWithChildren<CardWithCapabilitiesProps>) => {
  const currentUser = useAppSelector(homeServerUserSelectors.current)

  const hasAccess = useMemo(
    () => hasCapabilities<MediaServerCapability>(props?.capabilities, currentUser?.roles?.flatMap((role) => getMediaServerRole(role.role).capabilities)),
    [(props?.capabilities || []).length, currentUser.userId],
  )

  return hasAccess
    ? <Card {...props}>
        {props.children}
      </Card>
    : <Card
        {...props}
        className={clsx('card-access-error', props?.className)}
        headerRight={null}
        footer={null}
      >
        <AccessError code={403} capabilities={props?.capabilities} />
      </Card>
}

export default CardWithCapabilities

