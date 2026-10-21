import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
} from 'discord.js'

import { getChatroomList } from './constants.js'

export const voiceRuleSettingMessage = async ({
  forCreate,
  selected,
  customRule,
}: {
  forCreate: boolean
  selected: string
  customRule: string
}) => {
  const chatroomList = await getChatroomList()

  if (forCreate) {
    const container = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent('# 🎙️ 음성채팅방 생성'),
    )

    for (const item of chatroomList) {
      container
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`## ${item.emoji} ${item.name}\n${item.description}`),
        )
        .addSeparatorComponents((builder) =>
          builder.setSpacing(SeparatorSpacingSize.Small).setDivider(true),
        )
        .addTextDisplayComponents((builder) => builder.setContent(`## 기본 규칙 \n${item.rule}`))
        .addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true),
        )
    }

    container.addActionRowComponents((row) =>
      row.addComponents(
        chatroomList.map((item) =>
          new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(`create-voice-${item.id}`)
            .setLabel(item.name)
            .setEmoji(item.emoji),
        ),
      ),
    )

    return { components: [container] }
  }

  // edit 모드
  const selectedRule = chatroomList.find((item) => item.id === selected)

  const container = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🔧 음성채팅방 규칙 설정'))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `현재: ${selectedRule?.emoji} ${selectedRule?.name}\n${customRule}`,
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
    )

  for (const item of chatroomList) {
    const prefix = selected === item.id ? '(선택됨) ' : ''

    container
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `### ${prefix}${item.emoji} ${item.name}\n${item.description}`,
        ),
      )
      .addSeparatorComponents((builder) =>
        builder.setSpacing(SeparatorSpacingSize.Small).setDivider(true),
      )
      .addTextDisplayComponents((builder) => builder.setContent(`## 기본 규칙 \n${item.rule}`))
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true),
      )
  }

  container
    .addActionRowComponents((row) =>
      row.addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('menu.voice-rule-edit')
          .setPlaceholder('설정할 규칙을 선택하세요.')
          .addOptions(
            chatroomList.map((item) => ({
              label: `카테고리 변경: ${item.name}`,
              value: item.id,
              description: item.description,
              emoji: item.emoji,
              default: item.id === selected,
            })),
          ),
      ),
    )
    .addActionRowComponents((row) =>
      row.addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Primary)
          .setCustomId('voice-rule-edit')
          .setLabel('규칙 변경하기'),
      ),
    )

  return { components: [container] }
}

export const voiceComponents = () => {
  const renameButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Primary)
    .setLabel('이름 변경하기')
    .setCustomId('voice-rename')

  const ruleButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Secondary)
    .setLabel('규칙 변경하기')
    .setCustomId('voice-rule-start-edit')

  const limitButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Secondary)
    .setLabel('인원수 제한하기')
    .setCustomId('voice-limit')

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    renameButton,
    ruleButton,
    limitButton,
  )

  return { row }
}
