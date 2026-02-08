import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ContainerBuilder,
  InteractionEditReplyOptions,
  MessageFlags,
  MessagePayload,
  MessagePayloadOption,
  ModalBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  ThumbnailBuilder,
  WebhookClient,
} from 'discord.js'

import { dbClient, DefaultVisible } from '@ideaslab/db'

import { client, currentGuildMember } from '~/bot/base/client'
import config from '~/config'
import { redis } from '~/lib/redis'
import { getSetting } from '~/service/setting'
import { ignoreError } from '~/utils'
import { DebugReporter } from '~/utils/debug'
import { Embed } from '~/utils/embed'

export interface RegisterState {
  nickname: string
  handle: string
  introduce: string
  registerFrom: string
  roles: number[]
  links: { name: string; url: string }[]
  profileVisible: 'Public' | 'MemberOnly'
  defaultVisible: 'Public' | 'MemberOnly'
}

const REGISTER_TTL = 1800 // 30분

const redisKey = (userId: string) => `${config.redisPrefix}register:${userId}`

export const getRegisterState = async (userId: string): Promise<RegisterState | null> => {
  const data = await redis.get(redisKey(userId))
  if (!data) return null
  return JSON.parse(data)
}

export const setRegisterState = async (userId: string, state: RegisterState): Promise<void> => {
  await redis.set(redisKey(userId), JSON.stringify(state), 'EX', REGISTER_TTL)
}

export const deleteRegisterState = async (userId: string): Promise<void> => {
  await redis.del(redisKey(userId))
}

export const buildRegisterInfoModal = (state?: RegisterState | null) => {
  const modal = new ModalBuilder()
    .setCustomId('modal.register-info')
    .setTitle('아이디어스랩 회원가입')

  const nicknameInput = new TextInputBuilder()
    .setCustomId('nickname')
    .setLabel('닉네임 (2-20자)')
    .setPlaceholder('사용할 닉네임을 입력해주세요')
    .setMinLength(2)
    .setMaxLength(20)
    .setRequired(true)
    .setStyle(TextInputStyle.Short)

  const introduceInput = new TextInputBuilder()
    .setCustomId('introduce')
    .setLabel('자기소개 (1-300자)')
    .setPlaceholder('간단한 자기소개를 작성해주세요')
    .setMinLength(1)
    .setMaxLength(300)
    .setRequired(true)
    .setStyle(TextInputStyle.Paragraph)

  const registerFromInput = new TextInputBuilder()
    .setCustomId('registerFrom')
    .setLabel('가입경로 (선택사항)')
    .setPlaceholder('어떻게 아이디어스랩을 알게 되셨나요?')
    .setRequired(false)
    .setStyle(TextInputStyle.Short)

  if (state) {
    nicknameInput.setValue(state.nickname)
    introduceInput.setValue(state.introduce)
    if (state.registerFrom) registerFromInput.setValue(state.registerFrom)
  }

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(nicknameInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(introduceInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(registerFromInput),
  )

  return modal
}

export const buildFormMessage = async (
  state: RegisterState,
  avatarUrl: string,
): Promise<InteractionEditReplyOptions> => {
  const roles = await dbClient.role.findMany({ orderBy: { defaultOrder: 'asc' } })

  const visLabel = (v: 'Public' | 'MemberOnly') => (v === 'Public' ? '🌐 공개' : '🔒 멤버 전용')

  const selectedRoleNames =
    state.roles.length > 0
      ? roles
          .filter((r) => state.roles.includes(r.id))
          .map((r) => r.name)
          .join(', ')
      : '선택 안 됨'

  const linksText =
    state.links.length > 0 ? state.links.map((l) => `[${l.name}](${l.url})`).join('\n') : '없음'

  const basicInfoLines = [
    `## 닉네임\n-# 아이디어스랩에서 사용하게 될 닉네임이에요.\n${state.nickname}`,
    `## 자기소개\n-# 간단하게 소개 문구를 입력해주세요!\n${state.introduce}`,
    state.registerFrom ? `## 가입경로\n${state.registerFrom}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const roleOptions =
    roles.length > 0
      ? roles.map((r) => ({
          label: r.name,
          value: String(r.id),
          default: state.roles.includes(r.id),
        }))
      : [{ label: '역할 없음', value: 'none', default: false }]

  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 📋 회원가입 정보'))
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(basicInfoLines))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl)),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
    )
    // 역할
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 역할\n-# 본인이 창작하는 분야를 선택해주세요. 여러개 선택할 수 있어요.`,
      ),
    )
    .addActionRowComponents((row) =>
      row.addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('menu.register-role')
          .setPlaceholder('역할을 선택해주세요')
          .setMinValues(0)
          .setMaxValues(roles.length || 1)
          .setDisabled(roles.length === 0)
          .addOptions(roleOptions),
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
    )
    // 링크
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 링크\n-# 작업링크 / SNS를 연결할 수 있어요. 6개까지 입력 가능해요.\n${linksText}`,
      ),
    )

  // 링크 수정 SelectMenu (링크가 있을 때만)
  if (state.links.length > 0) {
    container.addActionRowComponents((row) =>
      row.addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('menu.register-link-edit')
          .setPlaceholder('링크를 선택하여 수정')
          .addOptions(
            state.links.map((l, i) => ({
              label: l.name,
              description: l.url.length > 100 ? l.url.slice(0, 97) + '...' : l.url,
              value: String(i),
            })),
          ),
      ),
    )
  }

  // 링크 삭제 버튼 + 추가 버튼
  const linkButtons: ButtonBuilder[] = state.links.map((l, i) =>
    new ButtonBuilder()
      .setCustomId(`register-link-del:${i}`)
      .setLabel(`🗑️ ${l.name}`)
      .setStyle(ButtonStyle.Danger),
  )
  if (state.links.length < 6) {
    linkButtons.push(
      new ButtonBuilder()
        .setCustomId('register-link')
        .setLabel('링크 추가')
        .setStyle(ButtonStyle.Secondary),
    )
  }
  // ActionRow 당 최대 5개 버튼
  for (let i = 0; i < linkButtons.length; i += 5) {
    const chunk = linkButtons.slice(i, i + 5)
    container.addActionRowComponents((row) => row.addComponents(...chunk))
  }

  container
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true),
    )
    // 하단 액션
    .addActionRowComponents((row) =>
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('register-edit')
          .setLabel('수정')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('register-submit')
          .setLabel('가입 완료')
          .setStyle(ButtonStyle.Success),
      ),
    )

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  }
}

