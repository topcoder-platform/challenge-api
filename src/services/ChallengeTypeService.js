/**
 * This service provides operations of challenge tracks.
 */
const _ = require("lodash");
const Joi = require("joi");
const helper = require("../common/helper");
const logger = require("../common/logger");
const constants = require("../../app-constants");
const errors = require("../common/errors");

const prisma = require('../common/prisma').getClient()

/**
 * Search challenge types
 * @param {Object} criteria the search criteria
 * @returns {Promise<Object>} the search result
 */
async function searchChallengeTypes(criteria) {
  const searchFilter = getSearchFilter(_.omit(criteria, ['page', 'perPage']))

  const page = criteria.page || 1;
  const perPage = criteria.perPage || 50;

  const cacheKey = `ChallengeType_${page}_${perPage}_${JSON.stringify(criteria)}`;

  let records = helper.getFromInternalCache(cacheKey);
  if (records == null || records.length === 0) {
    records = await prisma.challengeType.findMany({ where: searchFilter })
    records = _.map(records, r => _.omit(r, constants.auditFields))
    helper.setToInternalCache(cacheKey, records)
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
  if (!_.isEmpty(criteria.abbreviation)) {
    ret.abbreviation = { equals: criteria.abbreviation }
  }
  if (!_.isEmpty(criteria.description)) {
    ret.description = { contains: criteria.description }
  }
  if (!_.isUndefined(criteria.isActive)) {
    ret.isActive = { equals: criteria.isActive }
  }
  if (!_.isUndefined(criteria.isTask)) {
    ret.isTask = { equals: criteria.isTask }
  }
  return ret
}

searchChallengeTypes.schema = {
  criteria: Joi.object().keys({
    page: Joi.page(),
    perPage: Joi.number().integer().min(1).max(100).default(100),
    name: Joi.string(),
    description: Joi.string(),
    isActive: Joi.boolean(),
    isTask: Joi.boolean().default(false),
    abbreviation: Joi.string(),
  }),
};

/**
 * Check challenge type exists by same name
 * @param {String} name challenge type name
 * @throws conflict error if same name exists
 */
async function checkTypeName (name) {
  const existingByName = await prisma.challengeType.findMany({
    where: { name }
  })
  if (existingByName && existingByName.length > 0) { throw new errors.ConflictError(`ChallengeType with name: ${name} already exist`) }
}

/**
 * Check challenge type exists by same abbreviation
 * @param {String} name challenge type abbreviation
 * @throws conflict error if same abbreviation exists
 */
async function checkTypeAbrv (abbreviation) {
  const existingByAbbr = await prisma.challengeType.findMany({
    where: { abbreviation }
  })
  if (existingByAbbr && existingByAbbr.length > 0) {
    throw new errors.ConflictError(
      `ChallengeType with abbreviation: ${abbreviation} already exist`
    )
  }
}

/**
 * Create challenge type.
 * @param {Object} authUser auth user info
 * @param {Object} type the challenge type to created
 * @returns {Object} the created challenge type
 */
async function createChallengeType (authUser, type) {
  await checkTypeName(type.name)
  await checkTypeAbrv(type.abbreviation)
  let ret = await prisma.challengeType.create({
    data: {
      ...type,
      createdBy: authUser.userId,
      updatedBy: authUser.userId
    }
  })
  ret = _.omit(ret, constants.auditFields)
  helper.flushInternalCache()
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTypeCreated, ret)
  return ret
}

createChallengeType.schema = {
  authUser: Joi.any(),
  type: Joi.object()
    .keys({
      name: Joi.string().required(),
      description: Joi.string(),
      isActive: Joi.boolean().required(),
      isTask: Joi.boolean().default(false),
      abbreviation: Joi.string().required(),
    })
    .required(),
};

/**
 * Get challenge type.
 * @param {String} id the challenge type id
 * @returns {Object} the challenge type with given id
 */
async function getChallengeType(id) {
  let ret = await prisma.challengeType.findUnique({
    where: { id }
  })
  if (!ret || _.isUndefined(ret.id)) {
    throw new errors.NotFoundError(`ChallengeType with id: ${id} doesn't exist`)
  }
  ret = _.omit(ret, constants.auditFields)
  return ret
}

getChallengeType.schema = {
  id: Joi.id(),
};

/**
 * Fully update challenge type.
 * @param {Object} authUser auth user info
 * @param {String} id the challenge type id
 * @param {Object} data the challenge type data to be updated
 * @returns {Object} the updated challenge type
 */
async function fullyUpdateChallengeType (authUser, id, data) {
  const type = await getChallengeType(id)
  if (type.name.toLowerCase() !== data.name.toLowerCase()) {
    await checkTypeName(data.name)
  }
  if (type.abbreviation.toLowerCase() !== data.abbreviation.toLowerCase()) {
    await checkTypeAbrv(data.abbreviation)
  }
  if (_.isUndefined(data.description)) {
    data.description = null
  }
  let ret = await prisma.challengeType.update({
    data: {
      ...data,
      updatedBy: authUser.userId
    },
    where: { id }
  })
  ret = _.omit(ret, constants.auditFields)
  helper.flushInternalCache()
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTypeUpdated, ret)
  return ret
}
fullyUpdateChallengeType.schema = {
  authUser: Joi.any(),
  id: Joi.id(),
  data: Joi.object()
    .keys({
      name: Joi.string().required(),
      description: Joi.string(),
      isActive: Joi.boolean().required(),
      isTask: Joi.boolean().default(false),
      abbreviation: Joi.string().required(),
    })
    .required(),
};

/**
 * Partially update challenge type.
 * @param {Object} authUser auth user info
 * @param {String} id the challenge type id
 * @param {Object} data the challenge type data to be updated
 * @returns {Object} the updated challenge type
 */
async function partiallyUpdateChallengeType (authUser, id, data) {
  const type = await getChallengeType(id)
  if (data.name && type.name.toLowerCase() !== data.name.toLowerCase()) {
    await checkTypeName(data.name)
  }
  if (data.abbreviation && type.abbreviation.toLowerCase() !== data.abbreviation.toLowerCase()) {
    await checkTypeAbrv(data.abbreviation)
  }
  data.updatedBy = authUser.userId
  let ret = await prisma.challengeType.update({
    where: { id },
    data: _.extend(type, data)
  })
  ret = _.omit(ret, constants.auditFields)
  helper.flushInternalCache()
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTypeUpdated, _.assignIn({ id }, data))
  return ret
}

partiallyUpdateChallengeType.schema = {
  authUser: Joi.any(),
  id: Joi.id(),
  data: Joi.object()
    .keys({
      name: Joi.string(),
      description: Joi.string(),
      isActive: Joi.boolean(),
      isTask: Joi.boolean().default(false),
      abbreviation: Joi.string(),
    })
    .required(),
};

/**
 * Delete challenge type.
 * @param {String} id the challenge type id
 * @returns {Object} the deleted challenge type
 */
async function deleteChallengeType(id) {
  let ret = await getChallengeType(id);
  await prisma.challengeType.delete({ where: { id } });
  helper.flushInternalCache();
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTypeDeleted, ret)
  return ret
}

deleteChallengeType.schema = {
  id: Joi.id(),
};

module.exports = {
  searchChallengeTypes,
  createChallengeType,
  getChallengeType,
  fullyUpdateChallengeType,
  partiallyUpdateChallengeType,
  deleteChallengeType,
};

logger.buildService(module.exports);
