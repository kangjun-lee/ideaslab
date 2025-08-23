import { useEffect } from 'react'
import type { NextPage } from 'next'
import { TrashIcon } from '@heroicons/react/24/outline'
import classNames from 'classnames'
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd'
import { Control, useFieldArray, UseFormRegister } from 'react-hook-form'
import { toast } from 'react-hot-toast'

import { adminRoleSettingValidator, z } from '@ideaslab/validator'

import { Button, GripVerticalIcon } from '~/components/common'
import { Form, FormBlock, FormFieldBuilder, Input } from '~/components/form'
import { RoleSelector } from '~/components/role-selector'
import { useForm } from '~/hooks/useForm'
import { SettingLayout } from '~/layouts'
import { trpc } from '~/utils'

const RoleSetting: NextPage = () => {
  const rolesSetting = trpc.admin.saveRoles.useMutation({
    onError: (error) => {
      toast.error(error.message)
    },
  })
  const { data: roles } = trpc.admin.loadRoles.useQuery()

  const form = useForm(adminRoleSettingValidator, {
    onSubmit: async (data) => {
      const list = data.roles.map((item, index) => ({ ...item, defaultOrder: index }))
      list.filter((item) => {
        if (!item.id) return true
        const target = roles?.find((role) => role.id === item.id)
        if (!target) return true

        if (
          item.defaultOrder === target.defaultOrder &&
          item.name === target.name &&
          item.discordRole === target.discordRole
        )
          return false
        return true
      })
      await rolesSetting.mutateAsync({ roles: list })
      toast.success('성공적으로 저장되었어요')
    },
  })

  useEffect(() => {
    if (form.getValues().roles?.length > 0) return
    if (!roles) return
    form.reset({
      roles: roles.map(({ defaultOrder, discordRole, name, id }) => ({
        id,
        defaultOrder,
        discordRole,
        name,
      })),
    })
  }, [form, roles])

  const {
    control,
    registerForm,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = form

  return (
    <SettingLayout title="갤러리 설정" guard="adminOnly">
      <Form form={form} className="pt-4 md:pt-0 md:col-span-9 flex flex-col gap-y-4">
        <FieldArray control={control} register={registerForm} error={errors.roles?.message ?? ''} />
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

const FieldArray = ({
  control,
  register,
  error,
}: {
  control: Control<z.TypeOf<typeof adminRoleSettingValidator>>
  register: UseFormRegister<z.TypeOf<typeof adminRoleSettingValidator>>
  error: string
}) => {
  const { fields, append, move, remove } = useFieldArray({
    control,
    name: 'roles',
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
          <div className="flex flex-col w-full justify-between gap-y-2 pr-2">
            <Input
              className="w-full"
              placeholder="역할 이름"
              {...register(`roles.${index}.name`)}
            />
            <FormFieldBuilder name={`roles.${index}.discordRole`}>
              {({ field: { onChange, onBlur, value }, error }) => (
                <RoleSelector error={error} onChange={onChange} onBlur={onBlur} value={value} />
              )}
            </FormFieldBuilder>
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
      label="역할 설정"
      description="사용자의 역할을 설정하세요."
      right={
        <Button
          variant="primary"
          onClick={() => append({ name: '', discordRole: '', defaultOrder: 0 })}
        >
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

export default RoleSetting
