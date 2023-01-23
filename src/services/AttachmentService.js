/**
 * This service provides operations of attachments.
 */
const { GRPC_CHALLENGE_SERVER_HOST, GRPC_CHALLENGE_SERVER_PORT } = process.env;

const {
  DomainHelper: { getLookupCriteria, getScanCriteria },
} = require("@topcoder-framework/lib-common");

const { AttachmentDomain } = require("@topcoder-framework/domain-challenge");

const _ = require("lodash");
const Joi = require("joi");
const uuid = require("uuid/v4");
const config = require("config");
const errors = require("../common/errors");
const helper = require("../common/helper");
const s3ParseUrl = require("../common/s3ParseUrl");
const models = require("../models");
const logger = require("../common/logger");
const constants = require("../../app-constants");
const challengeService = require("./ChallengeService");

const bucketWhitelist = config.AMAZON.BUCKET_WHITELIST.split(",").map(
  (bucketName) => bucketName.trim()
);

const attachmentDomain = new AttachmentDomain(
  GRPC_CHALLENGE_SERVER_HOST,
  GRPC_CHALLENGE_SERVER_PORT
);

/**
 * Check if a url is acceptable.
 *
 * @param {String} url the url
 * @returns {undefined}
 */
function validateUrl(url) {
  const s3UrlObject = s3ParseUrl(url);
  if (!s3UrlObject) {
    return;
  }
  if (bucketWhitelist.includes(s3UrlObject.bucket)) {
    return;
  }
  throw new errors.BadRequestError(
    `The bucket ${s3UrlObject.bucket} is not in the whitelist`
  );
}

/**
 * Get challenge and attachment by both challengeId and attachmentId
 * @param {String} challengeId the challenge id
 * @param {String} attachmentId the attachment id
 * @returns {Object} the challenge and the attachment
 */
async function _getChallengeAttachment(challengeId, attachmentId) {
  const challenge = await helper.getById("Challenge", challengeId);
  const attachment = await attachmentDomain.lookup(getLookupCriteria("id", attachmentId));
  if (!attachment || attachment.challengeId !== challengeId) {
    throw errors.NotFoundError(
      `Attachment ${attachmentId} not found in challenge ${challengeId}`
    );
  }
  return { challenge, attachment };
}

/**
 * Create attachment.
 * @param {String} challengeId the challenge id
 * @param {Array} attachments the attachments to be created
 * @returns {Object} the created attachment
 */
async function createAttachment(currentUser, challengeId, attachments) {
  const challenge = await helper.getById("Challenge", challengeId);
  await helper.ensureUserCanModifyChallenge(currentUser, challenge);
  const newAttachments = [];
  for (const attachment of attachments) {
    validateUrl(attachment.url);
    const attachmentObject = { challengeId, ...attachment };
    const newAttachment = await attachmentDomain.create(attachmentObject);
    await helper.postBusEvent(
      constants.Topics.ChallengeAttachmentCreated,
      newAttachment
    );
    newAttachments.push(newAttachment);
  }
  // update challenge object
  await challengeService.partiallyUpdateChallenge(currentUser, challengeId, {
    attachments: [..._.get(challenge, "attachments", []), ...newAttachments],
  });
  // post bus event
  return newAttachments;
}

createAttachment.schema = {
  currentUser: Joi.any(),
  challengeId: Joi.id(),
  attachments: Joi.array()
    .items(
      Joi.object().keys({
        name: Joi.string().required(),
        url: Joi.string().uri().required(),
        fileSize: Joi.fileSize(),
        description: Joi.string(),
      })
    )
    .required()
    .min(1),
};

/**
 * Get attachment
 * @param {String} challengeId the challenge id
 * @param {String} attachmentId the attachment id
 * @returns {Object} the attachment with given id
 */
async function getAttachment(currentUser, challengeId, attachmentId) {
  const { challenge, attachment } = await _getChallengeAttachment(
    challengeId,
    attachmentId
  );
  await helper.ensureUserCanViewChallenge(currentUser, challenge);
  return attachment;
}

getAttachment.schema = {
  currentUser: Joi.any(),
  challengeId: Joi.id(),
  attachmentId: Joi.id(),
};

/**
 * Update attachment.
 * @param {String} challengeId the challenge id
 * @param {String} attachmentId the attachment id
 * @param {Object} data the attachment data to be updated
 * @param {Boolean} isFull the flag indicate it is a fully update operation.
 * @returns {Object} the updated attachment
 */
