/**
 * This service provides operations of challenge tracks.
 */

const { GRPC_CHALLENGE_SERVER_HOST, GRPC_CHALLENGE_SERVER_PORT } = process.env;

const {
  DomainHelper: { getLookupCriteria, getScanCriteria },
} = require("@topcoder-framework/lib-common");

const { ChallengeTypeDomain } = require("@topcoder-framework/domain-challenge");

const _ = require("lodash");
const Joi = require("joi");
const helper = require("../common/helper");
const constants = require("../../app-constants");
const errors = require("../common/errors");

const challengeTypeDomain = new ChallengeTypeDomain(
  GRPC_CHALLENGE_SERVER_HOST,
  GRPC_CHALLENGE_SERVER_PORT
);

/**
 * Search challenge types
 * @param {Object} criteria the search criteria
 * @returns {Promise<Object>} the search result
 */
async function searchChallengeTypes(criteria) {
  const scanCriteria = getScanCriteria(_.omit(criteria, ["page", "perPage"]));

  const page = criteria.page || 1;
  const perPage = criteria.perPage || 50;

  const cacheKey = `ChallengeType_${page}_${perPage}_${JSON.stringify(criteria)}`;

  // TODO - move this to ES
  let records = helper.getFromInternalCache(cacheKey);
  if (records == null || records.length === 0) {
    const { items } = await challengeTypeDomain.scan({ criteria: scanCriteria });
    records = items;
    helper.setToInternalCache(cacheKey, records);
  }

  const total = records.length;
  const result = records.slice((page - 1) * perPage, page * perPage);

  return { total, page, perPage, result };
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
 * Create challenge type.
 * @param {Object} type the challenge type to created
 * @returns {Object} the created challenge type
 */
async function createChallengeType(type) {
  const { items: existingByName } = await challengeTypeDomain.scan({
    criteria: getScanCriteria({ name: type.name }),
  });
  if (existingByName.length > 0)
    throw new errors.ConflictError(`Challenge Type with name ${type.name} already exists`);
  const { items: existingByAbbr } = await challengeTypeDomain.scan({
    criteria: getScanCriteria({ abbreviation: type.abbreviation }),
  });
  if (existingByAbbr.length > 0)
    throw new errors.ConflictError(
      `Challenge Type with abbreviation ${type.abbreviation} already exists`
    );
  const ret = await challengeTypeDomain.create(type);
  helper.flushInternalCache();
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTypeCreated, ret);
  return ret;
}

createChallengeType.schema = {
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
  return await challengeTypeDomain.lookup(getLookupCriteria("id", id));
}

getChallengeType.schema = {
  id: Joi.id(),
};

/**
 * Fully update challenge type.
 * @param {String} id the challenge type id
 * @param {Object} data the challenge type data to be updated
 * @returns {Object} the updated challenge type
 */
async function fullyUpdateChallengeType(id, data) {
  const type = await getChallengeType(id);
  if (type.name.toLowerCase() !== data.name.toLowerCase()) {
    const { items: existingByName } = await challengeTypeDomain.scan({
      criteria: getScanCriteria({ name: data.name }),
    });
    if (existingByName.length > 0)
      throw new errors.ConflictError(`Challenge Type with name ${data.name} already exists`);
  }
  if (type.abbreviation.toLowerCase() !== data.abbreviation.toLowerCase()) {
    const { items: existingByAbbr } = await challengeTypeDomain.scan({
      criteria: getScanCriteria({ abbreviation: data.abbreviation }),
    });
    if (existingByAbbr.length > 0)
      throw new errors.ConflictError(
        `Challenge Type with abbreviation ${data.abbreviation} already exists`
      );
  }
  if (_.isUndefined(data.description)) {
    type.description = undefined;
  }
  const { items } = await challengeTypeDomain.update({
    filterCriteria: getScanCriteria({ id }),
    updateInput: data,
  });
  helper.flushInternalCache();
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTypeUpdated, items[0]);
  return items[0];
}
fullyUpdateChallengeType.schema = {
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
 * @param {String} id the challenge type id
 * @param {Object} data the challenge type data to be updated
 * @returns {Object} the updated challenge type
 */
async function partiallyUpdateChallengeType(id, data) {
  const type = await getChallengeType(id);
  if (data.name && type.name.toLowerCase() !== data.name.toLowerCase()) {
    const { items: existingByName } = await challengeTypeDomain.scan({
      criteria: getScanCriteria({ name: data.name }),
    });
    if (existingByName.length > 0)
      throw new errors.ConflictError(`Challenge Type with name ${data.name} already exists`);
  }
  if (data.abbreviation && type.abbreviation.toLowerCase() !== data.abbreviation.toLowerCase()) {
    const { items: existingByAbbr } = await challengeTypeDomain.scan({
      criteria: getScanCriteria({ abbreviation: data.abbreviation }),
    });
    if (existingByAbbr.length > 0)
      throw new errors.ConflictError(
        `Challenge Type with abbreviation ${data.abbreviation} already exists`
      );
  }
  const { items } = await challengeTypeDomain.update({
    filterCriteria: getScanCriteria({ id }),
    updateInput: _.extend(type, data),
  });
  helper.flushInternalCache();
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTypeUpdated, _.assignIn({ id }, data));
  return items[0];
}

partiallyUpdateChallengeType.schema = {
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
  const { items } = await challengeTypeDomain.delete(getLookupCriteria("id", id));
  helper.flushInternalCache();
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTypeDeleted, items[0]);
  return items[0];
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

// logger.buildService(module.exports, {
//   tracing: {
//     enabled: true
//   }
// })
