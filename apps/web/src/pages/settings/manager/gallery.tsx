import { useEffect } from 'react'
import type { NextPage } from 'next'
import { TrashIcon } from '@heroicons/react/24/outline'
import classNames from 'classnames'
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd'
import { Control, useFieldArray, UseFormRegister } from 'react-hook-form'
import { toast } from 'react-hot-toast'

import { adminGallerySettingValidator, z } from '@ideaslab/validator'

import { ChannelSelector } from '~/components/channel-selector'
import { Button, GripVerticalIcon } from '~/components/common'
import { Form, FormBlock, FormFieldBuilder, Input } from '~/components/form'
import { useForm } from '~/hooks/useForm'
import { SettingLayout } from '~/layouts'
import { trpc } from '~/utils'

const GallerySetting: NextPage = () => {
  const gallerySetting = trpc.admin.gallerySetting.useMutation({
    onError: (error) => {
      toast.error(error.message)
    },
  })
  const { data: settings } = trpc.admin.loadGallerySetting.useQuery()

  const form = useForm(adminGallerySettingValidator, {
    onSubmit: async (data) => {
      const list = data.categories.map((item, index) => ({ ...item, defaultOrder: index }))
      list.filter((item) => {
        if (!item.id) return true
        const target = settings?.categories.find((category) => category.id === item.id)
        if (!target) return true

        if (
          item.defaultOrder === target.defaultOrder &&
          item.name === target.name &&
          item.discordChannel === target.discordChannel
        )
          return false
        return true
      })
      settings?.categories.filter((category) => {
        if (!data.categories.find((item) => item.id === category.id)) {
          list.push({ ...category, delete: true })
        }
      })
      await gallerySetting.mutateAsync({ categories: list })
      toast.success('성공적으로 저장되었어요')
    },
  })

  useEffect(() => {
    if (form.getValues().categories?.length > 0) return
    if (!settings) return
    form.reset({
      categories: settings.categories.map(({ defaultOrder, discordChannel, name, id }) => ({
        defaultOrder,
        discordChannel,
        name,
        id,
      })),
    })
  }, [form, settings])

  const {
    control,
    registerForm,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = form

  return (
    <SettingLayout title="갤러리 설정" guard="adminOnly">
      <Form form={form} className="pt-4 md:pt-0 md:col-span-9 flex flex-col gap-y-4">
        <FieldArray
          control={control}
          register={registerForm}
          error={errors.categories?.message ?? ''}
        />
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
  control: Control<z.TypeOf<typeof adminGallerySettingValidator>>
  register: UseFormRegister<z.TypeOf<typeof adminGallerySettingValidator>>
  error: string
}) => {
  const { fields, append, move, remove } = useFieldArray({
    control,
    name: 'categories',
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
              placeholder="카테고리 이름"
              {...register(`categories.${index}.name`)}
            />
            <FormFieldBuilder name={`categories.${index}.discordChannel`}>
              {({ field: { onChange, onBlur, value }, error }) => (
                <ChannelSelector error={error} onChange={onChange} onBlur={onBlur} value={value} />
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
      label="카테고리 설정"
      description="갤러리 카테고리를 설정하세요."
      right={
        <Button
          variant="primary"
          onClick={() => append({ name: '', discordChannel: '', defaultOrder: 0 })}
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

export default GallerySetting
