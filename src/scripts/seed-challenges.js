/**
 * Insert challenge data to database
 */

const models = require('../models')
const logger = require('../common/logger')
const fs = require('fs')

const defaultInputPath = `${__dirname}/challenges.json`

logger.info('Requesting to insert challenge data to database...')

async function main () {
  let inputPath = process.argv[2]
  if (!process.argv[2]) {
    logger.info(`No input path to the challenge data file provided. Using default path ${defaultInputPath}`)
    inputPath = defaultInputPath
  }
  const challengeData = JSON.parse(fs.readFileSync(inputPath).toString())
  await models.Challenge.batchPut(challengeData)
}

main()
  .then(() => {
    logger.info('Challenge data has been inserted to database')
    process.exit()
  }).catch((err) => {
    logger.logFullError(err)
    process.exit(1)
  })
