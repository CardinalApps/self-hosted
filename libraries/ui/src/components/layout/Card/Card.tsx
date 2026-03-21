import type { CSSProperties, PropsWithChildren, ReactNode } from 'react'
import clsx from 'clsx'
import useWindowSize from '../../../hooks/useWindowSize'

import './Card.css'

export type CardPadding = 'regular' | 'thick' | 'thin' | 'none' | number

export type CardProps = {
  width?: number | string,
  height?: number | string,
  padding?: CardPadding,
  shadow?: 0 | 1 | 2 | 3 | 4,
  bg?: 0 | 1 | 2 | 3 | 4,
  mobileBg?: 0 | 1 | 2 | 3 | 4,
  border?: 0 | 1 | 2 | 3 | 4,
  id?: string,
  className?: string,
  style?: CSSProperties,
  bottomAlignContent?: boolean,
  icon?: React.ReactNode,
  iconSize?: 'm' | 'l',
  header?: ReactNode,
  headerRight?: ReactNode,
  footer?: ReactNode,
  children?: ReactNode,
}

const Card = ({
  width,
  height,
  padding = 'regular',
  shadow,
  bg = 1,
  mobileBg,
  border = 3,
  id,
  className = '',
  style,
  bottomAlignContent,
  icon,
  iconSize = 'm',
  header,
  headerRight,
  footer,
  children,
}: PropsWithChildren<CardProps>) => {
  const { width: windowWidth } = useWindowSize()

  return (
    <div
      id={id || undefined}
      className={clsx(
        `card`,
        typeof padding === 'string' && `padding-${padding}`,
        `bg-${(mobileBg && windowWidth <= 768) ? mobileBg : bg}`,
        className,
        shadow ? `shadow-${shadow}` : '',
        border ? `border-${border}` : '',
        header ? `has-header` : '',
        footer ? `has-footer` : '',
        bottomAlignContent ? `bottom-align-content` : '',
      )}
      style={{
        ...style,
        ...(width ? { width } : {}),
        ...(height ? { height } : {}),
      }}
    >
      {(!!header || !!icon) &&
        <header className="card-header">
          <div className="card-title">
            {!!icon && <div className={clsx(`card-icon`, `size-${iconSize}`)}>{icon}</div>}
            {header}
          </div>
          {headerRight && <div className="right-section">{headerRight}</div>}
        </header>
      }
      <div
        className="card-content"
        style={{
          ...(typeof padding === 'number' ? { padding } : {}),
        }}
      >
        {children}
      </div>
      {!!footer &&
        <footer className="card-footer">
          {footer}
        </footer>
      }
    </div>
  )
}

export default Card

