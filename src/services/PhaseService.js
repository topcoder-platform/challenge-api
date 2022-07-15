/**
 * This service provides operations of phases.
 */

const _ = require('lodash')
const Joi = require('joi')
const uuid = require('uuid/v4')
const helper = require('../common/helper')
// const logger = require('../common/logger')
const constants = require('../../app-constants')

/**
 * Search phases
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function searchPhases (criteria) {
  const page = criteria.page || 1
  const perPage = criteria.perPage || 50
  const list = await helper.scanAll('Phase')
  const records = _.filter(list, e => helper.partialMatch(criteria.name, e.name))
  const total = records.length
  const result = records.slice((page - 1) * perPage, page * perPage)

  return { total, page, perPage, result }
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
  await helper.validateDuplicate('Phase', 'name', phase.name)
  const ret = await helper.create('Phase', _.assign({ id: uuid() }, phase))
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengePhaseCreated, ret)
  return ret
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

  if (isFull) {
    // description is optional field, can be undefined
    phase.description = data.description
  }

  const ret = await helper.update(phase, data)
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengePhaseUpdated,
    isFull ? ret : _.assignIn({ id: phaseId }, data))
  return ret
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
  const ret = await helper.getById('Phase', phaseId)
  await ret.delete()
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

// logger.buildService(module.exports)
