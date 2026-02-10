import { useCallback } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { DeepRequired, FieldErrorsImpl, Resolver, useForm as useLibForm } from 'react-hook-form'
import {
  FieldPath,
  FieldValues,
  RegisterOptions,
  SubmitErrorHandler,
  SubmitHandler,
  UseFormProps,
  UseFormRegisterReturn,
} from 'react-hook-form'

import { z, ZodNumber, ZodObject, ZodOptional, ZodString } from '@ideaslab/validator'

type UseFormRegisterOption<
  TFieldValues extends FieldValues,
  TFieldName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = RegisterOptions<TFieldValues, TFieldName> &
  Partial<{
    customLabel?: string
  }>

export declare type UseFormRegister<TFieldValues extends FieldValues> = <
  TFieldName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(
  name: TFieldName,
  options?: UseFormRegisterOption<TFieldValues, TFieldName>,
) => UseFormRegisterReturn<TFieldName> & {
  error?: string
  required?: boolean
}

export const useForm = <TSchema extends z.ZodType<FieldValues, FieldValues>>(
  schema: TSchema,
  props?: UseFormProps<z.output<TSchema>> & {
    isLoading?: boolean
    onSubmit?: SubmitHandler<z.output<TSchema>>
    onInvalid?: SubmitErrorHandler<z.output<TSchema>>
  },
) => {
  const form = useLibForm<z.output<TSchema>>({
    ...props,
    resolver: zodResolver(schema) as Resolver<z.output<TSchema>>,
    mode: props?.mode ?? 'onChange',
  })

  const { errors } = form.formState
  const registerFormValue = useCallback(
    (name: string, options: Pick<RegisterOptions, 'required'>) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      const error: FieldErrorsImpl<DeepRequired<z.output<TSchema>>>[string] = name
        .split('.')
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        .reduce(
          (acc, cur) => (acc ? acc[isNaN(cur as number) ? cur : parseInt(cur)] : null),
          errors,
        )
      return {
        required: !!options?.required,
        error: (error?.message as string) ?? '',
      }
    },
    [errors],
  )

  const registerForm: UseFormRegister<z.output<TSchema>> = (name, options = {}) => {
    let target: z.ZodType | null = null

    const inputProps: React.PropsWithoutRef<JSX.IntrinsicElements['input']> = {}

    if (schema instanceof ZodObject) target = schema.shape[name] ?? null

    if (target) {
      if (target instanceof ZodOptional) {
        const unwrapped = target.unwrap()
        target = unwrapped instanceof ZodString || unwrapped instanceof ZodNumber ? unwrapped : null
      } else {
        options.required = true
      }
      if (target instanceof ZodString) {
        if (target.format === 'email') {
          inputProps.type = 'email'
        }
        if (target.maxLength != null) {
          inputProps.maxLength = target.maxLength
        }
      } else if (target instanceof ZodNumber) {
        if (target.maxValue != null) {
          inputProps.max = target.maxValue
        }
      }
    }

    inputProps.key = props?.isLoading ? `not-loaded-${name}` : `loaded-${name}`
    inputProps.disabled = props?.isLoading ? true : inputProps.disabled

    return {
      ...inputProps,
      ...form.register(name, options),
      ...registerFormValue(name, options),
    }
  }

  return { ...form, onSubmit: props?.onSubmit, registerForm, onInvalid: props?.onInvalid }
}
