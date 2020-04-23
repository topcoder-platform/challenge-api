/**
 * Controller for challenge type endpoints
 */
const HttpStatus = require('http-status-codes')
const service = require('../services/ChallengeMetadataService')
const helper = require('../common/helper')

/**
 * Search challenge metadata
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function searchChallengeMetadata (req, res) {
  const result = await service.searchChallengeMetadata(req.query)
  helper.setResHeaders(req, res, result)
  res.send(result.result)
}

/**
 * Create challenge metadata
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function createChallengeMetadata (req, res) {
  const result = await service.createChallengeMetadata(req.body)
  res.status(HttpStatus.CREATED).send(result)
}

/**
 * Get challenge metadata
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getChallengeMetadata (req, res) {
  const result = await service.getChallengeMetadata(req.params.challengeMetadataId)
  res.send(result)
}

/**
 * Update challenge metadata
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function updateChallengeMetadata (req, res) {
  const result = await service.updateChallengeMetadata(req.params.challengeMetadataId, req.body)
  res.send(result)
}

module.exports = {
  searchChallengeMetadata,
  createChallengeMetadata,
  getChallengeMetadata,
  updateChallengeMetadata
}