export const executeRegistration = async (userId: string, state: RegisterState) => {
  const member = await currentGuildMember(userId)

  if (member.displayName !== state.nickname) {
    await ignoreError(member.setNickname(state.nickname))
  }

  const userRole = await getSetting('userRole')
  const notVerifiedRole = await getSetting('notVerifiedRole')
  if (userRole) await member.roles.add(userRole)
  if (notVerifiedRole && member.roles.cache.get(notVerifiedRole))
    await member.roles.remove(notVerifiedRole)

  await dbClient.user.create({
    data: {
      discordId: userId,
      avatar: member.displayAvatarURL(),
      name: state.nickname,
      handle: state.handle.toLowerCase(),
      handleDisplay: state.handle,
      introduce: state.introduce,
      registerFrom: state.registerFrom || undefined,
      links: state.links,
      roles: { connect: state.roles.map((id) => ({ id })) },
      defaultVisible:
        state.defaultVisible === 'Public' ? DefaultVisible.Public : DefaultVisible.MemberOnly,
      profileVisible:
        state.profileVisible === 'Public' ? DefaultVisible.Public : DefaultVisible.MemberOnly,
    },
  })

  const allRoles = await dbClient.role.findMany({ select: { discordRole: true, id: true } })
  for (const role of allRoles) {
    if (state.roles.includes(role.id)) {
      await member.roles.add(role.discordRole)
    }
  }

  // 환영 메시지
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
        value: `${state.introduce}${state.links.length > 0 ? '\n\n' : ''}${state.links
          .map(({ name, url }) => `[${name}](${url})`)
          .join(', ')}`,
      })
      .setAuthor({
        name: state.nickname,
        iconURL: member.displayAvatarURL(),
        url: `${config.webURL}/@${state.handle}`,
      })
    await welcomeChannel.send({ embeds: [embed] })
  }

  // 팔로업 웰컴 메시지 (Webhook)
  const followUpWebhookUrl = await getSetting('followUpWelcomeWebhook')
  if (followUpWebhookUrl) {
    const followUpMessage =
      (await getSetting('followUpWelcomeMessage')) ?? '<name>님이 아이디어스 랩에 가입했습니다!'

    try {
      const webhook = new WebhookClient({ url: followUpWebhookUrl })
      const formattedMessage = followUpMessage
        .replace(/<mention>/g, `<@${member.id}>`)
        .replace(/<name>/g, member.displayName)
        .replace(/<handle>/g, state.handle)
        .replace(/<introduce>/g, state.introduce)
      await webhook.send({ content: formattedMessage })
    } catch (error) {
      console.error('Follow-up welcome webhook failed:', error)
    }
  }

  await deleteRegisterState(userId)

  // 가입 완료 로깅
  const debug = new DebugReporter()
  const logContainer = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      ['## 회원가입 완료', DebugReporter.fetchInfo(import.meta)].join('\n'),
    ),
  )
  debug.sendComponents({
    container: logContainer,
    type: 'log',
    json: [
      {
        discordId: userId,
        nickname: state.nickname,
        handle: state.handle,
        introduce: state.introduce,
        registerFrom: state.registerFrom || null,
        roles: state.roles,
        links: state.links,
      },
    ],
  })
}
