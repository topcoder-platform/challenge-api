/**
 * This service provides operations of challenge types.
 */

const _ = require('lodash')
const config = require('config')
const Joi = require('joi')
const uuid = require('uuid/v4')
const helper = require('../common/helper')
const logger = require('../common/logger')
const errors = require('../common/errors')
const constants = require('../../app-constants')

const esClient = helper.getESClient()

/**
 * Search challenge types
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function searchChallengeTypes (criteria) {
  const mustQuery = []
  const boolQuery = []

  if (criteria.name) {
    boolQuery.push({ match: { name: `.*${criteria.name}.*` } })
  }
  if (criteria.description) {
    boolQuery.push({ match: { description: `.*${criteria.description}.*` } })
  }
  if (criteria.abbreviation) {
    boolQuery.push({ match: { abbreviation: criteria.abbreviation } })
  }
  if (criteria.legacyId) {
    boolQuery.push({ match: { legacyId: criteria.legacyId } })
  }

  if (boolQuery.length > 0) {
    mustQuery.push({
      bool: {
        filter: boolQuery
      }
    })
  }

  const esQuery = {
    index: config.get('ES.CHALLENGE_TYPE_ES_INDEX'),
    size: criteria.perPage,
    from: (criteria.page - 1) * criteria.perPage, // Es Index starts from 0
    body: {
      query: mustQuery.length > 0 ? {
        bool: {
          must: mustQuery
        }
      } : {
        match_all: {}
      }
    }
  }

  // Search with constructed query
  let docs
  try {
    docs = await esClient.search(esQuery)
  } catch (e) {
    // Catch error when the ES is fresh and has no data
    docs = {
      hits: {
        total: 0,
        hits: []
      }
    }
  }

  // Extract data from hits
  const total = docs.hits.total
  let result = _.map(docs.hits.hits, item => item._source)

  return { total, page: criteria.page, perPage: criteria.perPage, result }
}

searchChallengeTypes.schema = {
  criteria: Joi.object().keys({
    page: Joi.page(),
    perPage: Joi.number().integer().min(1).max(100).default(100),
    name: Joi.string(),
    description: Joi.string(),
    isActive: Joi.boolean(),
    abbreviation: Joi.string(),
    legacyId: Joi.number().integer().positive()
  })
}

/**
 * Create challenge type.
 * @param {Object} type the challenge type to created
 * @returns {Object} the created challenge type
 */
async function createChallengeType (type) {
  const [duplicate] = await searchChallengeTypes(type)
  if (duplicate) {
    errors.ConflictError('ChallengeType already exist')
  }
  type = _.assign({ id: uuid() }, type)
  await esClient.create({
    index: config.get('ES.CHALLENGE_TYPE_ES_INDEX'),
    type: config.get('ES.CHALLENGE_TYPE_ES_TYPE'),
    refresh: config.get('ES.ES_REFRESH'),
    id: type.id,
    body: type
  })
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTypeCreated, type)
  return type
}

createChallengeType.schema = {
  type: Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string(),
    isActive: Joi.boolean().required(),
    abbreviation: Joi.string().required(),
    legacyId: Joi.number().integer().positive()
  }).required()
}

/**
 * Get challenge type.
 * @param {String} id the challenge type id
 * @returns {Object} the challenge type with given id
 */
async function getChallengeType (id) {
  return esClient.getSource({
    index: config.get('ES.CHALLENGE_TYPE_ES_INDEX'),
    type: config.get('ES.CHALLENGE_TYPE_ES_TYPE'),
    id
  })
}

getChallengeType.schema = {
  id: Joi.id()
}

/**
 * Fully update challenge type.
 * @param {String} id the challenge type id
 * @param {Object} data the challenge type data to be updated
 * @returns {Object} the updated challenge type
 */
