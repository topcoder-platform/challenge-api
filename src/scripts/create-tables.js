/**
 * Create table schemes in database
 */

const models = require('../models')
const logger = require('../common/logger')

logger.info('Requesting to create tables...')

const promises = []

Object.keys(models).forEach(modelName => {
  promises.push(models[modelName].$__.table.create())
})

Promise.all(promises)
  .then(() => {
    logger.info('All tables have been requested to be created. Creating processes is run asynchronously')
    process.exit()
  })
  .catch((err) => {
    logger.logFullError(err)
    process.exit(1)
  })
