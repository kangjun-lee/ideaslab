import {
  ApplicationCommandType,
  AutocompleteInteraction,
  ButtonInteraction,
  CacheType,
  ChannelSelectMenuInteraction,
  ContextMenuCommandBuilder,
  ContextMenuCommandType,
  MentionableSelectMenuInteraction,
  MessageContextMenuCommandInteraction,
  ModalSubmitInteraction,
  RoleSelectMenuInteraction,
  StringSelectMenuInteraction,
  UserContextMenuCommandInteraction,
  UserSelectMenuInteraction,
} from 'discord.js'

import { BaseInteractionFunction, InteractionData } from '~/bot/types'
import { InteractionType } from '~/bot/types'

export class Button {
  public type: InteractionType.Button = InteractionType.Button
  constructor(
    public customId: string | string[],
    public execute: BaseInteractionFunction<ButtonInteraction>,
  ) {}
}

type SelectMenuType = 'role' | 'user' | 'string' | 'channel' | 'mention'
type SelectMenuDiscordType<T extends SelectMenuType, U extends CacheType> = T extends 'role'
  ? RoleSelectMenuInteraction<U>
  : T extends 'user'
  ? UserSelectMenuInteraction<U>
  : T extends 'string'
  ? StringSelectMenuInteraction<U>
  : T extends 'channel'
  ? ChannelSelectMenuInteraction<U>
  : MentionableSelectMenuInteraction<U>

export class SelectMenu<T extends SelectMenuType> {
  public type: InteractionType.Select = InteractionType.Select
  constructor(
    public menuType: T,
    public customId: string | string[],
    public execute: BaseInteractionFunction<SelectMenuDiscordType<T, 'cached'>>,
  ) {}
}

type ContextMenuExecuteType<
  T extends ContextMenuCommandType,
  U extends CacheType,
> = T extends ApplicationCommandType.Message
  ? MessageContextMenuCommandInteraction<U>
  : UserContextMenuCommandInteraction<U>

export class ContextMenu<T extends ContextMenuCommandType = ApplicationCommandType.Message> {
  public type: InteractionType.ContextMenu = InteractionType.ContextMenu
  public data: InteractionData
  public customId: string
  constructor(
    public contextType: T,
    public builder: ContextMenuCommandBuilder,
    public execute: BaseInteractionFunction<ContextMenuExecuteType<T, 'cached'>>,
  ) {
    builder.setType(contextType)
    this.customId = builder.name
    this.data = builder.toJSON()
  }
}

export class Modal {
  public type: InteractionType.Modal = InteractionType.Modal
  constructor(
    public customId: string | string[],
    public execute: BaseInteractionFunction<ModalSubmitInteraction<'cached'>>,
  ) {}
}

export class AutoComplete {
  public type: InteractionType.AutoComplete = InteractionType.AutoComplete
  constructor(
    public customId: string | string[],
    public execute: BaseInteractionFunction<AutocompleteInteraction<'cached'>>,
  ) {}
}

export type BaseInteraction<T extends SelectMenuType = any> =
  | Button
  | SelectMenu<T>
  | ContextMenu<any>
  | Modal
  | AutoComplete
