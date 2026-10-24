import chalk from 'chalk'
import stripColor from 'strip-ansi'
import winston, { addColors, createLogger, format, transports } from 'winston'

import { LogLevel } from '~/bot/types'
import config from '~/config'
import { DebugReporter } from '~/utils/debug'

const { printf, splat, colorize, timestamp, ms, combine } = format

const colors = {
  fatal: chalk.bgWhite.red.bold,
  error: chalk.red,
  warn: chalk.yellow,
  info: chalk.cyanBright,
  chat: (text: string) => text,
  verbose: chalk.blueBright,
  debug: chalk.blue,
}

const myFormat = printf(({ level, message, label, ms }) => {
  const _level = stripColor(level) as LogLevel
  const colorizer = colors[_level]
  const date = new Date()
  const dateStr = `[${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date
    .getHours()
    .toString()
    .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date
    .getSeconds()
    .toString()
    .padStart(2, '0')}]`
  const labelStr = _level === 'chat' ? '' : `[${label}] `
  return `${chalk.grey(dateStr)} ${labelStr} ${level} ${colorizer(
    message as string,
  )} ${chalk.magentaBright(ms)}`
})

const myCustomLevels = {
  levels: {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    chat: 4,
    verbose: 5,
    debug: 6,
  },
  colors: {
    fatal: 'whiteBG red bold',
    error: 'red',
    warn: 'yellow',
    info: 'white',
    chat: 'grey',
    verbose: 'cyan',
    debug: 'blue',
  },
}

addColors(myCustomLevels.colors)

export class Logger {
  public scope: string
  private readonly logger: winston.Logger

  constructor(scope: string) {
    this.scope = scope
    this.logger = createLogger({
      levels: myCustomLevels.levels,
      transports: [
        new transports.Console({
          level: config.logLevel,
          format: combine(splat(), colorize(), timestamp(), ms(), myFormat),
        }),
      ],
    })
  }

  log(message: any, ...args: any[]) {
    this.logger.info(message, ...args, { label: this.scope })
    void DebugReporter.consoleLog(`${this.scope}.info`, [message, ...args]).catch(() => undefined)
  }

  info(message: any, ...args: any[]) {
    this.logger.info(message, ...args, { label: this.scope })
    void DebugReporter.consoleLog(`${this.scope}.info`, [message, ...args]).catch(() => undefined)
  }
  warn(message: any, ...args: any[]) {
    this.logger.warn(message, ...args, { label: this.scope })
    void DebugReporter.consoleLog(`${this.scope}.warn`, [message, ...args]).catch(() => undefined)
  }

  error(message: any, ...args: any[]) {
    this.logger.error(message, ...args, { label: this.scope })
    void DebugReporter.consoleLog(`${this.scope}.error`, [message, ...args]).catch(() => undefined)
    void DebugReporter.error(this.scope, message, args).catch(() => undefined)
  }

  debug(message: any, ...args: any[]) {
    this.logger.debug(message, ...args, { label: this.scope })
    void DebugReporter.consoleLog(`${this.scope}.debug`, [message, ...args]).catch(() => undefined)
  }

  fatal(message: any, ...args: any[]): never {
    this.logger.error(message, ...args, { label: this.scope })
    return process.exit(1)
  }
}
