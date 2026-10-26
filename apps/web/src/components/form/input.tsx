import { forwardRef, useMemo, useState } from 'react'
import React from 'react'
import classNames from 'classnames'

import { FormBlock, FormBlockProps, formBlockPropsRemover } from './form-block'

interface Props
  extends React.PropsWithoutRef<React.JSX.IntrinsicElements['input']>,
    FormBlockProps {
  type?: 'text' | 'password' | 'email' | 'number'
  prefix?: string
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ className, max, maxLength: _maxLength, prefix, ...props }, ref) => {
    const [value, setValue] = useState('')
    const inputProps = formBlockPropsRemover(props)

    const labelRight = useMemo(() => {
      if (!max) return <></>
      const maxNum = typeof max === 'number' ? max : parseInt(max)
      const strLen = value.length ?? 0
      if (maxNum && strLen >= maxNum * 0.9) {
        return (
          <div
            className={classNames(strLen > maxNum ? 'text-error-color' : 'text-description-color')}
          >{`${strLen} / ${max}`}</div>
        )
      }
      return <></>
    }, [value, max])

    return (
      <FormBlock {...props} labelRight={labelRight}>
        {prefix ? (
          <div className={classNames('flex')}>
            <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600">
              {prefix}
            </span>
            <input
              ref={ref}
              autoComplete="off"
              {...inputProps}
              onChange={(e) => {
                if (typeof inputProps.onChange === 'function') inputProps.onChange(e)
                setValue(e.target.value)
              }}
              className={classNames(
                'block px-4 py-2 rounded-none rounded-r-lg w-full border',
                'dark:bg-gray-800/60 dark:text-white',
                props.error ? 'border-error-color error-ring' : 'border-base-color default-ring',
              )}
            />
          </div>
        ) : (
          <input
            ref={ref}
            autoComplete="off"
            {...inputProps}
            onChange={(e) => {
              if (typeof inputProps.onChange === 'function') inputProps.onChange(e)
              setValue(e.target.value)
            }}
            className={classNames(
              'block px-4 py-2 rounded-lg border',
              'dark:bg-gray-800/60 dark:text-white',
              props.error ? 'border-error-color error-ring' : 'border-base-color default-ring',
              className,
            )}
          />
        )}
      </FormBlock>
    )
  },
)

Input.displayName = 'Input'
