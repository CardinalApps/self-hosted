import { useState } from 'react'
import type { PropsWithChildren } from 'react'
import { useSelector } from 'react-redux'
import clsx from 'clsx'

import Icon from '../../typography/Icon'
import Popout from '../../layout/Popout'
import { settingsSelectors } from '../../../store/slices/settings'

import { getAnimationSVG } from './icons'

import i18n from './i18n'

import './Button.css'

export type ButtonChoice = {
  label: string,
  icon?: string,
  onSelect: () => void,
}

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
  choices?: ButtonChoice[],

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
  choices = undefined,
  partyTime = false,
  partyRoom,
  ...props
}: PropsWithChildren<ButtonProps>) => {
  const [mouseUpAnimation] = useState('')
  const [choicesOpen, setChoicesOpen] = useState(false)
  const { lang } = useSelector(settingsSelectors.current)

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
    const buttonElement = (
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
      </button>
    )

    if (choices?.length) {
      return maybeWithWrapper(
        <Popout
          className="button-choiced"
          open={choicesOpen}
          onClose={() => setChoicesOpen(false)}
          position="tl"
          origin="bl"
          offset={6}
          width={200}
          trigger={(
            <>
              {buttonElement}
              <button
                type="button"
                className={clsx(classNameProp, 'choices-toggle')}
                title={i18n['button.choices.toggle'][lang]}
                aria-haspopup="menu"
                aria-expanded={choicesOpen}
                disabled={disabled || animation ? true : false}
                onClick={() => setChoicesOpen(!choicesOpen)}
              >
                <Icon fa="fas fa-ellipsis-v" />
              </button>
            </>
          )}
        >
          <ul className="button-choices" role="menu">
            {choices.map((choice) => (
              <li key={choice.label} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setChoicesOpen(false)
                    choice.onSelect()
                  }}
                >
                  {!!choice.icon && <Icon fa={choice.icon} />}
                  <span>{choice.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </Popout>,
      )
    }

    return maybeWithWrapper(buttonElement)
  }
}

export default Button
