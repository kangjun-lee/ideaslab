import { Client, ClientEvents, ClientOptions, Collection, Partials } from 'discord.js'
import Dokdo from 'dokdo'
import { config as dotenvConfig } from 'dotenv'

import config from '~/config'
import { Logger } from '~/utils/logger'

import { SlashCommand } from './command.js'
import CommandManager from './command-manager.js'
import ErrorManager from './error-manager.js'
import { Event } from './event.js'
import EventManager from './event-manager.js'
import { BaseInteraction } from './interaction.js'
// import DatabaseManager from './database-manager'
import InteractionManager from './interaction-manager.js'
const logger = new Logger('bot')

export let client: BotClient

export default class BotClient extends Client {
  //   public readonly VERSION: string
  //   public readonly BUILD_NUMBER: string
  public readonly config = config

  public commands: Collection<string, SlashCommand> = new Collection()
  public events: Collection<keyof ClientEvents, Event<keyof ClientEvents>> = new Collection()
  public errors: Collection<string, string> = new Collection()
  public interactions: Collection<string | string[], BaseInteraction<any>> = new Collection()

  public command: CommandManager = new CommandManager(this)
  public event: EventManager = new EventManager(this)
  public error: ErrorManager = new ErrorManager(this)
  public interaction: InteractionManager = new InteractionManager(this)
  public dokdo = new Dokdo.Client(this, { prefix: '!' })

  public constructor(options: ClientOptions = { intents: 130815 }) {
    super(options)

    logger.info('Loading config data...')
    dotenvConfig()

    logger.info('Loading managers...')
    this.command.load()
    this.event.load()
    this.interaction.load()

    logger.info('Loading version data...')
  }

  public async start(token: string = config.botToken): Promise<void> {
    logger.info('Logging in bot...')
    await this.login(token).then(() => this.setStatus())
  }

  public async setStatus(_status: 'dev' | 'online' = 'online', _name = '점검중...') {
    this.user?.setPresence({
      status: 'online',
      activities: [{ name: '아이디어스랩 서버 문의는 봇 DM으로' }],
    })
  }
}

export const initClient = async () => {
  client = new BotClient({
    intents: [
      'Guilds',
      'GuildBans',
      'GuildVoiceStates',
      'GuildMessages',
      'MessageContent',
      'DirectMessages',
      'GuildWebhooks',
      'GuildIntegrations',
      'GuildMembers',
    ],
    partials: [Partials.Message, Partials.Channel],
  })
}

export const currentGuild = async () => {
  const cached = client.guilds.cache.get(config.guildId)
  if (!cached) {
    return client.guilds.fetch(config.guildId)
  }
  return cached
}

export const currentGuildMember = async (memberId: string) => {
  const guild = await currentGuild()
  const cached = guild.members.cache.get(memberId)
  if (!cached) {
    return guild.members.fetch(memberId)
  }
  return cached
}

export const currentGuildChannel = async (channelId: string) => {
  const guild = await currentGuild()
  const cached = guild.channels.cache.get(channelId)
  if (!cached) {
    return guild.channels.fetch(channelId)
  }
  return cached
}
