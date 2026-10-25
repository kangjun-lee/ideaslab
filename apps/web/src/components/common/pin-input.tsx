import type { JSX } from 'react'
import { forwardRef } from 'react'

interface Props {
  name: string
  onEnterAll: (value: string) => void
  error?: boolean
}

const Input = forwardRef<HTMLInputElement, React.PropsWithoutRef<JSX.IntrinsicElements['input']>>(
  (props, ref) => {
    return (
      <input
        ref={ref}
        type="number"
        className="block default-ring border border-base-color w-10 h-10 rounded-lg dark:bg-gray-800 dark:text-gray-200 font-bold text-lg text-center no-spin"
        {...props}
      />
    )
  },
)

Input.displayName = 'PinInput'

export const PinInput = ({ name, onEnterAll }: Props) => {
  const length = 6
  return (
    <div className="flex flex-row gap-2 w-full items-center justify-center">
      {new Array(length).fill(0).map((_, i) => (
        <Input
          key={i}
          id={`${name}-${i}`}
          onKeyDown={(evt) => {
            evt.preventDefault()

            const prev = document.getElementById(`${name}-${i - 1}`) as HTMLInputElement | undefined
            const next = document.getElementById(`${name}-${i + 1}`) as HTMLInputElement | undefined

            const checkAndSubmit = () => {
              if (i !== length - 1) return
              let result = ''
              for (let i = 0; i < length; i++) {
                const element = document.getElementById(`${name}-${i}`) as HTMLInputElement
                const value = element?.value
                element.value = ''
                if (value.length < 1) return
                result += value
              }
              evt.currentTarget.blur()
              onEnterAll(result)
            }

            if (evt.key === 'ArrowLeft') {
              if (i > 0 && prev) {
                prev.focus()
                prev.select()
                return
              }
            }
            if (evt.key === 'ArrowRight' || evt.key === 'Tab') {
              if (i < length - 1 && next) {
                next.focus()
                next.select()
              }
              return
            }

            if (evt.key === 'Backspace') {
              if (evt.currentTarget.value.length > 0) {
                evt.currentTarget.value = ''
                if (i > 0 && prev) {
                  prev.focus()
                  prev.select()
                }
                return
              }
              if (i > 0 && prev) {
                prev.value = ''
                prev.focus()
              }
              return
            }

            if (isNaN(evt.key as any)) return

            if (evt.currentTarget.value.length > 0) {
              evt.currentTarget.value = evt.key
              if (i < length - 1 && next) {
                next.focus()
                checkAndSubmit()
              }
              return
            }

            evt.currentTarget.value = evt.key
            if (i < length - 1 && next) next.focus()
            checkAndSubmit()
          }}
        />
      ))}
    </div>
  )
}
