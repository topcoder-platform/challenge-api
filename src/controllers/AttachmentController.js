/**
 * Controller for attachment endpoints
 */
const service = require('../services/AttachmentService')

/**
 * Upload attachment
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function uploadAttachment (req, res) {
  const result = await service.uploadAttachment(req.authUser,
    req.params.challengeId, req.files)
  res.send(result)
}

/**
 * Download attachment
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function downloadAttachment (req, res) {
  const result = await service.downloadAttachment(req.authUser,
    req.params.challengeId, req.params.attachmentId)
  res.attachment(result.fileName)
  res.set('Content-Type', result.mimetype)
  res.send(result.data)
}

module.exports = {
  uploadAttachment,
  downloadAttachment
}
