/**
 * Drop tables in database. All data will be cleared.
 */

const models = require('../models')
const logger = require('../common/logger')

logger.info('Requesting to delete tables...')

const promises = []

Object.keys(models).forEach(modelName => {
  promises.push(models[modelName].$__.table.delete())
})

Promise.all(promises)
  .then(() => {
    logger.info('All tables have been requested to be deleted. Deleting processes is run asynchronously')
    process.exit()
  })
  .catch((err) => {
    logger.logFullError(err)
    process.exit(1)
  })
