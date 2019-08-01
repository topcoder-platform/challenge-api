/**
 * Controller for challenge phase endpoints
 */
const HttpStatus = require('http-status-codes')
const service = require('../services/TimelineTemplateService')
const helper = require('../common/helper')

/**
 * Search timeline templates.
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function searchTimelineTemplates (req, res) {
  const result = await service.searchTimelineTemplates(req.query)
  helper.setResHeaders(req, res, result)
  res.send(result.result)
}

/**
 * Create timeline template.
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function createTimelineTemplate (req, res) {
  const result = await service.createTimelineTemplate(req.body)
  res.status(HttpStatus.CREATED).send(result)
}

/**
 * Get timeline template.
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getTimelineTemplate (req, res) {
  const result = await service.getTimelineTemplate(req.params.timelineTemplateId)
  res.send(result)
}

/**
 * Fully update timeline template.
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function fullyUpdateTimelineTemplate (req, res) {
  const result = await service.fullyUpdateTimelineTemplate(req.params.timelineTemplateId, req.body)
  res.send(result)
}

/**
 * Partially update timeline template.
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function partiallyUpdateTimelineTemplate (req, res) {
  const result = await service.partiallyUpdateTimelineTemplate(req.params.timelineTemplateId, req.body)
  res.send(result)
}

/**
 * Delete timeline template.
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function deleteTimelineTemplate (req, res) {
  const result = await service.deleteTimelineTemplate(req.params.timelineTemplateId)
  res.send(result)
}

module.exports = {
  searchTimelineTemplates,
  createTimelineTemplate,
  getTimelineTemplate,
  fullyUpdateTimelineTemplate,
  partiallyUpdateTimelineTemplate,
  deleteTimelineTemplate
}
