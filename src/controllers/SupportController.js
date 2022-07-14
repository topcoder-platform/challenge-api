/**
 * Controller for support endpoints
 */
const HttpStatus = require('http-status-codes')
const service = require('../services/SupportService')
const config = require('config')
const logger = require('tc-framework').logger(config)

/**
 * Create challenge
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function createRequest (req, res) {
  logger.debug(`createRequest User: ${JSON.stringify(req.authUser)} - Body: ${JSON.stringify(req.body)}`)
  const result = await service.createRequest(req.authUser, req.body)
  res.status(HttpStatus.CREATED).send(result)
}

module.exports = {
  createRequest
}
