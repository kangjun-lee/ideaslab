// eslint-disable-next-line simple-import-sort/imports
import 'dotenv/config'

import { registerRoleConnectionMetadata } from '~/service/linked-roles'
import { Logger } from '~/utils/logger'

const logger = new Logger('register-metadata')

async function main() {
  logger.info('Registering Discord Role Connection metadata schema...')
  try {
    const result = await registerRoleConnectionMetadata()
    logger.info('Successfully registered role connection metadata:', result)
    process.exit(0)
  } catch (err) {
    logger.error('Failed to register role connection metadata:', err)
    process.exit(1)
  }
}

main()
