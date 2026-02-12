import {
  ApplicationCommandType,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  ContextMenuCommandBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from 'discord.js'

import { dbClient } from '@ideaslab/db'

import { ContextMenu } from '~/bot/base/interaction'
import config from '~/config'
import { Embed } from '~/utils/embed'

export default new ContextMenu(
  ApplicationCommandType.User,
  new ContextMenuCommandBuilder().setName('자기소개-확인하기'),
  async (client, interaction) => {
    let { targetMember } = interaction

    if (!targetMember)
      targetMember = await interaction.guild.members.fetch(interaction.targetUser.id)

    const user = await dbClient.user.findFirst({ where: { discordId: targetMember.id } })
    if (!user) {
      const embed = new Embed(client, 'error')
        .setTitle('자기소개 검색에 실패했어요')
        .setDescription(
          '유저가 가입되지 않은 상태이거나 봇에 문제가 있는 것 같아요.\n잠시 후 다시 시도해주세요.',
        )
      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      })
      return
    }

    const linksText =
      user.links.length > 0
        ? (user.links as { name: string; url: string }[])
            .map(({ name, url }) => `[${name}](${url})`)
            .join(' · ')
        : null

    const infoLines = [`## 자기소개\n${user.introduce}`, linksText ? `## 링크\n${linksText}` : null]
      .filter(Boolean)
      .join('\n')

    const container = new ContainerBuilder()
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# ${targetMember.displayName}`),
          )
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(targetMember.displayAvatarURL())),
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
      )
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(infoLines))
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
      )
      .addActionRowComponents((row) =>
        row.addComponents(
          new ButtonBuilder()
            .setLabel('프로필 보기')
            .setStyle(ButtonStyle.Link)
            .setURL(`${config.webURL}/@${user.handle}`),
        ),
      )

    await interaction.reply({
      components: [container],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    })
  },
)
