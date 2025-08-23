import { Fragment } from 'react'
import React from 'react'
import type { NextPage } from 'next'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { TrashIcon } from '@heroicons/react/20/solid'
import classNames from 'classnames'
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd'
import { Control, useFieldArray, UseFormRegister } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { ReactMarkdown } from 'react-markdown/lib/react-markdown'

import { authSignUpValidator, z } from '@ideaslab/validator'

import { Button, GripVerticalIcon } from '~/components/common'
import { Step, StepContent, StepContentProps, StepWrapper } from '~/components/common/step'
import { Form, FormFieldBuilder, Input, Select } from '~/components/form'
import { FormBlock } from '~/components/form/form-block'
import { Textarea } from '~/components/form/textarea'
import { useUser } from '~/hooks/useAuth'
import { useForm } from '~/hooks/useForm'
import { useCurrentTheme } from '~/hooks/useTheme'
import { trpc } from '~/utils'

import { MainLayout } from '../layouts'

const Signup: NextPage = () => {
  return (
    <MainLayout title="회원가입 하기" showTitle tinyContainer guard="unverifyOnly">
      <StepWrapper>
        <StepContent>{StepList}</StepContent>
        <div className="card px-4 py-4 mt-8 flex flex-col justify-between sm:min-h-[700px]">
          <StepContent displayOn={1}>{Intro}</StepContent>
          <StepContent displayOn={2}>{Policy}</StepContent>
          <StepContent displayOn={3}>{Rule}</StepContent>
          <StepContent displayOn={4}>{SignupForm}</StepContent>
          <StepContent displayOn={5}>{Complete}</StepContent>
        </div>
      </StepWrapper>
    </MainLayout>
  )
}

export default Signup

const StepList = ({ step }: StepContentProps) => (
  <Step
    className="mt-2"
    currentStep={step}
    list={[
      '1. 아이디어스 랩에 오신것을 환영합니다!',
      '2. 약관동의',
      '3. 이용 규칙',
      '4. 자기소개 입력',
      '6. 가입완료',
    ]}
  />
)

const Intro = ({ next }: StepContentProps) => {
  const userData = useUser()
  return (
    <>
      <div className="mx-auto px-4 text-center md:px-10 lg:px-32 xl:max-w-3xl h-full flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <h1 className="text-4xl font-bold sm:text-5xl">
            <div>{userData?.name}님,</div>
            <div className="my-1.5">
              <span className="title-highlight">아이디어스랩</span>에
            </div>
            오신것을 환영합니다!
          </h1>
          <p className="px-8 mt-8 mb-12 text-lg">
            오래 걸리지 않아요! 간단하게 질문에 대답해주세요.
          </p>
        </div>
      </div>
      <div className="flex justify-between w-full mt-4">
        <div></div>
        <Button variant="primary" onClick={next}>
          시작하기
        </Button>
      </div>
    </>
  )
}

const Policy = ({ prev, next }: StepContentProps) => {
  const { data: privacyPolicy } = trpc.info.privacyPolicy.useQuery(undefined, {
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })

  return (
    <>
      <div className="w-full">
        <div>아이디어스랩 서버를 이용하기 위해서는 약관 동의가 필요해요</div>
        <div className="flex justify-between mt-2 items-center">
          <div className="text-3xl font-bold mt-4 mb-2">개인정보 처리방침</div>
        </div>
        <ReactMarkdown className="markdown w-full px-1.5 py-1 bg-gray-100 dark:bg-gray-800 border-base-color border-2 rounded-lg mx-1">
          {privacyPolicy ?? '불러오는 중...'}
        </ReactMarkdown>
      </div>
      <div className="flex justify-between w-full mt-4">
        <Button variant="default" onClick={prev}>
          뒤로가기
        </Button>
        <Button variant="primary" onClick={next}>
          동의하고 계속하기
        </Button>
      </div>
    </>
  )
}

const Rule = ({ prev, next }: StepContentProps) => {
  const { data: serverRule } = trpc.info.serverRule.useQuery(undefined, {
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })

  return (
    <>
      <div className="w-full">
        <div>디스코드 서버를 이용하면서, 아래 내용은 반드시 지켜주세요!</div>
        <div className="flex justify-between mt-2 items-center">
          <div className="text-3xl font-bold mt-4 mb-2">서버 규칙</div>
        </div>
        <div className="w-full px-1.5 py-1 bg-gray-100 dark:bg-gray-800 border-base-color border-2 rounded-lg mx-1">
          {serverRule?.split('\n').map((line, i) => (
            <span key={i} className={classNames(line.match(/^[0-9]+/) && 'font-bold')}>
              {line.split('**').map((text, i) => {
                if (i % 2 === 0) return <Fragment key={i}>{text}</Fragment>
                if (text.startsWith('!')) {
                  return (
                    <span className="font-bold title-highlight-red" key={i}>
                      {text.substring(1)}
                    </span>
                  )
                }
                return (
                  <span className="font-bold title-highlight" key={i}>
                    {text}
                  </span>
                )
              })}
              <br />
            </span>
          ))}
        </div>
      </div>
      <div className="flex justify-between w-full mt-4">
        <Button variant="default" onClick={prev}>
          뒤로가기
        </Button>
        <Button variant="primary" onClick={next}>
          동의하고 계속하기
        </Button>
      </div>
    </>
  )
}

