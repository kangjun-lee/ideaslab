'use client'

import { useEffect } from 'react'
import type { NextPage } from 'next'
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import { TrashIcon } from '@heroicons/react/24/outline'
import classNames from 'classnames'
import { Control, useFieldArray, UseFormRegister } from 'react-hook-form'
import { toast } from 'react-hot-toast'

import { adminGallerySettingValidator, z } from '@ideaslab/validator'

import { ChannelSelector } from '~/components/channel-selector'
import { Button, GripVerticalIcon, Skeleton } from '~/components/common'
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
  const { data: settings, isLoading } = trpc.admin.loadGallerySetting.useQuery()

  const form = useForm(adminGallerySettingValidator, {
    onSubmit: async (data) => {
      const list = data.categories.map((item, index) => ({ ...item, defaultOrder: index }))
      list.filter((item) => {
        if (!item.id) return true
        const target = settings?.categories.find(
          (category: { id: number; defaultOrder: number; name: string; discordChannel: string }) =>
            category.id === item.id,
        )
        if (!target) return true

        if (
          item.defaultOrder === target.defaultOrder &&
          item.name === target.name &&
          item.discordChannel === target.discordChannel
        )
          return false
        return true
      })
      settings?.categories.filter(
        (category: { id: number; defaultOrder: number; name: string; discordChannel: string }) => {
          if (!data.categories.find((item) => item.id === category.id)) {
            list.push({ ...category, delete: true })
          }
        },
      )
      await gallerySetting.mutateAsync({ categories: list })
      toast.success('성공적으로 저장되었어요')
    },
  })

  useEffect(() => {
    if (form.getValues().categories?.length > 0) return
    if (!settings) return
    form.reset({
      categories: settings.categories.map(
        ({
          defaultOrder,
          discordChannel,
          name,
          id,
        }: {
          defaultOrder: number
          discordChannel: string
          name: string
          id: number
        }) => ({
          defaultOrder,
          discordChannel,
          name,
          id,
        }),
      ),
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
      {isLoading || !settings ? (
        <div className="flex flex-col gap-y-5">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      ) : (
        <Form form={form} className="flex max-w-3xl flex-col gap-y-6">
          <FieldArray
            control={control}
            register={registerForm}
            error={errors.categories?.message ?? ''}
          />
          <div className="flex justify-end gap-x-2 border-t border-(color:--color-rule) pt-5">
            <Button type="button" disabled={!isDirty} onClick={() => reset()}>
              취소
            </Button>
            <Button variant="primary" type="submit" disabled={!isDirty} loading={isSubmitting}>
              저장
            </Button>
          </div>
        </Form>
      )}
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
          className={classNames(
            'mb-2 flex items-center rounded-[var(--radius-control)] bg-[var(--color-paper-2)] px-2 py-3',
            {
              'ring-2 ring-[var(--color-accent)]': snapshot.isDragging,
            },
          )}
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
          <Button
            type="button"
            variant="subtle"
            className="mr-2"
            forIcon
            onClick={() => remove(index)}
          >
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
          type="button"
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
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </FormBlock>
  )
}

export default GallerySetting
