/**
 * Migrate Data from Dynamo DB to ES
 */

const config = require('config')
const logger = require('../common/logger')
const helper = require('../common/helper')

const esClient = helper.getESClient()

/*
 * Migrate records from DB to ES
 */
async function migrateRecords () {
  const result = await helper.scan('Challenge')
  for (const challenge of result) {
    await esClient.update({
      index: config.get('ES.ES_INDEX'),
      type: config.get('ES.ES_TYPE'),
      id: challenge.id,
      body: { doc: challenge, doc_as_upsert: true }
    })
  }
}

migrateRecords()
  .then(() => {
    logger.info('Done')
    process.exit()
  })
  .catch((err) => {
    logger.logFullError(err)
    process.exit(1)
  })
