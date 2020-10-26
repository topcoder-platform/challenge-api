
/**
 * This service provides operations of attachments.
 */

const _ = require('lodash')
const Joi = require('joi')
const uuid = require('uuid/v4')
const config = require('config')
const errors = require('../common/errors')
const helper = require('../common/helper')
const s3ParseUrl = require('../common/s3ParseUrl')
const models = require('../models')
const logger = require('../common/logger')
const constants = require('../../app-constants')

const bucketWhitelist = config.AMAZON.BUCKET_WHITELIST.split(',').map((bucketName) => bucketName.trim())

/**
 * Check if a url is acceptable.
 *
 * @param {String} url the url
 * @returns {undefined}
 */
function validateUrl (url) {
  const s3UrlObject = s3ParseUrl(url)
  if (!s3UrlObject) {
    return
  }
  if (bucketWhitelist.includes(s3UrlObject.bucket)) {
    return
  }
  throw new errors.BadRequestError(`The bucket ${s3UrlObject.bucket} is not in the whitelist`)
}

/**
 * Get attachment by both challengeId and attachmentId
 * @param {String} challengeId the challenge id
 * @param {String} attachmentId the attachment id
 * @returns {Object} the attachment with given id
 */
async function getChallengeAttachment (challengeId, attachmentId) {
  await helper.getById('Challenge', challengeId)
  const attachment = await models.Attachment.get(attachmentId)
  if (!attachment || attachment.challengeId !== challengeId) {
    throw errors.NotFoundError(`Attachment ${attachmentId} not found in challenge ${challengeId}`)
  }
  return attachment
}

/**
 * Create attachment.
 * @param {String} challengeId the challenge id
 * @param {Object} attachment the attachment to created
 * @returns {Object} the created attachment
 */
async function createAttachment (challengeId, attachment) {
  await helper.getById('Challenge', challengeId)
  validateUrl(attachment.url)
  const attachmentObject = { id: uuid(), challengeId, ...attachment }
  const ret = await helper.create('Attachment', attachmentObject)
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeAttachmentCreated, ret)
  return ret
}

createAttachment.schema = {
  challengeId: Joi.id(),
  attachment: Joi.object().keys({
    name: Joi.string().required(),
    url: Joi.string().uri().required(),
    fileSize: Joi.fileSize(),
    description: Joi.string()
  }).required()
}

/**
 * Get attachment
 * @param {String} challengeId the challenge id
 * @param {String} attachmentId the attachment id
 * @returns {Object} the attachment with given id
 */
async function getAttachment (challengeId, attachmentId) {
  return getChallengeAttachment(challengeId, attachmentId)
}

getAttachment.schema = {
  challengeId: Joi.id(),
  attachmentId: Joi.id()
}

/**
 * Update attachment.
 * @param {String} challengeId the challenge id
 * @param {String} attachmentId the attachment id
 * @param {Object} data the attachment data to be updated
 * @param {Boolean} isFull the flag indicate it is a fully update operation.
 * @returns {Object} the updated attachment
 */
async function update (challengeId, attachmentId, data, isFull) {
  const attachment = await getChallengeAttachment(challengeId, attachmentId)
  validateUrl(data.url)

  if (isFull) {
    // optional fields can be undefined
    attachment.fileSize = data.fileSize
    attachment.description = data.description
  }

  const ret = await helper.update(attachment, data)
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeAttachmentUpdated,
    isFull ? ret : _.assignIn({ id: attachmentId }, data))
  return ret
}

/**
 * Fully update attachment.
 * @param {String} challengeId the challenge id
 * @param {String} attachmentId the attachment id
 * @param {Object} data the attachment data to be updated
 * @returns {Object} the updated attachment
 */
async function fullyUpdateAttachment (challengeId, attachmentId, data) {
  return update(challengeId, attachmentId, data, true)
}

fullyUpdateAttachment.schema = {
  challengeId: Joi.id(),
  attachmentId: Joi.id(),
  data: Joi.object().keys({
    name: Joi.string().required(),
    url: Joi.string().uri().required(),
    fileSize: Joi.fileSize(),
    description: Joi.string()
  }).required()
}

/**
 * Partially update attachment.
 * @param {String} challengeId the challenge id
 * @param {String} attachmentId the attachment id
 * @param {Object} data the attachment data to be updated
 * @returns {Object} the updated attachment
 */
async function partiallyUpdateAttachment (challengeId, attachmentId, data) {
  return update(challengeId, attachmentId, data)
}

partiallyUpdateAttachment.schema = {
  challengeId: Joi.id(),
  attachmentId: Joi.id(),
  data: Joi.object().keys({
    name: Joi.string(),
    url: Joi.string().uri(),
    fileSize: Joi.fileSize(),
    description: Joi.string()
  }).required()
}

/**
 * Delete attachment.
 * @param {String} attachmentId the attachment id
 * @returns {Object} the deleted attachment
 */
async function deleteAttachment (challengeId, attachmentId) {
  const attachment = await getChallengeAttachment(challengeId, attachmentId)
  const s3UrlObject = s3ParseUrl(attachment.url)
  if (s3UrlObject) {
    await helper.deleteFromS3(s3UrlObject.bucket, s3UrlObject.key)
  }
  await attachment.delete()
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeAttachmentDeleted, attachment)
  return attachment
}

deleteAttachment.schema = {
  challengeId: Joi.id(),
  attachmentId: Joi.id()
}

/**
 * Download attachment.
 * @param {String} challengeId the challenge id
 * @param {String} attachmentId the attachment id
 * @returns {Promise<Object>} the downloaded attachment data
 */
async function downloadAttachment (challengeId, attachmentId) {
  const attachment = await getChallengeAttachment(challengeId, attachmentId)
  const s3UrlObject = s3ParseUrl(attachment.url)
  if (s3UrlObject) {
    // download from S3
    const data = await helper.downloadFromS3(s3UrlObject.bucket, s3UrlObject.key)
    data.fileName = attachment.name
    return data
  }
  const data = await helper.downloadFromFileStack(attachment.url)
  data.fileName = attachment.name
  return data
}

downloadAttachment.schema = {
  challengeId: Joi.id(),
  attachmentId: Joi.id()
}

module.exports = {
  createAttachment,
  getAttachment,
  fullyUpdateAttachment,
  partiallyUpdateAttachment,
  deleteAttachment,
  downloadAttachment
}

logger.buildService(module.exports)
