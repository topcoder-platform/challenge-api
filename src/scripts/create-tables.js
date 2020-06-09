/**
 * Create table schemes in database
 */

const models = require('../models')
const { includes } = require('lodash')
const logger = require('../common/logger')

logger.info('Requesting to create tables...')

const promises = []
const skipModels = ['DynamoDB']

Object.keys(models).forEach(modelName => {
  if (!includes(skipModels, modelName)) {
    promises.push(models[modelName].$__.table.create())
  } else {
    logger.info(`Skipping ${modelName}`)
  }
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
