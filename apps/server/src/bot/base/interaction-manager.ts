import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { readAllFiles } from '~/utils/index.js'
import { Logger } from '~/utils/logger'

import BaseManager from './base-manager.js'
import BotClient from './client.js'
import { BaseInteraction } from './interaction.js'

export default class InteractionManager extends BaseManager {
  private logger = new Logger('InteractionManager')
  public readonly interactions: BotClient['interactions']

  constructor(client: BotClient) {
    super(client)

    this.interactions = client.interactions
  }

  public async load(
    interactionPath: string = resolve(dirname(fileURLToPath(import.meta.url)), '../interactions'),
  ) {
    this.logger.debug('Loading interactions...')

    const interactionFiles = readAllFiles(interactionPath)

    await Promise.all(
      interactionFiles.map(async (interactionFile) => {
        if (interactionFile.endsWith('.d.ts') || interactionFile.endsWith('.map')) return
        try {
          const { default: interaction } = await import(pathToFileURL(interactionFile).toString())

          if (!interaction.customId)
            return this.logger.debug(`interaction ${interactionFile} has no customId. Skipping.`)

          this.interactions.set(interaction.customId, interaction)

          this.logger.debug(`Loaded interaction ${interaction.customId}`)
        } catch (error: any) {
          this.logger.error(`Error loading interaction '${interactionFile}'.\n` + error.stack)
        }
      }),
    )
  }

  public get(customId: string): BaseInteraction | undefined {
    const found = this.interactions.get(customId)
    if (found) return found
    return this.interactions.find((_, id) => {
      if (typeof id === 'string') return customId.startsWith(id)
      return id.includes(customId)
    })
  }
}