async function fullyUpdateChallengeType (id, data) {
  const type = await getChallengeType(id)
  let duplicateRecords
  if (type.name.toLowerCase() !== data.name.toLowerCase()) {
    duplicateRecords = await searchChallengeTypes({ name: data.name })
    if (duplicateRecords.length > 0) {
      errors.ConflictError(`ChallengeType with name ${data.name} already exist`)
    }
  }
  if (type.abbreviation.toLowerCase() !== data.abbreviation.toLowerCase()) {
    duplicateRecords = await searchChallengeTypes({ abbreviation: data.abbreviation })
    if (duplicateRecords.length > 0) {
      errors.ConflictError(`ChallengeType with abbreviation ${data.abbreviation} already exist`)
    }
  }
  if (data.legacyId && type.legacyId !== data.legacyId) {
    duplicateRecords = await searchChallengeTypes({ legacyId: data.legacyId })
    if (duplicateRecords.length > 0) {
      errors.ConflictError(`ChallengeType with legacyId ${data.legacyId} already exist`)
    }
  }
  if (_.isUndefined(data.description)) {
    type.description = undefined
  }
  if (_.isUndefined(data.legacyId)) {
    type.legacyId = undefined
  }
  _.extend(type, data)

  await esClient.update({
    index: config.get('ES.CHALLENGE_TYPE_ES_INDEX'),
    type: config.get('ES.CHALLENGE_TYPE_ES_TYPE'),
    refresh: config.get('ES.ES_REFRESH'),
    id,
    body: {
      doc: type
    }
  })
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTypeUpdated, type)
  return type
}

fullyUpdateChallengeType.schema = {
  id: Joi.id(),
  data: Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string(),
    isActive: Joi.boolean().required(),
    abbreviation: Joi.string().required(),
    legacyId: Joi.number().integer().positive()
  }).required()
}

/**
 * Partially update challenge type.
 * @param {String} id the challenge type id
 * @param {Object} data the challenge type data to be updated
 * @returns {Object} the updated challenge type
 */
async function partiallyUpdateChallengeType (id, data) {
  const type = await getChallengeType(id)
  let duplicateRecords
  if (data.name && type.name.toLowerCase() !== data.name.toLowerCase()) {
    duplicateRecords = await searchChallengeTypes({ name: data.name })
    if (duplicateRecords.length > 0) {
      errors.ConflictError(`ChallengeType with name ${data.name} already exist`)
    }
  }
  if (data.abbreviation && type.abbreviation.toLowerCase() !== data.abbreviation.toLowerCase()) {
    duplicateRecords = await searchChallengeTypes({ abbreviation: data.abbreviation })
    if (duplicateRecords.length > 0) {
      errors.ConflictError(`ChallengeType with abbreviation ${data.abbreviation} already exist`)
    }
  }
  if (data.legacyId && type.legacyId !== data.legacyId) {
    duplicateRecords = await searchChallengeTypes({ legacyId: data.legacyId })
    if (duplicateRecords.length > 0) {
      errors.ConflictError(`ChallengeType with legacyId ${data.legacyId} already exist`)
    }
  }

  _.extend(type, data)

  await esClient.update({
    index: config.get('ES.CHALLENGE_TYPE_ES_INDEX'),
    type: config.get('ES.CHALLENGE_TYPE_ES_TYPE'),
    refresh: config.get('ES.ES_REFRESH'),
    id,
    body: {
      doc: type
    }
  })
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTypeUpdated, type)
  return type
}

partiallyUpdateChallengeType.schema = {
  id: Joi.id(),
  data: Joi.object().keys({
    name: Joi.string(),
    description: Joi.string(),
    isActive: Joi.boolean(),
    abbreviation: Joi.string(),
    legacyId: Joi.number().integer().positive()
  }).required()
}

module.exports = {
  searchChallengeTypes,
  createChallengeType,
  getChallengeType,
  fullyUpdateChallengeType,
  partiallyUpdateChallengeType
}

logger.buildService(module.exports)
