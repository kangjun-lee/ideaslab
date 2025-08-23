import { useEffect } from 'react'
import type { NextPage } from 'next'
import { TrashIcon } from '@heroicons/react/24/outline'
import classNames from 'classnames'
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd'
import { Control, useFieldArray } from 'react-hook-form'
import toast from 'react-hot-toast'

import { authUpdateProfileValidator, z } from '@ideaslab/validator'

import { Button, GripVerticalIcon } from '~/components/common'
import { Form, FormBlock, FormFieldBuilder, Input, Select, Textarea } from '~/components/form'
import { useForm, UseFormRegister, useUser } from '~/hooks'
import { SettingLayout } from '~/layouts'
import { trpc } from '~/utils'

const ProfileSetting: NextPage = () => {
  const profile = useUser()

  const { data: artistRoles } = trpc.info.artistRoles.useQuery(undefined, {
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  })

  const profileUpdate = trpc.auth.updateProfile.useMutation({
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const form = useForm(authUpdateProfileValidator, {
    isLoading: !profile,
    onSubmit: async (data) => {
      await profileUpdate.mutateAsync(data)
      toast.success('성공적으로 프로필이 변경되었어요')
    },
  })

  const {
    control,
    registerForm,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = form

  useEffect(() => {
    if (form.formState.defaultValues?.name) return
    if (!profile) return
    form.reset({
      name: profile?.name,
      handle: profile?.handleDisplay,
      introduce: profile?.introduce,
      roles: profile?.roles?.map((role) => role.id),
      links: profile?.links as any,
      defaultVisible: profile?.defaultVisible,
      profileVisible: profile?.profileVisible,
    })
  }, [form, profile])

  return (
    <SettingLayout title="프로필 설정" guard="authOnly">
      <Form form={form} className="pt-4 md:pt-0 md:col-span-9 flex flex-col gap-y-4">
        <Input
          label="디스코드 유저 정보"
          description="연결된 디스코드 계정의 정보에요."
          disabled={true}
          value={`${profile?.username}`}
        />
        <Input
          label="닉네임"
          description="아이디어스랩에서 사용하게 될 닉네임이에요. 알파벳, 한글, 숫자, 특수문자를 사용할 수 있어요"
          {...registerForm('name')}
        />
        <Input
          label="핸들"
          description="프로필 URL에서 사용될 문자에요. 언제든 변경할 수 있어요. 알파벳, 숫자만 사용 가능합니다"
          prefix="https://ideaslab.kr/@"
          {...registerForm('handle')}
        />
        <Textarea
          label="자기소개"
          description="간단하게 소개 문구를 입력해주세요!"
          placeholder="예시) 안녕하세요! 게임개발을 하고있는 ??라고 합니다."
          {...registerForm('introduce')}
        />
        <Links control={control} register={registerForm} error={errors.links?.message ?? ''} />
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
        <div className="flex justify-end gap-x-2">
          <Button disabled={!isDirty} onClick={() => reset()}>
            취소
          </Button>
          <Button variant="primary" type="submit" disabled={!isDirty} loading={isSubmitting}>
            저장
          </Button>
        </div>
      </Form>
    </SettingLayout>
  )
}

const Links = ({
  control,
  register,
  error,
}: {
  control: Control<z.TypeOf<typeof authUpdateProfileValidator>>
  register: UseFormRegister<z.TypeOf<typeof authUpdateProfileValidator>>
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

export default ProfileSetting
