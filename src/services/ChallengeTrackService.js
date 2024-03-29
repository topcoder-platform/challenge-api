/**
 * This service provides operations of challenge types.
 */

const { GRPC_CHALLENGE_SERVER_HOST, GRPC_CHALLENGE_SERVER_PORT } = process.env;

const {
  DomainHelper: { getScanCriteria, getLookupCriteria },
} = require("@topcoder-framework/lib-common");

const { ChallengeTrackDomain } = require("@topcoder-framework/domain-challenge");

const _ = require("lodash");
const Joi = require("joi");
const helper = require("../common/helper");
const logger = require("../common/logger");
const errors = require("../common/errors");
const constants = require("../../app-constants");

const challengeTrackDomain = new ChallengeTrackDomain(
  GRPC_CHALLENGE_SERVER_HOST,
  GRPC_CHALLENGE_SERVER_PORT
);

/**
 * Search challenge types
 * @param {Object} criteria the search criteria
 * @returns {Promise<Object>} the search result
 */
async function searchChallengeTracks(criteria) {
  const scanCriteria = getScanCriteria(_.omit(criteria, ["page", "perPage"]));
  const page = criteria.page || 1;
  const perPage = criteria.perPage || 50;

  const cacheKey = `ChallengeTrack${page}_${perPage}_${JSON.stringify(criteria)}`;

  // TODO - move this to ES
  let records = helper.getFromInternalCache(cacheKey);
  if (records == null || records.length == 0) {
    const { items } = await challengeTrackDomain.scan({ criteria: scanCriteria });
    records = items;
    helper.setToInternalCache(cacheKey, records);
  }

  const total = records.length;
  const result = records.slice((page - 1) * perPage, page * perPage);

  return { total, page, perPage, result };
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
 * Create challenge type.
 * @param {Object} type the challenge type to created
 * @returns {Object} the created challenge type
 */
async function createChallengeTrack(type) {
  const { items: existingByName } = await challengeTrackDomain.scan({
    criteria: getScanCriteria({ name: type.name }),
  });
  if (existingByName.length > 0)
    throw new errors.ConflictError(`Challenge Type with name ${type.name} already exists`);
  const { items: existingByAbbr } = await challengeTrackDomain.scan({
    criteria: getScanCriteria({ abbreviation: type.abbreviation }),
  });
  if (existingByAbbr.length > 0)
    throw new errors.ConflictError(
      `Challenge Type with abbreviation ${type.abbreviation} already exists`
    );

  const ret = await challengeTrackDomain.create(type);
  helper.flushInternalCache();
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTrackCreated, ret);
  return ret;
}

createChallengeTrack.schema = {
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
async function getChallengeTrack(id) {
  return challengeTrackDomain.lookup(getLookupCriteria("id", id));
}

getChallengeTrack.schema = {
  id: Joi.id(),
};

/**
 * Fully update challenge type.
 * @param {String} id the challenge type id
 * @param {Object} data the challenge type data to be updated
 * @returns {Object} the updated challenge type
 */
async function fullyUpdateChallengeTrack(id, data) {
  const type = await getChallengeTrack(id);
  if (type.name.toLowerCase() !== data.name.toLowerCase()) {
    const { items: existingByName } = await challengeTrackDomain.scan({
      criteria: getScanCriteria({ name: data.name }),
    });
    if (existingByName.length > 0)
      throw new errors.ConflictError(`Challenge Track with name ${data.name} already exists`);
  }
  if (type.abbreviation.toLowerCase() !== data.abbreviation.toLowerCase()) {
    const { items: existingByAbbr } = await challengeTrackDomain.scan({
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
  if (_.isUndefined(data.legacyId)) {
    type.legacyId = undefined;
  }
  if (_.isUndefined(data.track)) {
    type.track = undefined;
  }
  const { items } = await challengeTrackDomain.update({
    filterCriteria: getScanCriteria({ id }),
    updateInput: _.extend(type, data),
  });
  helper.flushInternalCache();
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTrackUpdated, items[0]);
  return items[0];
}

fullyUpdateChallengeTrack.schema = {
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
 * @param {String} id the challenge type id
 * @param {Object} data the challenge type data to be updated
 * @returns {Object} the updated challenge type
 */
async function partiallyUpdateChallengeTrack(id, data) {
  const type = await getChallengeTrack(id);
  if (data.name && type.name.toLowerCase() !== data.name.toLowerCase()) {
    const { items: existingByName } = await challengeTrackDomain.scan({
      criteria: getScanCriteria({ name: data.name }),
    });
    if (existingByName.length > 0)
      throw new errors.ConflictError(`Challenge Track with name ${data.name} already exists`);
  }
  if (data.abbreviation && type.abbreviation.toLowerCase() !== data.abbreviation.toLowerCase()) {
    const { items: existingByAbbr } = await challengeTrackDomain.scan({
      criteria: getScanCriteria({ abbreviation: data.abbreviation }),
    });
    if (existingByAbbr.length > 0)
      throw new errors.ConflictError(
        `Challenge Type with abbreviation ${data.abbreviation} already exists`
      );
  }

  const { items } = await challengeTrackDomain.update({
    filterCriteria: getScanCriteria({ id }),
    updateInput: _.extend(type, data),
  });
  helper.flushInternalCache();
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTrackUpdated, _.assignIn({ id }, data));
  return items[0];
}

partiallyUpdateChallengeTrack.schema = {
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
async function deleteChallengeTrack(id) {
  const { items } = await challengeTrackDomain.delete(getLookupCriteria("id", id));
  helper.flushInternalCache();

  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTypeDeleted, items[0]);
  return items[0];
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
