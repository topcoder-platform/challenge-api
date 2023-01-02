/**
 * This service provides operations of challenge type timeline template.
 */

const { GRPC_CHALLENGE_SERVER_HOST, GRPC_CHALLENGE_SERVER_PORT } = process.env;

const {
  DomainHelper: { getScanCriteria, getLookupCriteria },
} = require("@topcoder-framework/lib-common");

const {
  ChallengeTimelineTemplateDomain,
} = require("@topcoder-framework/domain-challenge");

const Joi = require("joi");

const helper = require("../common/helper");
const errors = require("../common/errors");

const constants = require("../../app-constants");
const logger = require("../common/logger");

const challengeTimelineTemplateDomain = new ChallengeTimelineTemplateDomain(
  GRPC_CHALLENGE_SERVER_HOST,
  GRPC_CHALLENGE_SERVER_PORT
);

/**
 * Search challenge type timeline templates.
 * @param {Object} criteria the search criteria
 * @returns {Promise<array>} the search result
 */
async function searchChallengeTimelineTemplates(criteria) {
  const records = await challengeTimelineTemplateDomain.scan({
    scanCriteria: getScanCriteria(criteria),
  });

  const nRecords = records.length;

  return {
    total: nRecords,
    page: 1,
    perPage: Math.max(nRecords, 10),
    result: records,
  };
}

searchChallengeTimelineTemplates.schema = {
  criteria: Joi.object().keys({
    typeId: Joi.optionalId(),
    trackId: Joi.optionalId(),
    timelineTemplateId: Joi.optionalId(),
    isDefault: Joi.boolean(),
  }),
};

/**
 * Unset existing default timeline template in order to create a new one
 * @param {String} typeId the type ID
 * @param {String} trackId the track ID
 */
async function unsetDefaultTimelineTemplate(typeId, trackId) {
  const records = await searchChallengeTimelineTemplates({
    typeId,
    trackId,
    isDefault: true,
  });
  if (records.total === 0) {
    return;
  }
  for (const record of records.result) {
    await fullyUpdateChallengeTimelineTemplate(record.id, {
      ...record,
      isDefault: false,
    });
  }
}

/**
 * Create challenge type timeline template.
 * @param {Object} data the data to create challenge type timeline template
 * @returns {Object} the created challenge type timeline template
 */
async function createChallengeTimelineTemplate(data) {
  // check duplicate
  const records = await searchChallengeTimelineTemplates(data);
  if (records.total > 0) {
    throw new errors.ConflictError(
      "The challenge type timeline template is already defined."
    );
  }

  // check exists
  await helper.getById("ChallengeType", data.typeId);
  await helper.getById("ChallengeTrack", data.trackId);
  await helper.getById("TimelineTemplate", data.timelineTemplateId);

  if (data.isDefault) {
    await unsetDefaultTimelineTemplate(data.typeId, data.trackId);
  }

  const template = await challengeTimelineTemplateDomain.create(data);

  // post bus event
  await helper.postBusEvent(
    constants.Topics.ChallengeTimelineTemplateCreated,
    template
  );
  return template;
}

createChallengeTimelineTemplate.schema = {
  data: Joi.object()
    .keys({
      typeId: Joi.id(),
      trackId: Joi.id(),
      timelineTemplateId: Joi.id(),
      isDefault: Joi.boolean().default(false).required(),
    })
    .required(),
};

/**
 * Get challenge type timeline template.
 * @param {String} challengeTimelineTemplateId the challenge type timeline template id
 * @returns {Promise<Object>} the challenge type timeline template with given id
 */
async function getChallengeTimelineTemplate(challengeTimelineTemplateId) {
  return challengeTimelineTemplateDomain.lookup(
    getLookupCriteria("id", challengeTimelineTemplateId)
  );
}

getChallengeTimelineTemplate.schema = {
  challengeTimelineTemplateId: Joi.id(),
};

/**
 * Fully update challenge type timeline template.
 * @param {String} challengeTimelineTemplateId the challenge type timeline template id
 * @param {Object} data the challenge type timeline template data to be updated
 * @returns {Object} the updated challenge type timeline template
 */
async function fullyUpdateChallengeTimelineTemplate(
  challengeTimelineTemplateId,
  data
) {
  const record = await getChallengeTimelineTemplate(
    challengeTimelineTemplateId
  );
  if (
    record.typeId === data.typeId &&
    record.trackId === data.trackId &&
    record.timelineTemplateId === data.timelineTemplateId &&
    record.isDefault === data.isDefault
  ) {
    // no change
    return record;
  }

  // check duplicate
  const records = await searchChallengeTimelineTemplates(data);
  if (records.total > 0) {
    throw new errors.ConflictError(
      `A challenge type timeline template with typeId: ${data.typeId}, trackId: ${data.trackId}, timelineTemplateId: ${data.timelineTemplateId} already exists.`
    );
  }
  // check exists
  await helper.getById("ChallengeType", data.typeId);
  await helper.getById("ChallengeTrack", data.trackId);
  await helper.getById("TimelineTemplate", data.timelineTemplateId);

  if (data.isDefault) {
    await unsetDefaultTimelineTemplate(data.typeId, data.trackId);
  }

  const ret = await helper.update(record, data);
  // post bus event
  await helper.postBusEvent(
    constants.Topics.ChallengeTimelineTemplateUpdated,
    ret
  );
  return ret;
}

fullyUpdateChallengeTimelineTemplate.schema = {
  challengeTimelineTemplateId: Joi.id(),
  data: createChallengeTimelineTemplate.schema.data,
};

/**
 * Delete challenge type timeline template.
 * @param {String} challengeTimelineTemplateId the challenge type timeline template id
 * @returns {Object} the deleted challenge type timeline template
 */
async function deleteChallengeTimelineTemplate(challengeTimelineTemplateId) {
  const templates = await challengeTimelineTemplateDomain.delete(
    getLookupCriteria("id", challengeTimelineTemplateId)
  );

  if (templates.length === 0) {
    throw new errors.NotFoundError(
      `A challenge type timeline template with id: ${challengeTimelineTemplateId} not found.`
    );
  }

  // post bus event
  await helper.postBusEvent(
    constants.Topics.ChallengeTimelineTemplateDeleted,
    templates[0]
  );
  return templates[0];
}

deleteChallengeTimelineTemplate.schema = {
  challengeTimelineTemplateId: Joi.id(),
};

module.exports = {
  searchChallengeTimelineTemplates,
  createChallengeTimelineTemplate,
  getChallengeTimelineTemplate,
  fullyUpdateChallengeTimelineTemplate,
  deleteChallengeTimelineTemplate,
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
