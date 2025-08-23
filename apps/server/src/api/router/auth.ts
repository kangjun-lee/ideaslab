import { TRPCError } from '@trpc/server'
import axios from 'axios'
import { ChannelType } from 'discord.js'

import { dbClient, DefaultVisible } from '@ideaslab/db'
import {
  authCheckHandleValidator,
  authLoginWithPinValidator,
  authLoginWithTokenValidator,
  authSignUpValidator,
  authUpdateProfileValidator,
} from '@ideaslab/validator'

import {
  loginedProcedure,
  unverifiedOnlyProcedure,
  verifiedProcedure,
} from '~/api/base/auth-middleware'
import { publicProcedure, router } from '~/api/base/trpc'
import { client, currentGuildMember } from '~/bot/base/client'
import config from '~/config'
import { loginWithPin, loginWithToken } from '~/service/auth'
import { getSetting } from '~/service/setting'
import { ignoreError } from '~/utils'
import { Embed } from '~/utils/embed'

export const authRouter = router({
  loginWithPin: publicProcedure
    .input(authLoginWithPinValidator)
    .mutation(async ({ ctx, input }) => {
      const user = await loginWithPin(input.pin)
      if (!user) return { success: false }

      const dbUser = await dbClient.user.findUnique({
        where: { discordId: user.userId },
        select: { discordId: true },
      })

      ctx.session.id = user.userId
      ctx.session.isAdmin = user.isAdmin
      ctx.session.verified = !!dbUser
      await ctx.session.save()
      return { success: true }
    }),
  loginWithToken: publicProcedure
    .input(authLoginWithTokenValidator)
    .mutation(async ({ ctx, input }) => {
      const user = await loginWithToken(input.token)
      if (!user) return { success: false }

      const dbUser = await dbClient.user.findUnique({
        where: { discordId: user.userId },
        select: { discordId: true },
      })

      ctx.session.id = user.userId
      ctx.session.isAdmin = user.isAdmin
      ctx.session.verified = !!dbUser
      await ctx.session.save()
      return { success: true }
    }),
  logout: loginedProcedure.mutation(async ({ ctx }) => {
    ctx.session.destroy()
    return { success: true }
  }),
  profile: loginedProcedure.query(async ({ ctx }) => {
    const user = await dbClient.user.findUnique({
      where: { discordId: ctx.session.id },
      select: {
        discordId: true,
        avatar: true,
        roles: true,
        introduce: true,
        links: true,
        handleDisplay: true,
        defaultVisible: true,
        profileVisible: true,
      },
    })

    const member = await currentGuildMember(ctx.session.id)
    const name = member.displayName
    const avatar = member.displayAvatarURL()
    const username = member.user.username

    if (user && user.avatar !== avatar) {
      await ignoreError(
        dbClient.user.update({
          where: { discordId: ctx.session.id },
          data: {
            avatar,
          },
        }),
      )
    }

    return {
      userId: ctx.session.id,
      isAdmin: ctx.session.isAdmin,
      name,
      avatar,
      username,
      roles: user?.roles,
      introduce: user?.introduce,
      isVerified: user ? true : false,
      links: user?.links,
      handleDisplay: user?.handleDisplay,
      defaultVisible: user?.defaultVisible,
      profileVisible: user?.profileVisible,
    }
  }),
  checkHandle: publicProcedure.input(authCheckHandleValidator).mutation(async ({ input }) => {
    const user = await dbClient.user.findUnique({
      where: { handle: input.handle.toLowerCase() },
    })
    if (user) return false
    return true
  }),
  signup: unverifiedOnlyProcedure.input(authSignUpValidator).mutation(async ({ ctx, input }) => {
    const res = await axios.post(
      'https://hcaptcha.com/siteverify',
      `response=${input.captcha}&secret=${config.hCaptchaSecretKey}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
          'Accept-Encoding': 'gzip,deflate,compress',
        },
      },
    )

    if (res.data.success === false) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: '캡챠 인증에 실패하였습니다.' })
    }

    const user = await dbClient.user.findUnique({
      where: { discordId: ctx.session.id },
    })
    if (user) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: '이미 가입되어 있습니다.' })
    }

    const member = await currentGuildMember(ctx.session.id)

    if (member.displayName !== input.name) {
      await ignoreError(member.setNickname(input.name))
    }
    const role = await getSetting('userRole')
    const notVerifiedRole = await getSetting('notVerifiedRole')
    if (role) await member.roles.add(role)
    if (notVerifiedRole && member.roles.cache.get(notVerifiedRole))
      await member.roles.remove(notVerifiedRole)

    await dbClient.user.create({
      data: {
        discordId: ctx.session.id,
        avatar: member.displayAvatarURL(),
        name: input.name,
        handle: input.handle.toLowerCase(),
        handleDisplay: input.handle,
        introduce: input.introduce,
        registerFrom: input.registerFrom,
        links: input.links,
        roles: { connect: input.roles.map((id) => ({ id })) },
        defaultVisible:
          input.defaultVisible === 'Public' ? DefaultVisible.Public : DefaultVisible.MemberOnly,
        profileVisible:
          input.profileVisible === 'Public' ? DefaultVisible.Public : DefaultVisible.MemberOnly,
      },
    })
    const allRoles = await dbClient.role.findMany({ select: { discordRole: true, id: true } })

    for (const role of allRoles) {
      const needRole = input.roles.find((id) => id === role.id)
      if (needRole) {
        await member.roles.add(role.discordRole)
      }
    }

    const welcomeChannelId = await getSetting('welcomeChannel')
    const welcomeChannel = welcomeChannelId ? client.channels.cache.get(welcomeChannelId) : null
    const welcomeMessage =
      (await getSetting('welcomeMessage')) ?? '<mention>님, 아이디어스 랩에 오신것을 환영합니다'

    if (welcomeChannel && welcomeChannel.type === ChannelType.GuildText) {
      const embed = new Embed(client, 'info')
        .setTitle('새로운 유저가 서버에 참여했어요!')
        .setDescription(
          welcomeMessage
            .replace('<mention>', `<@${member.id}>`)
            .replace('<name>', member.displayName),
        )
        .addFields({
          name: '자기소개',
          value: `${input.introduce}${input.links.length > 0 ? '\n\n' : ''}${input.links.map(
            ({ name, url }) => `[${name}](${url})`,
          )}`,
        })
        .setAuthor({
          name: input.name,
          iconURL: member.displayAvatarURL(),
          url: `${config.webURL}/@${input.handle}`,
        })
      await welcomeChannel.send({ embeds: [embed] })
    }

    ctx.session.verified = true
    await ctx.session.save()

    return {
      success: true,
    }
  }),
  updateProfile: verifiedProcedure
    .input(authUpdateProfileValidator)
    .mutation(async ({ ctx, input }) => {
      const user = await dbClient.user.findUnique({
        where: { discordId: ctx.session.id },
      })
      if (!user) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '가입되어있지 않은 유저의 요청입니다.',
        })
      }

      const member = await currentGuildMember(ctx.session.id)

      if (member.displayName !== input.name) {
        member.setNickname(input.name)
      }

      await dbClient.user.update({
        where: {
          discordId: ctx.session.id,
        },
        data: {
          discordId: ctx.session.id,
          avatar: member.displayAvatarURL(),
          name: input.name,
          handle: input.handle.toLowerCase(),
          handleDisplay: input.handle,
          introduce: input.introduce,
          links: input.links,
          roles: { set: input.roles.map((id) => ({ id })) },
          defaultVisible:
            input.defaultVisible === 'Public' ? DefaultVisible.Public : DefaultVisible.MemberOnly,
          profileVisible:
            input.profileVisible === 'Public' ? DefaultVisible.Public : DefaultVisible.MemberOnly,
        },
      })

      const allRoles = await dbClient.role.findMany({ select: { discordRole: true, id: true } })

      for (const role of allRoles) {
        const memberRole = member.roles.cache.get(role.discordRole)
        const needRole = input.roles.find((id) => id === role.id)
        if (needRole && !memberRole) {
          await member.roles.add(role.discordRole)
        } else if (!needRole && memberRole) {
          await member.roles.remove(role.discordRole)
        }
      }

      return {
        success: true,
      }
    }),
})
