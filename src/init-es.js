/**
 * Initialize elastic search.
 * It will create configured index in elastic search if it is not present.
 * It can delete and re-create index if providing an extra 'force' argument.
 * Usage:
 * node src/init-es
 * node src/init-es force
 */
const config = require('config')
const logger = require('./common/logger')
const helper = require('./common/helper')

const client = helper.getESClient()

const indexes = [
  config.ES.CHALLENGE_ES_INDEX,
  config.ES.CHALLENGE_TYPE_ES_INDEX,
  config.ES.CHALLENGE_TYPE_TIMELINE_TEMPLATE_ES_INDEX,
  config.ES.TIMELINE_TEMPLATE_ES_INDEX,
  config.ES.PHASE_ES_INDEX
]

const processIndex = async (index) => {
  if (process.argv.length === 3 && process.argv[2] === 'force') {
    logger.info(`Delete index ${index} if any.`)
    try {
      await client.indices.delete({ index })
    } catch (err) {
      // ignore
    }
  }

  const exists = await client.indices.exists({ index })
  if (exists) {
    logger.info(`The index ${index} exists.`)
  } else {
    logger.info(`The index ${index} will be created.`)

    const body = { mappings: {} }
    body.mappings[index] = {
      properties: {
        id: { type: 'keyword' }
      }
    }

    await client.indices.create({
      index,
      body
    })
  }
}

const initES = async () => {
  for (const index of indexes) {
    await processIndex(index)
  }
}

initES().then(() => {
  logger.info('Done!')
  process.exit()
}).catch((e) => {
  logger.logFullError(e)
  process.exit()
})
