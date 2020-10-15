/**
 * This service provides operations of attachments.
 */

const _ = require('lodash')
const Joi = require('joi')
const uuid = require('uuid/v4')
const config = require('config')
const helper = require('../common/helper')
// const logger = require('../common/logger')
const errors = require('../common/errors')

/**
 * Check whether user can upload attachment of challenge.
 * @param {Object} authUser the current user
 * @param {String} challengeId the challenge id
 * @returns {Promise<boolean>} whether the user can upload attachment of challenge
 */
async function canUploadChallengeAttachment (authUser, challengeId) {
  // admin can upload attachments
  if (helper.hasAdminRole(authUser)) {
    return true
  }

  // if user is one of configured copilot resource of challenge, then s/he can upload attachment
  const resources = await helper.getChallengeResources(challengeId)
  return !!_.find(resources, (r) => String(r.memberId) === String(authUser.userId) &&
    _.includes(config.COPILOT_RESOURCE_ROLE_IDS, r.roleId))
}

/**
 * Upload attachment.
 * @param {Object} authUser the current user
 * @param {String} challengeId the challenge id
 * @param {Object} files the uploaded files
 * @returns {Promise<Object>} the created attachment
 */
async function uploadAttachment (authUser, challengeId, files) {
  // ensure challenge exists
  await helper.getById('Challenge', challengeId)

  if (!authUser.isMachine) {
    // check authorization
    if (!(await canUploadChallengeAttachment(authUser, challengeId))) {
      throw new errors.ForbiddenError('You are not allowed to upload attachment of the challenge.')
    }
  }

  const file = files.attachment
  if (file.truncated) {
    throw new errors.BadRequestError(`The attachment is too large, it should not exceed ${
      (config.FILE_UPLOAD_SIZE_LIMIT / 1024 / 1024).toFixed(2)
    } MB.`)
  }

  const id = uuid()
  // upload file to AWS S3
  await helper.uploadToS3(id, file.data, file.mimetype, file.name)

  // create attachment in db
  const attachment = {
    id,
    fileSize: file.size,
    fileName: file.name,
    challengeId
  }
  return helper.create('Attachment', attachment)
}

uploadAttachment.schema = {
  authUser: Joi.object().required(),
  challengeId: Joi.id(),
  files: Joi.object().keys({
    attachment: Joi.object().required()
  }).required()
}

/**
 * Check whether user can download attachment of challenge.
 * @param {Object} authUser the current user
 * @param {String} challengeId the challenge id
 * @returns {Promise<boolean>} whether the user can download attachment of challenge
 */
async function canDownloadChallengeAttachment (authUser, challengeId) {
  // admin can download attachments
  if (helper.hasAdminRole(authUser)) {
    return true
  }

  // if user is resource of challenge, then s/he can download attachment
  const resources = await helper.getChallengeResources(challengeId)
  return !!_.find(resources, (r) => String(r.memberId) === String(authUser.userId))
}

/**
 * Download attachment.
 * @param {Object} authUser the current user
 * @param {String} challengeId the challenge id
 * @param {String} attachmentId the attachment id
 * @returns {Promise<Object>} the downloaded attachment data
 */
async function downloadAttachment (authUser, challengeId, attachmentId) {
  if (!authUser.isMachine) {
    // check authorization
    if (!(await canDownloadChallengeAttachment(authUser, challengeId))) {
      throw new errors.ForbiddenError('You are not allowed to download attachment of the challenge.')
    }
  }
  const attachment = await helper.getById('Attachment', attachmentId)
  if (attachment.challengeId !== challengeId) {
    throw new errors.BadRequestError('The attachment challengeId does not match the path challengeId.')
  }
  // download from S3
  const result = await helper.downloadFromS3(attachmentId)
  result.fileName = attachment.fileName
  return result
}

downloadAttachment.schema = {
  authUser: Joi.object().required(),
  challengeId: Joi.id(),
  attachmentId: Joi.id()
}

module.exports = {
  uploadAttachment,
  downloadAttachment
}

// logger.buildService(module.exports)
