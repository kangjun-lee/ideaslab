import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Logger } from '~/utils/logger'

import BaseManager from './base-manager.js'
import type BotClient from './client.js'
import { Event } from './event.js'

/**
 * @extends {BaseManager}
 */
export default class EventManager extends BaseManager {
  private logger: Logger
  private events: BotClient['events']

  constructor(client: BotClient) {
    super(client)

    this.logger = new Logger('EventManager')

    this.events = client.events
  }

  public async load(eventPath = join(dirname(fileURLToPath(import.meta.url)), '../events')) {
    this.logger.debug('Loading events...')

    const eventFiles = readdirSync(eventPath)
    await Promise.all(
      eventFiles.map(async (eventFile) => {
        if (eventFile.endsWith('.d.ts') || eventFile.endsWith('.map')) return
        try {
          const { default: event } = await import(`../events/${eventFile}`)

          if (!event.name) return this.logger.debug(`Event ${eventFile} has no name. Skipping.`)

          this.events.set(event.name, event)
          this.logger.debug(`Loaded event ${eventFile}`)
        } catch (error: any) {
          this.logger.error(`Error loading events '${eventFile}'.\n` + error.stack)
        }
      }),
    )
    this.logger.info(`Succesfully loaded events. count: ${this.events.size}`)

    this.start()
  }

  private async start() {
    this.logger.debug('Starting event files...')

    this.events.forEach((event, eventName) => {
      if (!Event.isEvent(event)) return

      if (event.options?.once) {
        this.client.once(eventName, (...args) => {
          event.execute(this.client, ...args)
        })

        this.logger.debug(`Started event '${eventName}' once.`)
      } else {
        this.client.on(eventName, (...args) => {
          event.execute(this.client, ...args)
        })

        this.logger.debug(`Started event '${eventName}' on.`)
      }
    })
  }

  public reload() {
    this.logger.debug('Reloading events...')

    this.events.clear()

    this.load()
  }
}
