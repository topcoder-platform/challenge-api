/**
 * Controller for challenge type endpoints
 */
const HttpStatus = require('http-status-codes')
const service = require('../services/ChallengeTrackService')
const helper = require('../common/helper')

/**
 * Search challenge types
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function searchChallengeTracks (req, res) {
  const result = await service.searchChallengeTracks(req.query)
  helper.setResHeaders(req, res, result)
  res.send(result.result)
}

/**
 * Create challenge type
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function createChallengeTrack (req, res) {
  const result = await service.createChallengeTrack(req.body)
  res.status(HttpStatus.CREATED).send(result)
}

/**
 * Get challenge type
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getChallengeTrack (req, res) {
  const result = await service.getChallengeTrack(req.params.challengeTrackId)
  res.send(result)
}

/**
 * Fully update challenge type
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function fullyUpdateChallengeTrack (req, res) {
  const result = await service.fullyUpdateChallengeTrack(req.params.challengeTrackId, req.body)
  res.send(result)
}

/**
 * Partially update challenge type
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function partiallyUpdateChallengeTrack (req, res) {
  const result = await service.partiallyUpdateChallengeTrack(req.params.challengeTrackId, req.body)
  res.send(result)
}

module.exports = {
  searchChallengeTracks,
  createChallengeTrack,
  getChallengeTrack,
  fullyUpdateChallengeTrack,
  partiallyUpdateChallengeTrack
}
