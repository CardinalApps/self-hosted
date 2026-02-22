import { useState } from 'react'
import type { PropsWithChildren } from 'react'
import clsx from 'clsx'

import Icon from '../../typography/Icon'

import { getAnimationSVG } from './icons'

import './Button.css'

type ButtonProps = {
  type?: 'button' | 'submit' | 'reset',
  href?: string,
  target?: string,
  arrowText?: boolean,
  solid?: boolean,
  outline?: boolean,
  title?: string,
  textual?: boolean,
  plain?: boolean,
  tag?: boolean,
  action?: boolean,
  icon?: string,
  circleIcon?: boolean,
  animation?: string,
  animationColor?: string,
  color?: 'danger',
  onActionButtonClick?: () => void,
  onClick?: () => void,
  className?: string,
  disabled?: boolean,

  // For the outer component to add conditional party-rendering logic
  partyTime?: boolean,
  partyRoom?: React.ReactNode,
}

/**
 * Button.
 */
const Button = ({
  type = 'button',
  href = undefined,
  target = '_self',
  arrowText = false,
  solid = false,
  outline = false,
  title,
  textual = false,
  plain = false,
  tag = false,
  action = false,
  icon = undefined,
  circleIcon = false,
  animation = undefined,
  animationColor = undefined,
  onActionButtonClick,
  color = undefined,
  children,
  onClick = () => {},
  className = undefined,
  disabled = false,
  partyTime = false,
  partyRoom,
  ...props
}: PropsWithChildren<ButtonProps>) => {
  const [mouseUpAnimation] = useState('')

  const classNameProp = clsx(
    'button',
    !!solid && 'solid',
    !!outline && 'outline',
    !!textual && 'textual',
    !!plain && 'plain',
    !!tag && 'tag',
    !!action && 'action',
    !!arrowText && 'arrow-text',
    !!color && color,
    !!circleIcon && 'circle-icon',
    !!disabled && 'disabled',
    !!animation && `${animation}-animation animation with-icon`,
    !!mouseUpAnimation && `${mouseUpAnimation}`,
    partyTime && 'party',
    className,
  )

  /**
   * This wrapper div is used to keep click and hover animations separate.
   */
  const maybeWithWrapper = (children) => {
    if (action) {
      return (
        <div className="action-button-animation-box" onClick={onActionButtonClick}>
          {children}
        </div>
      )
    }
    return children
  }

  if (href) {
    return maybeWithWrapper(
      <a
        href={href}
        target={target}
        type={type}
        title={title}
        onClick={onClick}
        className={classNameProp}
        {...props}
      >
        {!!icon && <Icon fa={icon} />}
        <span className="button-text">{children}</span>
      </a>,
    )
  } else {
    return maybeWithWrapper(
      <button
        type={type}
        className={classNameProp}
        onClick={onClick}
        title={title}
        disabled={disabled || animation ? true : false}
        {...props}
      >
        {!!icon && <Icon fa={icon} />}
        {animation && getAnimationSVG(animation, animationColor)}
        <span className="button-text">{children}</span>
        {partyRoom}
      </button>,
    )
  }
}

export default Button
