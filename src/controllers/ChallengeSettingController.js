/**
 * Controller for challenge type endpoints
 */
const HttpStatus = require('http-status-codes')
const service = require('../services/ChallengeSettingService')
const helper = require('../common/helper')

/**
 * Search challenge settings
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function searchChallengeSettings (req, res) {
  const result = await service.searchChallengeSettings(req.query)
  helper.setResHeaders(req, res, result)
  res.send(result.result)
}

/**
 * Create challenge setting
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function createChallengeSetting (req, res) {
  const result = await service.createChallengeSetting(req.body)
  res.status(HttpStatus.CREATED).send(result)
}

/**
 * Get challenge setting
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getChallengeSetting (req, res) {
  const result = await service.getChallengeSetting(req.params.challengeSettingId)
  res.send(result)
}

/**
 * Update challenge setting
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function updateChallengeSetting (req, res) {
  const result = await service.updateChallengeSetting(req.params.challengeSettingId, req.body)
  res.send(result)
}

module.exports = {
  searchChallengeSettings,
  createChallengeSetting,
  getChallengeSetting,
  updateChallengeSetting
}
