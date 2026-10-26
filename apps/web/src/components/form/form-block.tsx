import type { JSX } from 'react'
import { ReactNode, useMemo } from 'react'
import classNames from 'classnames'

export interface FormBlockProps {
  label?: string
  description?: string
  error?: string
  children?: ReactNode
  required?: boolean
  name?: string
  customLabel?: any
  labelRight?: JSX.Element
  labelClassName?: string
  right?: JSX.Element
  noWrap?: boolean
}

export const FormBlock = ({
  label,
  description,
  children,
  error,
  customLabel: CustomLabel,
  labelClassName,
  required,
  name,
  labelRight,
  right,
  noWrap = false,
}: FormBlockProps) => {
  const labelContent = useMemo(
    () => (
      <>
        <div className="flex justify-between">
          <>
            {CustomLabel ? (
              <CustomLabel htmlFor={name} className="text-title-color">
                {label}
              </CustomLabel>
            ) : (
              <label htmlFor={name} className="text-title-color">
                {label}
                {required && <span className="text-error-color ml-1">*</span>}
              </label>
            )}
            <div className="text-subtitle-color">{labelRight}</div>
          </>
        </div>
        {description && <div className="text-sm text-description-color">{description}</div>}
      </>
    ),
    [CustomLabel, description, label, labelRight, name, required],
  )

  const content = useMemo(
    () => (
      <>
        {label && (
          <>
            {right ? (
              <div className="flex justify-between items-center">
                <div>{labelContent}</div>
                <div>{right}</div>
              </div>
            ) : (
              labelContent
            )}
          </>
        )}
        {label ? (
          <div className={classNames('mt-1.5 mx-0.5 flex flex-col gap-1')}>{children}</div>
        ) : (
          children
        )}
        {error && (
          <div className={classNames('text-error-color text-sm', error && 'mt-1')}>{error}</div>
        )}
      </>
    ),
    [children, error, label, labelContent, right],
  )

  if (noWrap) return content

  return <div className={labelClassName}>{content}</div>
}

export const formBlockPropsRemover = <T,>(props: T & Partial<FormBlockProps>) => {
  const {
    label: _label,
    required: _required,
    error: _error,
    children: _children,
    customLabel: _customLabel,
    ...otherProps
  } = props
  return otherProps
}
