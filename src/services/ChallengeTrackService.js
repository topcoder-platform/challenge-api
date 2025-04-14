/**
 * This service provides operations of challenge types.
 */
const _ = require("lodash");
const Joi = require("joi");
const helper = require("../common/helper");
const logger = require("../common/logger");
const errors = require("../common/errors");
const constants = require("../../app-constants");

const prisma = require('../common/prisma').getClient()

/**
 * Search challenge types
 * @param {Object} criteria the search criteria
 * @returns {Promise<Object>} the search result
 */
async function searchChallengeTracks (criteria) {
  const filter = getSearchFilter(_.omit(criteria, ['page', 'perPage']))
  const page = criteria.page || 1;
  const perPage = criteria.perPage || 50;

  const cacheKey = `ChallengeTrack${page}_${perPage}_${JSON.stringify(criteria)}`;

  let records = helper.getFromInternalCache(cacheKey);
  if (records == null || records.length === 0) {
    records = await prisma.challengeTrack.findMany({ where: filter })
    records = _.map(records, r => _.omit(r, constants.auditFields))
    helper.setToInternalCache(cacheKey, records);
  }

  const total = records.length;
  const result = records.slice((page - 1) * perPage, page * perPage);

  return { total, page, perPage, result };
}

/**
 * Get prisma filter
 *
 * @param {Object} criteria search criteria
 * @returns filter used in prisma
 */
function getSearchFilter (criteria) {
  const ret = {}
  if (!_.isEmpty(criteria.name)) {
    ret.name = { equals: criteria.name }
  }
  if (!_.isEmpty(criteria.description)) {
    ret.description = { contains: criteria.description }
  }
  if (!_.isEmpty(criteria.abbreviation)) {
    ret.abbreviation = { equals: criteria.abbreviation }
  }
  if (_.isUndefined(criteria.isActive)) {
    ret.isActive = { equals: criteria.isActive }
  }
  if (criteria.legacyId) {
    ret.legacyId = { equals: criteria.legacyId }
  }
  if (!_.isEmpty(criteria.track)) {
    ret.track = { equals: criteria.track }
  }
  return ret
}

searchChallengeTracks.schema = {
  criteria: Joi.object().keys({
    page: Joi.page(),
    perPage: Joi.number().integer().min(1).max(100).default(100),
    name: Joi.string(),
    description: Joi.string(),
    isActive: Joi.boolean(),
    abbreviation: Joi.string(),
    legacyId: Joi.number().integer().positive(),
    track: Joi.string().valid(_.values(constants.challengeTracks)),
  }),
};

/**
 * Check challenge track exists by same name
 * @param {String} name challenge track name
 * @throws conflict error if same name exists
 */
async function checkTrackName (name) {
  const existingByName = await prisma.challengeTrack.findMany({
    where: { name }
  })
  if (existingByName.length > 0) { throw new errors.ConflictError(`ChallengeTrack with name ${name} already exists`) }
}

/**
 * Check challenge track exists by same abbreviation
 * @param {String} name challenge track abbreviation
 * @throws conflict error if same abbreviation exists
 */
async function checkTrackAbrv (abbreviation) {
  const existingByAbbr = await prisma.challengeTrack.findMany({
    where: { abbreviation }
  })
  if (existingByAbbr.length > 0) {
    throw new errors.ConflictError(
      `ChallengeTrack with abbreviation ${abbreviation} already exists`
    )
  }
}

/**
 * Create challenge type.
 * @param {Object} authUser auth user
 * @param {Object} type the challenge type to created
 * @returns {Object} the created challenge type
 */
async function createChallengeTrack (authUser, type) {
  await checkTrackName(type.name)
  await checkTrackAbrv(type.abbreviation)
  let ret = await prisma.challengeTrack.create({
    data: {
      ...type,
      createdBy: authUser.userId,
      updatedBy: authUser.userId
    }
  })
  ret = _.omit(ret, constants.auditFields)
  helper.flushInternalCache()
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTrackCreated, ret);
  return ret;
}

createChallengeTrack.schema = {
  authUser: Joi.any(),
  type: Joi.object()
    .keys({
      name: Joi.string().required(),
      description: Joi.string(),
      isActive: Joi.boolean().required(),
      abbreviation: Joi.string().required(),
      legacyId: Joi.number().integer().positive(),
      track: Joi.string().valid(_.values(constants.challengeTracks)),
    })
    .required(),
};

