import { z } from 'zod'

import { customErrorMap } from './error-map'

export const Visible = z.enum(['Public', 'MemberOnly'])

export const authLoginWithPinValidator = z.object({
  pin: z.string().min(6).max(6),
})

export const authLoginWithTokenValidator = z.object({
  token: z.string(),
})

export const linkValidator = z.object({
  name: z.string().min(1).max(20),
  url: z.url(),
})

export const authCheckHandleValidator = z.object({
  handle: z
    .string()
    .regex(/^[a-zA-Z0-9-]+$/)
    .min(3)
    .max(20),
})

export const authSignUpValidator = z.object({
  name: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[a-zA-Z0-9가-힣`~!@#$%^&*()-_=+]+$/),
  handle: z
    .string()
    .regex(/^[a-zA-Z0-9-]+$/)
    .min(3)
    .max(20),
  introduce: z.string().min(1).max(300),
  registerFrom: z.string().min(0).max(30),
  captcha: z.string(),
  links: z.array(linkValidator).min(0).max(6),
  roles: z.array(z.number()).min(0).max(20),
  defaultVisible: Visible.prefault('Public'),
  profileVisible: Visible.prefault('Public'),
})

export const authUpdateProfileValidator = z.object({
  name: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[a-zA-Z0-9가-힣`~!@#$%^&*()-_=+]+$/),
  handle: z
    .string()
    .regex(/^[a-zA-Z0-9-]+$/)
    .min(3)
    .max(20),
  introduce: z.string().min(1).max(300),
  links: z.array(linkValidator).min(0).max(6),
  roles: z.array(z.number()).min(0).max(20),
  defaultVisible: Visible.prefault('Public'),
  profileVisible: Visible.prefault('Public'),
})

export const adminGallerySettingValidator = z.object({
  categories: z.array(
    z.object({
      id: z.number().optional(),
      name: z.string().min(1).max(30),
      discordChannel: z.string().min(1).max(30),
      defaultOrder: z.number(),
      delete: z.boolean().optional(),
    }),
  ),
})

export const adminRoleSettingValidator = z.object({
  roles: z.array(
    z.object({
      id: z.number().optional(),
      name: z.string().min(1).max(30),
      discordRole: z.string().min(1).max(30),
      defaultOrder: z.number(),
      delete: z.boolean().optional(),
    }),
  ),
})

export const adminSaveSettingsValidator = z.object({
  settings: z.array(
    z.object({
      key: z.string().min(1).max(50),
      value: z.any().nullable(),
    }),
  ),
})

export const galleryPostsValidator = z.object({
  cursor: z.number().optional(),
  limit: z.number().min(10).max(50).prefault(50),
  categoryIds: z.array(z.number()).max(100).optional(),
  authorId: z.string().optional(),
  authorHandle: z.string().optional(),
})

export const InfoProfilesOrderBy = z.enum(['recentActive', 'recentJoin'])

export const infoProfilesValidator = z.object({
  cursor: z.string().optional(),
  limit: z.number().min(10).max(50).prefault(50),
  orderBy: InfoProfilesOrderBy.prefault('recentActive'),
  roles: z.array(z.number()).optional(),
})

export const detailStringValidator = z.object({
  id: z.string(),
})

export const detailValidator = z.object({
  id: z.number(),
})

export const statisticsVoiceLogValidator = z.object({
  startYear: z.number(),
  startMonth: z.number(),
  endYear: z.number(),
  endMonth: z.number(),
})

export const statisticsFocusVoiceLogValidator = z.object({
  focusDate: z
    .string()
    .regex(/^[0-9]{4}-[0-1][0-9]-[0-3][0-9]$/, 'yyyy-MM-dd 형식으로 입력해주세요.'),
})

export const statisticsMessageLogValidator = z.object({
  year: z.number().min(2022).max(2050),
})

z.config({
  customError: customErrorMap,
})
