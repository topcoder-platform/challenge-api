const config = require('config')
const logger = require('../common/logger')
const helper = require('../common/helper')

const esClient = helper.getESClient()

function sleep (ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function createIndex (indexName) {
  const body = { mappings: {} }
  body.mappings[config.get('ES.ES_TYPE')] = {
    properties: {
      id: { type: 'keyword' },
      name: {
        type: 'keyword',
        normalizer: 'custom_sort_normalizer'
      },
      prizeSets: {
        properties: {
          type: { type: 'text' },
          prizes: {
            properties: {
              type: { type: 'text' },
              value: { type: 'float' }
            }
          }
        }
      }
    },
    dynamic_templates: [{
      metadata: {
        path_match: 'metadata.*',
        mapping: {
          type: 'text'
        }
      }
    }]
  }
  body.settings = {
    analysis: {
      normalizer: {
        custom_sort_normalizer: {
          type: 'custom',
          char_filter: [],
          filter: ['lowercase', 'asciifolding']
        }
      }
    }
  }

  return esClient.indices.create({
    index: indexName,
    body
  })
}

async function updateMappings () {
  const tempReindexing = config.get('ES.TEMP_REINDEXING')
  let indexName = config.get('ES.ES_INDEX')
  let backupIndex = 'challenge_tmp_dont_use_for_querying_backup'
  let newIndexName = 'challenge_tmp_dont_use_for_querying'

  // if (tempReindexing) {
  //   try {
  //     logger.info(`Attemp to remove temporary index ${newIndexName}`)
  //     await esClient.indices.delete({
  //       index: newIndexName
  //     })
  //     await sleep(500)
  //   } catch (e) {
  //     logger.info(`Index ${newIndexName} does not exist`)
  //   }
  // }

  // await createIndex(backupIndex)
  // await sleep(500)
  // logger.info(`Reindexing from ${indexName} to ${backupIndex}`)
  // await esClient.reindex({
  //   body: {
  //     source: { index: indexName },
  //     dest: { index: backupIndex }
  //   },
  //   waitForCompletion: true
  // })

  // await createIndex(newIndexName)
  // await sleep(500)
  // logger.info(`Reindexing from ${indexName} to ${newIndexName}`)
  // await esClient.reindex({
  //   body: {
  //     source: { index: indexName },
  //     dest: { index: newIndexName }
  //   },
  //   waitForCompletion: true
  // })

  // if (tempReindexing) {
  //   return
  // }

  // logger.warn(`Deleting ${indexName}. If script crashes after this point data may be lost and a recreation of index will be required.`)

  // await esClient.indices.delete({
  //   index: indexName
  // })

  // indexName = 'challenge' // overridding source so it's not deleted.

  // logger.info(`Copying data back into ${indexName}`)

  // // This should be replaced with cloneIndex after migration to 7.4+
  // await createIndex(indexName)
  // await sleep(500)
  // await esClient.reindex({
  //   body: {
  //     source: { index: 'challenge_tmp_dont_use_for_querying' },
  //     dest: { index: 'challenge' }
  //   },
  //   waitForCompletion: true
  // })

  // logger.info(`Removing ${newIndexName} index`)

  // await esClient.indices.delete({
  //   index: newIndexName
  // })
}

updateMappings()
  .then(() => {
    logger.info('Done')
    process.exit()
  })
  .catch((err) => {
    logger.logFullError(err)
    process.exit(1)
  })
