import { ApplicationCommandDataResolvable, Collection, REST, Routes } from 'discord.js'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { InteractionData } from '~/bot/types'
import { InteractionType } from '~/bot/types'
import config from '~/config'
import { readAllFiles } from '~/utils/index.js'
import { Logger } from '~/utils/logger'

import BaseManager from './base-manager.js'
import BotClient from './client.js'
import { SlashCommand } from './command.js'

export default class CommandManager extends BaseManager {
  private logger = new Logger('CommandManager')
  private commands: BotClient['commands']

  public constructor(client: BotClient) {
    super(client)

    this.commands = client.commands
  }

  /**
   * Load Commands from "../commands" folder
   */
  public async load(
    commandPath: string = resolve(dirname(fileURLToPath(import.meta.url)), '../commands'),
  ) {
    this.logger.debug('Loading commands...')

    const commandFiles = readAllFiles(commandPath)

    await Promise.all(
      commandFiles.map(async (commandFile) => {
        if (commandFile.endsWith('.d.ts') || commandFile.endsWith('.map')) return
        try {
          const { default: command } = await import(pathToFileURL(commandFile).toString())

          if (!command.data.name)
            return this.logger.debug(`command ${commandFile} has no data name. Skipping.`)

          this.commands.set(command.data.name, command)

          this.logger.debug(`Loaded command ${command.data.name}`)
        } catch (error: any) {
          this.logger.error(`Error loading command '${commandFile}'.\n` + error.stack)
        }
      }),
    )

    this.logger.info(`Succesfully loaded commands. count: ${this.commands.size}`)
    return this.commands
  }

  public get(commandName: string): SlashCommand | undefined {
    const command = this.commands.get(commandName)

    return command
  }

  public reload() {
    this.logger.debug('Reloading commands...')

    this.commands.clear()
    try {
      this.load()
    } finally {
      this.logger.debug('Succesfully reloaded commands.')
      // eslint-disable-next-line no-unsafe-finally
      return { message: '[200] Succesfully reloaded commands.' }
    }
  }

  public async slashCommandSetup(
    guildID: string,
  ): Promise<ApplicationCommandDataResolvable[] | undefined> {
    this.logger.scope = 'CommandManager: SlashSetup'
    const rest = new REST().setToken(this.client.token!)

    const interactions: Collection<string, InteractionData> = new Collection()

    this.client.interactions.forEach((command) => {
      if (command.type === InteractionType.ContextMenu) {
        interactions.set(command.data.name, command.data)
      }
    })

    this.client.commands.forEach((command) => {
      this.logger.debug(`${command.data.name} command added`)
      interactions.set(command.data.name, command.data)
    })

    if (!guildID) {
      this.logger.warn('guildID not gived switching global command...')
      this.logger.debug(`Trying ${this.client.guilds.cache.size} guild(s)`)

      await rest
        .put(Routes.applicationCommands(config.botId), {
          body: interactions.toJSON(),
        })
        .then(() => this.logger.info(`Successfully registered application global commands.`))

      return interactions.toJSON()
    } else {
      this.logger.info(`Slash Command requesting ${guildID}`)
      const commands = await this.client.application?.commands
        .fetch()
        .then((cmd) => cmd.map((cmd) => cmd.name))

      const resolvedData = interactions.filter((cmd) =>
        commands ? !commands.includes(cmd.name) : true,
      )

      rest.setToken(config.botToken)

      await rest
        .put(Routes.applicationGuildCommands(config.botId, guildID), {
          body: resolvedData.toJSON(),
        })
        .then(() => this.logger.info(`Successfully registered server ${guildID} server commands.`))

      return resolvedData.toJSON()
    }
  }
}
