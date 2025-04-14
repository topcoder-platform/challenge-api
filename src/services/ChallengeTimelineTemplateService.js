/**
 * This service provides operations of challenge type timeline template.
 */
const _ = require("lodash");
const Joi = require("joi");

const helper = require("../common/helper");
const errors = require("../common/errors");

const constants = require("../../app-constants");
const logger = require("../common/logger");

const challengeTrackService = require("./ChallengeTrackService");
const challengeTypeService = require("./ChallengeTypeService");
const timelineTemplateService = require("./TimelineTemplateService");

const prisma = require('../common/prisma').getClient()

/**
 * Search challenge type timeline templates.
 * @param {Object} criteria the search criteria
 * @returns {Promise<array>} the search result
 */
async function searchChallengeTimelineTemplates(criteria) {
  const filter = getSearchFilter(_.omit(criteria, ['page', 'perPage']))

  let items = await prisma.challengeTimelineTemplate.findMany({
    where: filter
  })
  items = _.map(items, t => _.omit(t, constants.auditFields));

  const nRecords = items.length;

  return {
    total: nRecords,
    page: 1,
    perPage: Math.max(nRecords, 10),
    result: items,
  };
}

/**
 * Get prisma filter
 *
 * @param {Object} criteria search criteria
 * @returns filter used in prisma
 */
function getSearchFilter (criteria) {
  const ret = {}
  if (criteria.typeId) {
    ret.typeId = { equals: criteria.typeId }
  }
  if (criteria.trackId) {
    ret.trackId = { equals: criteria.trackId }
  }
  if (criteria.timelineTemplateId) {
    ret.timelineTemplateId = { equals: criteria.timelineTemplateId }
  }
  if (criteria.isDefault === 'true' || criteria.isDefault === 'false') {
    ret.isDefault = { equals: criteria.isDefault === 'true' }
  } else if (criteria.isDefault) {
    ret.isDefault = { equals: true }
  }
  return ret
}

searchChallengeTimelineTemplates.schema = {
  criteria: Joi.object().keys({
    typeId: Joi.optionalId(),
    trackId: Joi.optionalId(),
    timelineTemplateId: Joi.optionalId(),
    isDefault: Joi.boolean(),
    page: Joi.page(),
    perPage: Joi.perPage(),
  }),
};

/**
 * Unset existing default timeline template in order to create a new one
 * @param {Object} authUser auth user
 * @param {String} typeId the type ID
 * @param {String} trackId the track ID
 */
async function unsetDefaultTimelineTemplate (authUser, typeId, trackId) {
  const records = await searchChallengeTimelineTemplates({
    typeId,
    trackId,
    isDefault: true,
  });
  if (records.total === 0) {
    return;
  }
  for (const record of records.result) {
    await fullyUpdateChallengeTimelineTemplate(authUser, record.id, {
      ...record,
      isDefault: false,
      updatedBy: authUser.userId,
    });
  }
}

/**
 * Create challenge type timeline template.
 * @param {Object} authUser auth user
 * @param {Object} data the data to create challenge type timeline template
 * @returns {Object} the created challenge type timeline template
 */
async function createChallengeTimelineTemplate (authUser, data) {
  // check duplicate
  const records = await searchChallengeTimelineTemplates(data);
  if (records.total > 0) {
    throw new errors.ConflictError("The challenge type timeline template is already defined.");
  }

  await challengeTypeService.getChallengeType(data.typeId);
  await challengeTrackService.getChallengeTrack(data.trackId);
  await timelineTemplateService.getTimelineTemplate(data.timelineTemplateId);

  if (data.isDefault) {
    await unsetDefaultTimelineTemplate(authUser, data.typeId, data.trackId);
  }
  data.createdBy = authUser.userId
  data.updatedBy = authUser.userId

  let template = await prisma.challengeTimelineTemplate.create({ data });
  template = _.omit(template, constants.auditFields);

  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTimelineTemplateCreated, template);
  return template;
}

createChallengeTimelineTemplate.schema = {
  authUser: Joi.any(),
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
  const ret = await prisma.challengeTimelineTemplate.findUnique({ where: { id: challengeTimelineTemplateId } })
  if (!ret || _.isUndefined(ret.id)) {
    throw new errors.NotFoundError(`ChallengeTimelineTemplate with id: ${challengeTimelineTemplateId} doesn't exist`)
  }
  return _.omit(ret, constants.auditFields)
}

getChallengeTimelineTemplate.schema = {
  challengeTimelineTemplateId: Joi.id(),
};

/**
 * Fully update challenge type timeline template.
 * @param {Object} authUser auth user
 * @param {String} challengeTimelineTemplateId the challenge type timeline template id
 * @param {Object} data the challenge type timeline template data to be updated
 * @returns {Object} the updated challenge type timeline template
 */
async function fullyUpdateChallengeTimelineTemplate (authUser, challengeTimelineTemplateId, data) {
  const record = await getChallengeTimelineTemplate(challengeTimelineTemplateId)
  if (
    record.typeId === data.typeId &&
    record.trackId === data.trackId &&
    record.timelineTemplateId === data.timelineTemplateId &&
    record.isDefault === data.isDefault
  ) {
    return record;
  }

  // check duplicate
  const records = await searchChallengeTimelineTemplates(data);
  if (records.total > 0) {
    throw new errors.ConflictError(
      `A challenge type timeline template with typeId: ${data.typeId}, trackId: ${data.trackId}, timelineTemplateId: ${data.timelineTemplateId} already exists.`
    );
  }

  await challengeTypeService.getChallengeType(data.typeId);
  await challengeTrackService.getChallengeTrack(data.trackId);
  await timelineTemplateService.getTimelineTemplate(data.timelineTemplateId);

  if (data.isDefault) {
    await unsetDefaultTimelineTemplate(authUser, data.typeId, data.trackId);
  }
  data.updatedBy = authUser.userId;

  let ret = await prisma.challengeTimelineTemplate.update({
    data,
    where: { id: challengeTimelineTemplateId }
  })
  ret = _.omit(ret, constants.auditFields)

  if (ret && ret.id) {
    // post bus event
    await helper.postBusEvent(constants.Topics.ChallengeTimelineTemplateUpdated, ret);
    return ret;
  } else {
    throw new errors.NotFoundError(
      `A challenge type timeline template with id: ${challengeTimelineTemplateId} not found.`
    );
  }
}

fullyUpdateChallengeTimelineTemplate.schema = {
  authUser: Joi.any(),
  challengeTimelineTemplateId: Joi.id(),
  data: createChallengeTimelineTemplate.schema.data,
};

/**
 * Delete challenge type timeline template.
 * @param {String} challengeTimelineTemplateId the challenge type timeline template id
 * @returns {Object} the deleted challenge type timeline template
 */
async function deleteChallengeTimelineTemplate(challengeTimelineTemplateId) {
  let ret = await getChallengeTimelineTemplate(challengeTimelineTemplateId)
  await prisma.challengeTimelineTemplate.delete({ where: { id: challengeTimelineTemplateId } })
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTimelineTemplateDeleted, ret)
  return ret
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

logger.buildService(module.exports);
