/**
 * Controller for attachment endpoints
 */
const HttpStatus = require('http-status-codes')
const service = require('../services/AttachmentService')

/**
 * Create attachment
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function createAttachment (req, res) {
  const result = await service.createAttachment(req.params.challengeId, req.body)
  res.status(HttpStatus.CREATED).send(result)
}

/**
 * Find attachment
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getAttachment (req, res) {
  const result = await service.getAttachment(req.params.challengeId, req.params.attachmentId)
  res.send(result)
}

/**
 * Update attachment
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function updateAttachment (req, res) {
  const result = await service.fullyUpdateAttachment(req.params.challengeId, req.params.attachmentId, req.body)
  res.send(result)
}

/**
 * Partially update attachment
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function partiallyUpdateAttachment (req, res) {
  const result = await service.partiallyUpdateAttachment(req.params.challengeId, req.params.attachmentId, req.body)
  res.send(result)
}

/**
 * Delete attachment
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function deleteAttachment (req, res) {
  const result = await service.deleteAttachment(req.params.challengeId, req.params.attachmentId)
  res.send(result)
}

/**
 * Download attachment
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function downloadAttachment (req, res) {
  const result = await service.downloadAttachment(req.params.challengeId, req.params.attachmentId)
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
