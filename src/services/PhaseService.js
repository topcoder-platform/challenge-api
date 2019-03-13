/**
 * This service provides operations of phases.
 */

const _ = require('lodash')
const Joi = require('joi')
const uuid = require('uuid/v4')
const helper = require('../common/helper')
const logger = require('../common/logger')
const errors = require('../common/errors')

/**
 * Search phases
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function searchPhases (criteria) {
  const list = await helper.scan('Phase')
  const records = _.filter(list, e => helper.partialMatch(criteria.name, e.name))
  const total = records.length
  const result = records.slice((criteria.page - 1) * criteria.perPage, criteria.page * criteria.perPage)

  return { total, page: criteria.page, perPage: criteria.perPage, result }
}

searchPhases.schema = {
  criteria: Joi.object().keys({
    page: Joi.page(),
    perPage: Joi.perPage(),
    name: Joi.string()
  })
}

/**
 * Create phase.
 * @param {Object} phase the phase to created
 * @returns {Object} the created phase
 */
async function createPhase (phase) {
  await helper.validateDuplicate('Phase', 'name', phase.name)
  if (phase.predecessor) {
    // validate preceding phase
    await helper.getById('Phase', phase.predecessor)
  }
  return helper.create('Phase', _.assign({ id: uuid() }, phase))
}

createPhase.schema = {
  phase: Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string(),
    predecessor: Joi.optionalId(),
    isActive: Joi.boolean().required(),
    duration: Joi.number().positive().required()
  }).required()
}

/**
 * Get phase
 * @param {String} phaseId the phase id
 * @returns {Object} the phase with given id
 */
async function getPhase (phaseId) {
  return helper.getById('Phase', phaseId)
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
  const phase = await helper.getById('Phase', phaseId)

  if (data.name && data.name.toLowerCase() !== phase.name.toLowerCase()) {
    await helper.validateDuplicate('Phase', 'name', data.name)
  }

  if (data.predecessor && data.predecessor !== phase.predecessor) {
    // validate preceding phase
    await helper.getById('Phase', data.predecessor)
  }

  if (isFull) {
    // description and predecessor are optional fields, can be undefined
    phase.description = data.description
    phase.predecessor = data.predecessor
  }

  return helper.update(phase, data)
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
    predecessor: Joi.optionalId(),
    isActive: Joi.boolean().required(),
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
    predecessor: Joi.optionalId(),
    isActive: Joi.boolean(),
    duration: Joi.number().positive()
  }).required()
}

/**
 * Delete phase.
 * @param {String} phaseId the phase id
 * @returns {Object} the deleted phase
 */
async function deletePhase (phaseId) {
  const ret = await helper.getById('Phase', phaseId)
  const list = await helper.scan('Phase', { predecessor: phaseId })
  if (list.length > 0) {
    throw new errors.BadRequestError(`Can't delete phase ${phaseId} because it is preceding phase of other phases.`)
  }
  await ret.delete()
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