const Complete = ({ next: _ }: StepContentProps) => (
  <div className="mx-auto px-4 sm:px-4 py-8 text-center md:px-10 lg:px-32 xl:max-w-3xl h-full flex-1 flex items-center justify-center">
    <div className="flex flex-col items-center">
      <h1 className="text-2xl sm:text-4xl font-bold md:text-5xl">
        <div className="mb-1.5">
          <span className="title-highlight">아이디어스랩</span>에
        </div>
        가입하신것을 환영합니다!
      </h1>
      <p className="sm:px-2 mt-8 text-lg break-words">
        디스코드로 돌아가 즐거운 아이디어스 랩 활동을 시작하세요.
      </p>
    </div>
  </div>
)

const SignupForm = ({ prev, next }: StepContentProps) => {
  const userData = useUser()
  const theme = useCurrentTheme()

  const { data: artistRoles } = trpc.info.artistRoles.useQuery(undefined, {
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })

  const submit = trpc.auth.signup.useMutation({
    onSuccess: () => {
      toast.success('성공적으로 회원가입을 완료하였어요.')
    },
    onError: (err) => {
      toast.error(`가입중 문제가 발생하였어요.\n${err.message}`)
    },
  })

  const checkHandle = trpc.auth.checkHandle.useMutation()

  const form = useForm(authSignUpValidator, {
    onSubmit: async (data) => {
      await submit.mutateAsync(data)
      next()
    },
    onInvalid: (errors) => {
      if (Object.keys(errors).length === 1 && errors.captcha) {
        toast.error('캡챠를 확인해주세요.')
      }
    },
    defaultValues: {
      handle: userData?.userId,
      name: userData?.name,
      roles: [],
      defaultVisible: 'Public',
      profileVisible: 'Public',
    },
  })

  const {
    registerForm,
    control,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = form

  return (
    <Form form={form} className="flex-1 flex flex-col justify-between">
      <div className="h-full flex-1 flex flex-col gap-y-4 w-full">
        <div>자기소개를 남겨주세요!</div>
        <Input
          label="닉네임"
          description="아이디어스랩에서 사용하게 될 닉네임이에요. 알파벳, 한글, 숫자, 특수문자를 사용할 수 있어요"
          {...registerForm('name')}
        />
        <Input
          label="핸들"
          description="URL에서 사용될 id에요. 언제든 변경할 수 있어요. 알파벳, 숫자만 사용 가능합니다"
          prefix="https://ideaslab.kr/@"
          {...registerForm('handle')}
          onBlurCapture={async (e) => {
            if (!e.currentTarget.value) return
            const parsed = authSignUpValidator.shape.handle.safeParse(e.currentTarget.value)
            if (!parsed.success) return

            const res = await checkHandle.mutateAsync({ handle: e.currentTarget.value })
            if (res.valueOf()) return
            setError('captcha', { type: 'manual', message: '이미 사용중인 주소에요.' })
          }}
        />
        <FormFieldBuilder name="registerFrom">
          {({ field: { name, onChange, value }, error }) => (
            <Select
              label="가입경로"
              description="어떻게 아이디어스랩에 가입하게 되셨나요?"
              required
              name={name}
              value={value}
              error={error}
              onChange={onChange}
              options={[
                { label: '디스보드', value: '디스보드' },
                { label: '지인 추천', value: '지인 추천' },
                { label: '인터넷 검색', value: '인터넷 검색' },
                { label: '기타', value: '기타' },
              ]}
            />
          )}
        </FormFieldBuilder>
        <FormBlock
          label="역할"
          description="본인이 창작하는 분야를 선택해주세요. 여러개 선택할 수 있으며 선택하지 않아도 괜찮아요. (선택한 모든 분야의 창작활동을 하지 않는 한, 모든 역할을 선택하지 마세요. 장난이라 판단될 경우 경고 및 차단조치가 이루어질 수 있어요)"
        >
          <FormFieldBuilder name="roles">
            {({ field: { value, onChange } }) => (
              <div className="flex gap-3 flex-wrap">
                {artistRoles?.map((role) => (
                  <div
                    key={role.id}
                    className={classNames(
                      'tag hover',
                      (value ?? []).includes(role.id) && 'primary',
                    )}
                    onClick={() =>
                      onChange(
                        (value ?? []).includes(role.id)
                          ? value.filter((item: number) => item !== role.id)
                          : [...((value as unknown as number[]) ?? []), role.id],
                      )
                    }
                  >
                    {role.name}
                  </div>
                ))}
              </div>
            )}
          </FormFieldBuilder>
        </FormBlock>

        <Textarea
          label="자기소개"
          description="간단하게 소개 문구를 입력해주세요!"
          placeholder="예시) 안녕하세요! 게임개발을 하고있는 ??라고 합니다."
          {...registerForm('introduce')}
        />
        <FieldArray
          control={control}
          register={registerForm}
          error={errors?.links?.message ?? ''}
        />
        <FormFieldBuilder name="profileVisible">
          {({ field: { name, onChange, value }, error }) => (
            <Select
              label="프로필 공개범위"
              description="프로필을 공개할지/비공개로 할지 설정할 수 있어요."
              options={[
                { label: '공개', value: 'Public' },
                {
                  label: '맴버 전용 (오직 아이디어스랩 회원만 프로필을 확인할 수 있어요)',
                  value: 'MemberOnly',
                },
              ]}
              value={value}
              name={name}
              onChange={onChange}
              error={error}
            />
          )}
        </FormFieldBuilder>
        <FormFieldBuilder name="defaultVisible">
          {({ field: { name, onChange, value }, error }) => (
            <Select
              label="기본 갤러리 공개범위"
              description="갤러리에 글을 올릴 때의 기본 공개범위를 설정해요. (글을 올린 후 언제든지 변경할 수 있어요)"
              options={[
                { label: '공개', value: 'Public' },
                {
                  label: '맴버 전용 (오직 아이디어스랩 회원만 글을 확인할 수 있어요)',
                  value: 'MemberOnly',
                },
              ]}
              value={value}
              name={name}
              onChange={onChange}
              error={error}
            />
          )}
        </FormFieldBuilder>

        <FormBlock
          label="캡챠"
          description="자동 가입을 방지하기 위해 클릭해주세요."
          error={watch('captcha') === '' ? '캡챠를 클릭해 주세요.' : ''}
        >
          {process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY && (
            <HCaptcha
              sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY}
              theme={theme}
              languageOverride="ko"
              onVerify={(token) => {
                console.log(token)
                setValue('captcha', token)
              }}
            />
          )}
        </FormBlock>
      </div>
      <div className="flex justify-between w-full mt-4">
        <Button variant="default" onClick={prev}>
          뒤로가기
        </Button>
        <Button variant="primary" type="submit" loading={isSubmitting}>
          가입하기
        </Button>
      </div>
    </Form>
  )
}

