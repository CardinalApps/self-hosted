import type { PropsWithChildren, ReactNode, CSSProperties } from 'react'
import clsx from 'clsx'

import './Columns.css'

type ColumnsProps = {
  justifyContent?: 'space-between' | 'space-around' | 'flex-start' | 'flex-end' | 'center',
  alignItems?: 'space-between' | 'space-around' | 'flex-start' | 'flex-end' | 'center',
  flexWrap?: 'medium' | 'small',
  shrink?: boolean,
  grow?: boolean,
  gap?: string | number,
  className?: string,
  style?: CSSProperties,
  children?: ReactNode,
}

const Columns = ({
  justifyContent = 'space-between',
  alignItems = 'center',
  flexWrap,
  shrink = true,
  grow = false,
  gap,
  className = '',
  style,
  children,
  ...props
}: PropsWithChildren<ColumnsProps>) => {
  return (
    <div
      className={clsx(
        'columns',
        className,
        shrink ? 'shrink' : 'no-shrink',
        grow ? 'grow' : 'no-grow',
      )}
      data-wrap={flexWrap}
      style={{
        ...(justifyContent && { justifyContent }),
        ...(alignItems && { alignItems }),
        ...(gap && { gap }),
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export default Columns
