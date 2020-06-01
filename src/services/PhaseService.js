/**
 * This service provides operations of phases.
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
 * Search phases
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function searchPhases (criteria) {
  const mustQuery = []
  const boolQuery = []

  if (criteria.name) {
    boolQuery.push({ match: { name: `.*${criteria.name}.*` } })
  }

  if (boolQuery.length > 0) {
    mustQuery.push({
      bool: {
        filter: boolQuery
      }
    })
  }

  const esQuery = {
    index: config.get('ES.PHASE_ES_INDEX'),
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

searchPhases.schema = {
  criteria: Joi.object().keys({
    page: Joi.page(),
    perPage: Joi.perPage().default(100),
    name: Joi.string()
  })
}

/**
 * Create phase.
 * @param {Object} phase the phase to created
 * @returns {Object} the created phase
 */
async function createPhase (phase) {
  const [duplicate] = searchPhases({ name: phase.name })
  if (duplicate) {
    errors.ConflictError(`Phase with name: ${phase.name} already exist`)
  }
  phase = _.assign({ id: uuid() }, phase)
  await esClient.create({
    index: config.get('ES.PHASE_ES_INDEX'),
    type: config.get('ES.PHASE_ES_TYPE'),
    refresh: config.get('ES.ES_REFRESH'),
    id: phase.id,
    body: phase
  })

  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengePhaseCreated, phase)
  return phase
}

createPhase.schema = {
  phase: Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string(),
    isOpen: Joi.boolean().required(),
    duration: Joi.number().positive().required()
  }).required()
}

/**
 * Get phase
 * @param {String} phaseId the phase id
 * @returns {Object} the phase with given id
 */
async function getPhase (phaseId) {
  return esClient.getSource({
    index: config.get('ES.PHASE_ES_INDEX'),
    type: config.get('ES.PHASE_ES_TYPE'),
    id: phaseId
  })
}

getPhase.schema = {
  phaseId: Joi.id()
}

/**
 * Update phase.
 * @param {String} phaseId the phase id
 * @param {Object} data the phase data to be updated
 * @param {Boolean} isFull the flag indicate it is a fully update operation.
 * @returns {Object} the updated phase
 */
async function update (phaseId, data, isFull) {
  const phase = await getPhase(phaseId)

  if (data.name && data.name.toLowerCase() !== phase.name.toLowerCase()) {
    const [duplicate] = searchPhases({ name: phase.name })
    if (duplicate) {
      errors.ConflictError(`Phase with name: ${phase.name} already exist`)
    }
  }

  if (isFull) {
    // description is optional field, can be undefined
    phase.description = data.description
  }

  _.extend(phase, data)

  await esClient.update({
    index: config.get('ES.PHASE_ES_INDEX'),
    type: config.get('ES.PHASE_ES_TYPE'),
    refresh: config.get('ES.ES_REFRESH'),
    id: phaseId,
    body: {
      doc: phase
    }
  })
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengePhaseUpdated,
    isFull ? phase : _.assignIn({ id: phaseId }, data))
  return phase
}

/**
 * Fully update phase.
 * @param {String} phaseId the phase id
 * @param {Object} data the phase data to be updated
 * @returns {Object} the updated phase
 */
async function fullyUpdatePhase (phaseId, data) {
  return update(phaseId, data, true)
}

fullyUpdatePhase.schema = {
  phaseId: Joi.id(),
  data: Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string(),
    isOpen: Joi.boolean().required(),
    duration: Joi.number().positive().required()
  }).required()
}

/**
 * Partially update phase.
 * @param {String} phaseId the phase id
 * @param {Object} data the phase data to be updated
 * @returns {Object} the updated phase
 */
async function partiallyUpdatePhase (phaseId, data) {
  return update(phaseId, data)
}

partiallyUpdatePhase.schema = {
  phaseId: Joi.id(),
  data: Joi.object().keys({
    name: Joi.string(),
    description: Joi.string(),
    isOpen: Joi.boolean(),
    duration: Joi.number().positive()
  }).required()
}

/**
 * Delete phase.
 * @param {String} phaseId the phase id
 * @returns {Object} the deleted phase
 */
async function deletePhase (phaseId) {
  const ret = await getPhase(phaseId)
  await esClient.delete({
    index: config.get('ES.PHASE_ES_INDEX'),
    type: config.get('ES.PHASE_ES_TYPE'),
    id: phaseId
  })
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengePhaseDeleted, ret)
  return ret
}

deletePhase.schema = {
  phaseId: Joi.id()
}

module.exports = {
  searchPhases,
  createPhase,
  getPhase,
  fullyUpdatePhase,
  partiallyUpdatePhase,
  deletePhase
}

logger.buildService(module.exports)
