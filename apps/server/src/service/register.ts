import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ContainerBuilder,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  LabelBuilder,
  MessageFlags,
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

export const buildRegisterWelcome = async (): Promise<InteractionReplyOptions> => {
  const registerMessage = await dbClient.setting.findFirst({
    where: { key: 'registerMessage' },
  })

  const welcome = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        '## 👋 아이디어스랩에 오신 것을 환영합니다!',
        '아이디어스랩 회원가입을 시작하려면 아래 **시작하기** 버튼을 눌러주세요.',
        '',
        registerMessage ? JSON.parse(registerMessage.value) : undefined,
        '-# 가입 절차는 약 1분 정도 소요됩니다.',
      ].join('\n'),
    ),
  )

  const separator = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)

  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('register-start')
      .setLabel('시작하기')
      .setStyle(ButtonStyle.Primary),
  )

  return {
    components: [welcome, separator, actionRow],
    flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
  }
}

export const buildRegisterInfoModal = (state?: RegisterState | null) => {
  const modal = new ModalBuilder()
    .setCustomId('modal.register-info')
    .setTitle('아이디어스랩 회원가입')

  const nicknameInput = new TextInputBuilder()
    .setCustomId('nickname')
    .setPlaceholder('사용할 닉네임을 입력해주세요')
    .setMinLength(2)
    .setMaxLength(20)
    .setRequired(true)
    .setStyle(TextInputStyle.Short)

  const introduceInput = new TextInputBuilder()
    .setCustomId('introduce')
    .setPlaceholder('간단한 자기소개를 작성해주세요')
    .setMinLength(1)
    .setMaxLength(300)
    .setRequired(true)
    .setStyle(TextInputStyle.Paragraph)

  const registerFromInput = new TextInputBuilder()
    .setCustomId('registerFrom')
    .setPlaceholder('어떻게 아이디어스랩을 알게 되셨나요?')
    .setRequired(false)
    .setStyle(TextInputStyle.Short)

  if (state) {
    nicknameInput.setValue(state.nickname)
    introduceInput.setValue(state.introduce)
    if (state.registerFrom) registerFromInput.setValue(state.registerFrom)
  }

  modal.setLabelComponents(
    new LabelBuilder().setLabel('닉네임 (2-20자)').setTextInputComponent(nicknameInput),
    new LabelBuilder().setLabel('자기소개 (1-300자)').setTextInputComponent(introduceInput),
    new LabelBuilder().setLabel('가입경로 (선택사항)').setTextInputComponent(registerFromInput),
  )

  return modal
}

export const buildFormMessage = async (
  state: RegisterState,
  avatarUrl: string,
): Promise<InteractionEditReplyOptions> => {
  const roles = await dbClient.role.findMany({ orderBy: { defaultOrder: 'asc' } })

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
        '## 역할\n-# 본인이 창작하는 분야를 선택해주세요. 여러 개 선택할 수 있어요. 목록에 없다면 관심 있는 분야를 선택해주세요. (1개 이상 필수)',
      ),
    )
    .addActionRowComponents((row) =>
      row.addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('menu.register-role')
          .setPlaceholder('역할을 선택해주세요')
          .setMinValues(1)
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
          .setLabel('다음')
          .setStyle(ButtonStyle.Primary),
      ),
    )

  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  }
}

export const buildRegisterRuleMessage = (serverRule: string): InteractionEditReplyOptions => ({
  components: [
    new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('## 서버 규칙'))
      .addTextDisplayComponents(
        ...(serverRule.match(/[\s\S]{1,1800}/g) ?? []).map((part) =>
          new TextDisplayBuilder().setContent(part),
        ),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('서버 규칙을 이해하고 동의하시나요?'),
      )
      .addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('register-decline')
            .setLabel('동의 안함')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('register-agree')
            .setLabel('동의함')
            .setStyle(ButtonStyle.Success),
        ),
      ),
  ],
  flags: MessageFlags.IsComponentsV2,
})

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
    threadId: config.debugThreads.register,
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