const FieldArray = ({
  control,
  register,
  error,
}: {
  control: Control<z.TypeOf<typeof authSignUpValidator>>
  register: UseFormRegister<z.TypeOf<typeof authSignUpValidator>>
  error: string
}) => {
  const { fields, append, move, remove } = useFieldArray({
    control,
    name: 'links',
  })

  const items = fields.map((item, index) => (
    <Draggable key={item.id} index={index} draggableId={item.id}>
      {(provided, snapshot) => (
        <div
          className={classNames('flex items-center card px-2 py-2 mb-2', {
            'shadow-lg': snapshot.isDragging,
          })}
          ref={provided.innerRef}
          {...provided.draggableProps}
        >
          <div
            {...provided.dragHandleProps}
            className="flex items-center justify-center h-full px-2"
          >
            <GripVerticalIcon width={18} height={18} />
          </div>
          <div className="flex w-full justify-between gap-x-2 pr-2">
            <Input
              labelClassName="w-full"
              className="w-full"
              placeholder="트위터"
              {...register(`links.${index}.name`)}
            />
            <Input
              labelClassName="w-full"
              className="w-full"
              placeholder="https://twitter.com/......"
              {...register(`links.${index}.url`)}
            />
          </div>
          <Button variant="subtle" className="mr-2" forIcon onClick={() => remove(index)}>
            <TrashIcon width={18} height={18} />
          </Button>
        </div>
      )}
    </Draggable>
  ))

  return (
    <FormBlock
      label="링크"
      description="작업링크 / SNS 들을 연결할 수 있어요. 6개까지 입력 가능해요."
      right={
        <Button variant="primary" onClick={() => append({ name: '', url: '' })}>
          추가
        </Button>
      }
      error={error}
    >
      <DragDropContext
        onDragEnd={({ source, destination }) => move(source.index, destination?.index || 0)}
      >
        <Droppable droppableId="list" direction="vertical">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {items}
              {provided.placeholder?.toString()}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </FormBlock>
  )
}
