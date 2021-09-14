/**
 * Clear the postman test data. All data created by postman e2e tests will be cleared.
 */
const logger = require('../../src/common/logger')
const helper = require('../../src/common/helper')
const config = require('config')

logger.info('Clear the Postman test data.')

/**
  * Clear the postman test data. The main function of this class.
  * @returns {Promise<void>}
  */
const clearTestData = async () => {
  await helper.postRequest(`${config.API_BASE_URL}/${config.API_VERSION}/challenges/internal/jobs/clean`)
}

clearTestData().then(() => {
  logger.info('Completed!')
  process.exit()
}).catch((e) => {
  logger.logFullError(e)
  process.exit(1)
})

module.exports = {
  clearTestData
}