async function update(currentUser, challengeId, attachmentId, data, isFull) {
  const { challenge, attachment } = await _getChallengeAttachment(
    challengeId,
    attachmentId
  );
  await helper.ensureUserCanModifyChallenge(currentUser, challenge);
  validateUrl(data.url);

  if (isFull) {
    // optional fields can be undefined
    attachment.fileSize = data.fileSize;
    attachment.description = data.description;
  }

  const { items } = await attachmentDomain.update({
    filterCriteria: getScanCriteria({ id: attachmentId }),
    updateInput: data
  });
  // update challenge object
  const newAttachments = _.get(challenge, "attachments", []);
  try {
    newAttachments[_.findIndex(newAttachments, (a) => a.id === attachmentId)] =
      items[0];
    await challengeService.partiallyUpdateChallenge(currentUser, challengeId, {
      attachments: newAttachments,
    });
  } catch (e) {
    logger.warn(
      `The attachment ${attachmentId} does not exist on the challenge object`
    );
  }
  // post bus event
  await helper.postBusEvent(
    constants.Topics.ChallengeAttachmentUpdated,
    isFull ? items[0] : _.assignIn({ id: attachmentId }, data)
  );
  return items[0];
}

/**
 * Fully update attachment.
 * @param {String} challengeId the challenge id
 * @param {String} attachmentId the attachment id
 * @param {Object} data the attachment data to be updated
 * @returns {Object} the updated attachment
 */
async function fullyUpdateAttachment(
  currentUser,
  challengeId,
  attachmentId,
  data
) {
  return update(currentUser, challengeId, attachmentId, data, true);
}

fullyUpdateAttachment.schema = {
  currentUser: Joi.any(),
  challengeId: Joi.id(),
  attachmentId: Joi.id(),
  data: Joi.object()
    .keys({
      name: Joi.string().required(),
      url: Joi.string().uri().required(),
      fileSize: Joi.fileSize(),
      description: Joi.string(),
    })
    .required(),
};

/**
 * Partially update attachment.
 * @param {String} challengeId the challenge id
 * @param {String} attachmentId the attachment id
 * @param {Object} data the attachment data to be updated
 * @returns {Object} the updated attachment
 */
async function partiallyUpdateAttachment(
  currentUser,
  challengeId,
  attachmentId,
  data
) {
  return update(currentUser, challengeId, attachmentId, data);
}

partiallyUpdateAttachment.schema = {
  currentUser: Joi.any(),
  challengeId: Joi.id(),
  attachmentId: Joi.id(),
  data: Joi.object()
    .keys({
      name: Joi.string(),
      url: Joi.string().uri(),
      fileSize: Joi.fileSize(),
      description: Joi.string(),
    })
    .required(),
};

/**
 * Delete attachment.
 * @param {String} attachmentId the attachment id
 * @returns {Object} the deleted attachment
 */
async function deleteAttachment(currentUser, challengeId, attachmentId) {
  const { challenge, attachment } = await _getChallengeAttachment(
    challengeId,
    attachmentId
  );
  await helper.ensureUserCanModifyChallenge(currentUser, challenge);
  const s3UrlObject = s3ParseUrl(attachment.url);
  if (s3UrlObject) {
    await helper.deleteFromS3(s3UrlObject.bucket, s3UrlObject.key);
  }

  await attachmentDomain.delete(getLookupCriteria("id", attachmentId));

  // update challenge object
  const newAttachments = _.get(challenge, "attachments", []);
  try {
    newAttachments.splice(
      _.findIndex(newAttachments, (a) => a.id === attachmentId),
      1
    );
    await challengeService.partiallyUpdateChallenge(currentUser, challengeId, {
      attachments: newAttachments,
    });
  } catch (e) {
    logger.warn(
      `The attachment ${attachmentId} does not exist on the challenge object`
    );
  }
  // post bus event
  await helper.postBusEvent(
    constants.Topics.ChallengeAttachmentDeleted,
    attachment
  );
  return attachment;
}

deleteAttachment.schema = {
  currentUser: Joi.any(),
  challengeId: Joi.id(),
  attachmentId: Joi.id(),
};

/**
 * Download attachment.
 * @param {String} challengeId the challenge id
 * @param {String} attachmentId the attachment id
 * @returns {Promise<Object>} the downloaded attachment data
 */
async function downloadAttachment(currentUser, challengeId, attachmentId) {
  const { challenge, attachment } = await _getChallengeAttachment(
    challengeId,
    attachmentId
  );
  await helper.ensureUserCanViewChallenge(currentUser, challenge);
  const s3UrlObject = s3ParseUrl(attachment.url);
  if (s3UrlObject) {
    // download from S3
    const data = await helper.downloadFromS3(
      s3UrlObject.bucket,
      s3UrlObject.key
    );
    data.fileName = attachment.name;
    return data;
  }
  const data = await helper.downloadFromFileStack(attachment.url);
  data.fileName = attachment.name;
  return data;
}

downloadAttachment.schema = {
  currentUser: Joi.any(),
  challengeId: Joi.id(),
  attachmentId: Joi.id(),
};

module.exports = {
  createAttachment,
  getAttachment,
  fullyUpdateAttachment,
  partiallyUpdateAttachment,
  deleteAttachment,
  downloadAttachment,
};

logger.buildService(module.exports, {
  validators: { enabled: true },
  logging: { enabled: true },
  tracing: {
    enabled: true,
    annotations: ["id"],
    metadata: ["createdBy", "status"],
  },
});
