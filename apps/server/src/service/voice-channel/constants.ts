import {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from 'discord.js'

import { dbClient } from '@ideaslab/db'

export interface Chatroom {
  id: string
  name: string
  description: string
  rule: string
  emoji: string
}

export const defaultChatroomList: Chatroom[] = [
  {
    id: '2',
    name: '작업실',
    description: '작업/공부를 할 수 있는 방입니다.',
    rule: '작업/공부 이외의 화공 X, 마이크 O',
    emoji: '📝',
  },
  {
    id: '3',
    name: '수다방',
    description: '자유롭게 대화할 수 있는 방입니다.',
    rule: '마이크 O, 서버원과 멀티플레이 게임 X(마크, 롤 음성대화 등)',
    emoji: '💬',
  },
  {
    id: '4',
    name: '게임방',
    description: '서버원과 파티로 게임을 하는 방입니다.',
    rule: '마이크 O, 게임 O',
    emoji: '🎮',
  },
]

export const CHATROOM_LIST_KEY = 'chatroomList'

export const CHATROOM_TITLE_MAX_LENTH = 50
export const CHATROOM_DESCRIPTION_MAX_LENGTH = 100
export const CHATROOM_RULE_MAX_LENGTH = 1000

export const getChatroomList = async (): Promise<Chatroom[]> => {
  const setting = await dbClient.setting.findUnique({ where: { key: CHATROOM_LIST_KEY } })
  if (!setting) return defaultChatroomList
  try {
    return JSON.parse(setting.value) as Chatroom[]
  } catch {
    return defaultChatroomList
  }
}

export const setChatroomList = async (list: Chatroom[]): Promise<void> => {
  await dbClient.setting.upsert({
    where: { key: CHATROOM_LIST_KEY },
    create: { key: CHATROOM_LIST_KEY, value: JSON.stringify(list) },
    update: { value: JSON.stringify(list) },
  })
}

export const buildChatroomManageMessage = async () => {
  const list = await getChatroomList()

  const container = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent('# 🏠 채팅방 타입 관리'),
  )

  for (const item of list) {
    container
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### ${item.emoji} ${item.name}\n${item.description}\n-# 규칙: ${item.rule}`,
        ),
      )
      .addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(`chatroom-edit:${item.id}`)
            .setLabel('수정')
            .setEmoji('✏️'),
          new ButtonBuilder()
            .setStyle(ButtonStyle.Danger)
            .setCustomId(`chatroom-del:${item.id}`)
            .setLabel('삭제')
            .setEmoji('🗑️'),
        ),
      )
  }

  container
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
    )
    .addActionRowComponents((row) =>
      row.addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Success)
          .setCustomId('chatroom-add')
          .setLabel('추가')
          .setEmoji('➕'),
      ),
    )

  return { components: [container] }
}
