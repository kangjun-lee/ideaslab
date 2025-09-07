import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  ClientOptions,
  ContextMenuCommandInteraction,
  HexColorString,
  Message,
  ModalSubmitInteraction,
  SelectMenuInteraction,
  ShardingManagerOptions,
} from 'discord.js'

export interface ErrorReportOptions {
  executer?:
    | Message<true>
    | ChatInputCommandInteraction<'cached'>
    | ContextMenuCommandInteraction<'cached'>
    | SelectMenuInteraction<'cached'>
    | ButtonInteraction<'cached'>
    | ModalSubmitInteraction<'cached'>
    | undefined
  isSend?: boolean
}

export type IConfig = {
  BUILD_VERSION: string
  BUILD_NUMBER: string
  devGuildID: string
  name: string
  githubToken?: string
  repository?: string
} & { logger: LoggerConfig } & { bot: BotConfig } & {
  report: ErrorReportConfig
}

export interface LoggerConfig {
  level: LogLevel
  dev: boolean
}

export interface ErrorReportConfig {
  type: ReportType
  webhook: {
    url: string
  }
  text: {
    guildID: string
    channelID: string
  }
}

export interface BotConfig {
  sharding: boolean
  shardingOptions?: ShardingManagerOptions
  options: ClientOptions
  token: string
  owners?: string[]
  prefix: string
  cooldown?: number
}

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'chat'

export const enum EmbedColor {
  Success = '#57F287',
  Error = '#ED4245',
  Warn = '#FEE75C',
  Info = '#5865F2',
  Default = '#5865F2',
}

export type EmbedType = 'default' | 'error' | 'success' | 'warn' | 'info' | HexColorString

export const enum InteractionType {
  SlashCommand,
  Button,
  Select,
  ContextMenu,
  Modal,
  AutoComplete,
}

export const enum ReportType {
  Webhook,
  Text,
}

export * from './structures.js'

export type Empty = Record<string, never>
