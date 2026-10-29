import { createContext, Dispatch, SetStateAction, useCallback, useState } from 'react'
import classNames from 'classnames'

interface Props {
  currentStep: number
  list: string[]
  className: string
}

export const Step = ({ currentStep, list, className }: Props) => {
  return (
    <div className={classNames('space-y-2', className)}>
      <h3 className="text-base font-semibold">{list[currentStep - 1]}</h3>
      <div className="flex max-w-xs space-x-3">
        {list.map((_, index) => (
          <span
            key={index}
            className={classNames('w-12 h-2 rounded-xs ', {
              'bg-primary-600 dark:bg-primary-400': index + 1 < currentStep,
              'bg-primary-900 dark:bg-gray-100': index + 1 === currentStep,
              'bg-gray-300 dark:bg-gray-600': index + 1 > currentStep,
            })}
          />
        ))}
      </div>
    </div>
  )
}

const StepContext = createContext<{
  step: number
  setStep: Dispatch<SetStateAction<number>>
  next: () => void
  prev: () => void
}>({
  step: 1,
  setStep: () => {},
  next: () => {},
  prev: () => {},
})

export const StepWrapper = ({ children }: { children: React.ReactNode }) => {
  const [step, setStep] = useState(1)
  const next = useCallback(() => {
    setStep((step) => step + 1)
  }, [setStep])

  const prev = useCallback(() => {
    setStep((step) => step - 1)
  }, [setStep])

  return (
    <StepContext.Provider value={{ step, setStep, next, prev }}>{children}</StepContext.Provider>
  )
}

export type StepContentProps = {
  next: () => void
  prev: () => void
  step: number
}

export const StepContent = ({
  displayOn,
  children: Children,
}: {
  displayOn?: number
  children: ({ next, prev, step }: StepContentProps) => React.ReactElement
}) => (
  <StepContext.Consumer>
    {(props) => (
      <>{(props.step === displayOn || displayOn === undefined) && <Children {...props} />}</>
    )}
  </StepContext.Consumer>
)
