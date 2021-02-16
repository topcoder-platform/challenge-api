/**
 * Controller for attachment endpoints
 */
const HttpStatus = require('http-status-codes')
const _ = require('lodash')
const service = require('../services/AttachmentService')

/**
 * Create attachment
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function createAttachment (req, res) {
  const body = _.isArray(req.body) ? req.body : [req.body]
  const result = await service.createAttachment(req.authUser, req.params.challengeId, body)
  res.status(HttpStatus.CREATED).send(result)
}

/**
 * Find attachment
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getAttachment (req, res) {
  const result = await service.getAttachment(req.authUser, req.params.challengeId, req.params.attachmentId)
  res.send(result)
}

/**
 * Update attachment
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function updateAttachment (req, res) {
  const result = await service.fullyUpdateAttachment(req.authUser, req.params.challengeId, req.params.attachmentId, req.body)
  res.send(result)
}

/**
 * Partially update attachment
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function partiallyUpdateAttachment (req, res) {
  const result = await service.partiallyUpdateAttachment(req.authUser, req.params.challengeId, req.params.attachmentId, req.body)
  res.send(result)
}

/**
 * Delete attachment
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function deleteAttachment (req, res) {
  const result = await service.deleteAttachment(req.authUser, req.params.challengeId, req.params.attachmentId)
  res.send(result)
}

/**
 * Download attachment
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function downloadAttachment (req, res) {
  const result = await service.downloadAttachment(req.authUser, req.params.challengeId, req.params.attachmentId)
  res.attachment(result.fileName)
  res.set('Content-Type', result.mimetype)
  res.send(result.data)
}

module.exports = {
  createAttachment,
  getAttachment,
  updateAttachment,
  partiallyUpdateAttachment,
  deleteAttachment,
  downloadAttachment
}
