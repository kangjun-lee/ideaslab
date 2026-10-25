import React, { forwardRef, ReactNode } from 'react'
import classNames from 'classnames'

import { LoadingIcon } from './icons'

interface StyleProps {
  variant?: 'primary' | 'default' | 'subtle' | 'light'
  compact?: boolean
  forIcon?: boolean
  loading?: boolean
}

interface DefaultProps extends StyleProps {
  children: string | ReactNode
}

export const buttonClassNames = (
  {
    compact = false,
    variant = 'default',
    forIcon = false,
    disabled,
    active,
  }: StyleProps & { disabled?: boolean; active?: boolean },
  otherClasses?: string,
) =>
  classNames(
    'transition rounded-lg flex-none text-center border flex gap-x-3 items-center',
    {
      'px-4 py-1.5': !compact && !forIcon,
      'px-2 py-1': compact && !forIcon,
      'px-2 py-2': forIcon,
      'bg-gray-100 text-gray-400 dark:bg-gray-700 border-base-color': disabled,
      'shadow-xs': variant !== 'subtle' && variant !== 'light',
      'bg-white hover:bg-gray-100 border-base-light dark:bg-gray-700 dark:hover:bg-gray-800 dark:border-base-dark dark:text-white':
        !disabled && variant === 'default',
      'bg-primary-500 hover:bg-primary-600 dark:bg-primary-500 dark:hover:bg-primary-600 text-white border-transparent dark:text-black':
        !disabled && variant === 'primary',
      'bg-primary-300/50 text-primary-600 hover:bg-primary-400/50 dark:bg-primary-700/50 dark:text-primary-300 dark:hover:bg-primary-600/50 border-transparent':
        !disabled && variant === 'light',
      'hover:bg-primary-300/50 text-primary-600 hover:dark:bg-primary-700/50 dark:text-primary-300 border-transparent':
        !disabled && variant === 'subtle',
      'bg-primary-300/50 dark:bg-primary-700/50 border-transparent':
        !disabled && variant === 'subtle' && active,
      // : "hover:bg-primary-300/40 hover:text-primary-500"
    },
    otherClasses,
  )

type ButtonProps = React.PropsWithoutRef<React.JSX.IntrinsicElements['button']> & DefaultProps

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'default',
      forIcon,
      compact = false,
      className,
      loading = false,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        {...props}
        disabled={props.disabled || loading}
        className={buttonClassNames(
          { compact, variant, forIcon, disabled: props.disabled },
          className,
        )}
      >
        {loading && <LoadingIcon />}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'

type ButtonLinkProps = React.PropsWithoutRef<React.JSX.IntrinsicElements['a']> &
  DefaultProps & { active?: boolean }

export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  (
    { children, variant = 'default', compact = false, className, forIcon, active, ...props },
    ref,
  ) => {
    return (
      <a
        ref={ref}
        {...props}
        className={buttonClassNames({ compact, variant, forIcon, active }, className)}
      >
        {children}
      </a>
    )
  },
)

ButtonLink.displayName = 'ButtonLInk'