/**
 * Get challenge type.
 * @param {String} id the challenge type id
 * @returns {Object} the challenge type with given id
 */
async function getChallengeTrack (id) {
  let ret = await prisma.challengeTrack.findUnique({ where: { id } })
  if (!ret || _.isUndefined(ret.id)) {
    throw new errors.NotFoundError(`Challenge Track with id: ${id} doesn't exist`)
  }
  ret = _.omit(ret, constants.auditFields)
  return ret
}

getChallengeTrack.schema = {
  id: Joi.id(),
};

/**
 * Fully update challenge type.
 * @param {Object} authUser auth user
 * @param {String} id the challenge type id
 * @param {Object} data the challenge type data to be updated
 * @returns {Object} the updated challenge type
 */
async function fullyUpdateChallengeTrack (authUser, id, data) {
  const type = await getChallengeTrack(id)
  if (type.name.toLowerCase() !== data.name.toLowerCase()) {
    await checkTrackName(data.name)
  }
  if (type.abbreviation.toLowerCase() !== data.abbreviation.toLowerCase()) {
    await checkTrackAbrv(data.abbreviation)
  }
  if (_.isUndefined(data.description)) {
    data.description = null
  }
  if (_.isUndefined(data.legacyId)) {
    data.legacyId = null
  }
  if (_.isUndefined(data.track)) {
    data.track = null
  }
  data.updatedBy = authUser.userId
  let ret = await prisma.challengeTrack.update({
    where: { id },
    data
  })
  ret = _.omit(ret, constants.auditFields)
  helper.flushInternalCache()
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTrackUpdated, ret)
  return ret
}

fullyUpdateChallengeTrack.schema = {
  authUser: Joi.any(),
  id: Joi.id(),
  data: Joi.object()
    .keys({
      name: Joi.string().required(),
      description: Joi.string(),
      isActive: Joi.boolean().required(),
      abbreviation: Joi.string().required(),
      legacyId: Joi.number().integer().positive(),
      track: Joi.string().valid(_.values(constants.challengeTracks)),
    })
    .required(),
};

/**
 * Partially update challenge type.
 * @param {Object} authUser auth user
 * @param {String} id the challenge type id
 * @param {Object} data the challenge type data to be updated
 * @returns {Object} the updated challenge type
 */
async function partiallyUpdateChallengeTrack (authUser, id, data) {
  const type = await getChallengeTrack(id)
  if (data.name && type.name.toLowerCase() !== data.name.toLowerCase()) {
    await checkTrackName(data.name)
  }
  if (data.abbreviation && type.abbreviation.toLowerCase() !== data.abbreviation.toLowerCase()) {
    await checkTrackAbrv(data.abbreviation)
  }
  data.updatedBy = authUser.userId
  let ret = await prisma.challengeTrack.update({
    where: { id },
    data: _.extend(type, data)
  })
  ret = _.omit(ret, constants.auditFields)
  helper.flushInternalCache()
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTrackUpdated, _.assignIn({ id }, data))
  return ret
}

partiallyUpdateChallengeTrack.schema = {
  authUser: Joi.any(),
  id: Joi.id(),
  data: Joi.object()
    .keys({
      name: Joi.string(),
      description: Joi.string(),
      isActive: Joi.boolean(),
      abbreviation: Joi.string(),
      legacyId: Joi.number().integer().positive(),
      track: Joi.string().valid(_.values(constants.challengeTracks)),
    })
    .required(),
};

/**
 * Delete challenge track.
 * @param {String} id the challenge track id
 * @return {Object} the deleted challenge track
 */
async function deleteChallengeTrack (id) {
  let ret = await getChallengeTrack(id)
  await prisma.challengeTrack.delete({ where: { id } })
  helper.flushInternalCache();

  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTypeDeleted, ret)
  return ret
}

deleteChallengeTrack.schema = {
  id: Joi.id(),
};

module.exports = {
  searchChallengeTracks,
  createChallengeTrack,
  getChallengeTrack,
  fullyUpdateChallengeTrack,
  partiallyUpdateChallengeTrack,
  deleteChallengeTrack,
};

logger.buildService(module.exports);
