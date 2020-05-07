/**
 * Controller for challenge type timeline templates endpoints
 */
const HttpStatus = require('http-status-codes')
const service = require('../services/ChallengeTypeTimelineTemplateService')

/**
 * Search challenge type timeline templates.
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function searchChallengeTypeTimelineTemplates (req, res) {
  const result = await service.searchChallengeTypeTimelineTemplates(req.query)
  res.send(result)
}

/**
 * Create challenge type timeline template.
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function createChallengeTypeTimelineTemplate (req, res) {
  const result = await service.createChallengeTypeTimelineTemplate(req.body)
  res.status(HttpStatus.CREATED).send(result)
}

/**
 * Get challenge type timeline template.
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getChallengeTypeTimelineTemplate (req, res) {
  const result = await service.getChallengeTypeTimelineTemplate(req.params.challengeTypeTimelineTemplateId)
  res.send(result)
}

/**
 * Fully update challenge type timeline template.
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function fullyUpdateChallengeTypeTimelineTemplate (req, res) {
  const result = await service.fullyUpdateChallengeTypeTimelineTemplate(req.params.challengeTypeTimelineTemplateId, req.body)
  res.send(result)
}

/**
 * Delete challenge type timeline template.
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function deleteChallengeTypeTimelineTemplate (req, res) {
  const result = await service.deleteChallengeTypeTimelineTemplate(req.params.challengeTypeTimelineTemplateId)
  res.send(result)
}

module.exports = {
  searchChallengeTypeTimelineTemplates,
  createChallengeTypeTimelineTemplate,
  getChallengeTypeTimelineTemplate,
  fullyUpdateChallengeTypeTimelineTemplate,
  deleteChallengeTypeTimelineTemplate
}
