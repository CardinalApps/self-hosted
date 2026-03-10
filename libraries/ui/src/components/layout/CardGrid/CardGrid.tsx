import react from 'react'
import type { PropsWithChildren, ReactNode } from 'react'
import clsx from 'clsx'
import { MediaServerCapability } from '@cardinalapps/access-control/src'

import Card, { CardProps } from '../Card/Card'
import CardWithCapabilities from '../CardWithCapabilities'

import './CardGrid.css'

type CardGridProps = {
  className?: string,
  title?: string,
  layout?: 'flex' | 'grid',
  wrap?: boolean,
  rowHeight?: 's' | 'm' | 'l' | 'auto'
  children?: ReactNode,
}

const CardGrid = ({
  className,
  title,
  layout = 'flex',
  wrap = true,
  rowHeight = 'auto',
  children,
}: PropsWithChildren<CardGridProps>) => {
  const enhancedCards = () => {
    const childrenAsArray = Array.isArray(children)
      ? children
      : [children]
    return childrenAsArray
      .filter((card) => !!card)
      .map((card, i) => react.cloneElement(card, {
        key: i,
        padding: 'thin',
      }))
  }
  return (
    <div className={clsx("card-grid", className, `row-height-${rowHeight}`)} data-layout={layout}>
      {!!title && <p className="card-grid-title">{title}</p>}
      <div className={clsx("card-grid-layout", wrap ? 'wrap' : undefined)}>
        {enhancedCards()}
      </div>
    </div>
  )
}

type GridCardProps = {
  size?: 'xs' | 's' | 'm' | 'l' | 'xl'
  capabilities?: MediaServerCapability[],
} & CardProps

CardGrid.Card = (props: GridCardProps = {}) => {
  const cardProps: CardProps = {
    ...props,
    padding: "thin",
    className: clsx(`grid-size-${props.size || 'm'}`, props.className),
  }

  if (props?.capabilities) {
    return (
      <CardWithCapabilities {...cardProps} capabilities={props.capabilities}>
        {props.children}
      </CardWithCapabilities>
    )
  } else {
    return (
      <Card {...cardProps}>
        {props.children}
      </Card>
    )
  }
}

export default CardGrid

