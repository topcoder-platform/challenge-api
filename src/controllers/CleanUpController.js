/**
 * Controller for cleaning up test data
 */

const service = require('../services/CleanUpService')

/**
 * cleanup all the resources created by postman
 * @param {Object} req the request
 * @param {Object} res the response
 */

async function cleanUpTestData (req, res) {
  await service.cleanUpTestData()
  res.sendStatus(200)
}

module.exports = {
  cleanUpTestData
}
