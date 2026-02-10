import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import jwt from 'jsonwebtoken'

import { currentGuild, currentGuildChannel } from '~/bot/base/client'
import config from '~/config'
import { redis } from '~/lib/redis'

import { getSetting } from './setting.js'

const loginTokenExpire = 60 * 30 // 10 minutes

const redisLoginPinKey = (pin: string) => `${config.redisPrefix}loginPin:${pin}`

const randomNumber = (length: number) => {
  const min = 10 ** (length - 1)
  const max = 10 ** length - 1

  return Math.floor(Math.random() * (max - min + 1)) + min
}

const generatePin = async (): Promise<string> => {
  const pin = `${randomNumber(6)}`

  if ((await redis.get(redisLoginPinKey(pin))) !== null) {
    const newPin = generatePin()
    return newPin
  }
  return pin
}

/**
 * create JWT Token for login
 * @param userId discord user's id
 */
export const getLoginToken = async (
  userId: string,
  name: string,
  avatar: string,
  isAdmin: boolean,
): Promise<{ token: string; pin: string }> => {
  const pin = await generatePin()

  await redis.set(
    redisLoginPinKey(pin),
    JSON.stringify({ userId, isAdmin }),
    'EX',
    loginTokenExpire,
  )

  const token = jwt.sign({ name, avatar, isAdmin }, config.jwtSecret, {
    issuer: 'ideaslab',
    subject: userId,
    expiresIn: Math.floor(Date.now() / 1000) + loginTokenExpire,
  })

  return { token, pin }
}

/**
 * create authorized JWT Token with loginPin
 * @param pin pin code witch generated in getLoginToken
 */
export const loginWithPin = async (pin: string) => {
  const userData = await redis.getdel(redisLoginPinKey(pin))
  if (userData === null) return null
  const { userId, isAdmin } = JSON.parse(userData) as { userId: string; isAdmin: boolean }

  // return createAuthToken(userId, isAdmin)
  return { userId, isAdmin }
}

/**
 * create authorized JWT Token with loginToken
 * @param loginToken jwt token which generated in getLoginToken
 */
export const loginWithToken = (loginToken: string) => {
  try {
    const { sub: userId, isAdmin } = jwt.verify(loginToken, config.jwtSecret) as {
      sub: string
      isAdmin: boolean
    }

    return { userId, isAdmin }
  } catch {
    return null
  }
}

/**
 * verify authorized JWT Token for isLogin
 * @param loginToken auth jwt token which generated in loginWithToken or loginWithPin
 */
export const verifyAuthToken = (token: string) => {
  try {
    const { sub: userId, isAdmin } = jwt.verify(token, config.jwtSecret) as {
      sub: string
      isAdmin: boolean
    }

    return { id: userId, isAdmin }
  } catch (error) {
    return null
  }
}

const timeoutMillisecond = 1000 * 60 * 20 // 20 Minutes

export const notVerifiedUsers = async () => {
  const notVerifiedRole = await getSetting('notVerifiedRole')

  if (!notVerifiedRole) return []

  const guild = await currentGuild()

  await guild.members.fetch({})

  const filtered = guild.members.cache.filter((user) => {
    return !user.user.bot && user.roles.cache.has(notVerifiedRole)
  })
  return [...filtered.values()]
}

export const notVerifiedAlertUsers = async () => {
  const userRole = await getSetting('userRole')
  const notVerifiedRole = await getSetting('notVerifiedRole')
  const now = new Date()

  if (!userRole || !notVerifiedRole) return []

  const guild = await currentGuild()

  const filtered = guild.members.cache.filter((user) => {
    return (
      !user.user.bot &&
      !user.roles.cache.has(userRole) &&
      !user.roles.cache.has(notVerifiedRole) &&
      user.joinedTimestamp &&
      user.joinedTimestamp - now.getUTCMilliseconds() > timeoutMillisecond
    )
  })
  return [...filtered.values()]
}

export const alertToNotVerifiedUser = async () => {
  const list = await notVerifiedAlertUsers()
  if (list.length < 1) return

  const notVerifiedChannel = await getSetting('notVerifiedChannel')
  const notVerifiedRole = await getSetting('notVerifiedRole')

  if (!notVerifiedChannel || !notVerifiedRole) return

  const channel = await currentGuildChannel(notVerifiedChannel)
  if (!channel || !channel.isTextBased()) return

  const registerButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('register-complete')
      .setLabel('가입 완료하기')
      .setStyle(ButtonStyle.Primary),
  )

  for (const item of list) {
    await item.roles.add(notVerifiedRole)
    await channel.send({
      content: `<@${item.user.id}> 님, 아직 아이디어스랩 인증을 마치지 않으셨군요.\n아이디어스랩을 이용하려면 가입을 마무리 해주세요.`,
      components: [registerButton],
    })
  }
}
