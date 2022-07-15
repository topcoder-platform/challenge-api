/**
 * View all ES data.
 */

const helper = require('../common/helper')
const config = require('config')
const logger = require('../common/logger')

const esClient = helper.getESClient()

async function showESData () {
  const result = await esClient.search({
    index: config.get('ES.ES_INDEX'),
    type: config.get('ES.ES_TYPE')
  })
  return result
}

showESData()
  .then(result => {
    logger.info('All data in ES is shown belows.')
    console.log(
      JSON.stringify(result.hits.hits, null, 2)
    )
    logger.info('Done!')
    process.exit()
  })
  .catch(err => {
    console.log(err)
    process.exit(1)
  })
