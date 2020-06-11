/**
 * Insert seed data to tables in database
 */

const { get, includes } = require('lodash')
const models = require('../models')
const logger = require('../common/logger')

logger.info('Requesting to insert seed data to the tables...')

const promises = []
const skipModels = []

Object.keys(models).forEach(modelName => {
  if (includes(skipModels, modelName)) {
    logger.warn(`Skipping Seed Model ${modelName}`)
    return
  }
  try {
    const data = require(`./seed/${modelName}.json`)
    logger.info(`Inserting ${get(data, 'length')} records in table ${modelName}`)
    promises.push(models[modelName].batchPut(data))
  } catch (e) {
    logger.warn(`No records will be inserted in table ${modelName}`)
  }
})

Promise.all(promises)
  .then(() => {
    logger.info('All tables have been inserted with the data. The processes is run asynchronously')
    process.exit()
  })
  .catch((err) => {
    logger.logFullError(err)
    process.exit(1)
  })
