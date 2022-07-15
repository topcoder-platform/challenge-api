/**
 * This service provides operations of challenge types.
 */

const _ = require('lodash')
const Joi = require('joi')
const uuid = require('uuid/v4')
const helper = require('../common/helper')
// const logger = require('../common/logger')
const constants = require('../../app-constants')

/**
 * Search challenge types
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function searchChallengeTracks (criteria) {
  // TODO - move this to ES
  let records = helper.getFromInternalCache('ChallengeTrack')
  if (records == null) {
    records = await helper.scanAll('ChallengeTrack')
    helper.setToInternalCache('ChallengeTrack', records)
  }

  const page = criteria.page || 1
  const perPage = criteria.perPage || 50

  if (criteria.name) records = _.filter(records, e => helper.partialMatch(criteria.name, e.name))
  if (criteria.description) records = _.filter(records, e => helper.partialMatch(criteria.description, e.description))
  if (criteria.track) records = _.filter(records, e => _.toLower(criteria.track) === _.toLower(e.track))
  if (criteria.abbreviation) records = _.filter(records, e => helper.partialMatch(criteria.abbreviation, e.abbreviation))
  if (!_.isUndefined(criteria.isActive)) records = _.filter(records, e => (e.isActive === (criteria.isActive === 'true')))
  // if (criteria.legacyId) records = _.filter(records, e => (e.legacyId === criteria.legacyId))

  const total = records.length
  const result = records.slice((page - 1) * perPage, page * perPage)

  return { total, page, perPage, result }
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
    track: Joi.string().valid(_.values(constants.challengeTracks))
  })
}

/**
 * Create challenge type.
 * @param {Object} type the challenge type to created
 * @returns {Object} the created challenge type
 */
async function createChallengeTrack (type) {
  await helper.validateDuplicate('ChallengeTrack', 'name', type.name)
  await helper.validateDuplicate('ChallengeTrack', 'abbreviation', type.abbreviation)
  if (type.legacyId) {
    await helper.validateDuplicate('ChallengeTrack', 'legacyId', type.legacyId)
  }
  const ret = await helper.create('ChallengeTrack', _.assign({ id: uuid() }, type))
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTrackCreated, ret)
  return ret
}

createChallengeTrack.schema = {
  type: Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string(),
    isActive: Joi.boolean().required(),
    abbreviation: Joi.string().required(),
    legacyId: Joi.number().integer().positive(),
    track: Joi.string().valid(_.values(constants.challengeTracks))
  }).required()
}

/**
 * Get challenge type.
 * @param {String} id the challenge type id
 * @returns {Object} the challenge type with given id
 */
async function getChallengeTrack (id) {
  const ret = await helper.getById('ChallengeTrack', id)
  return ret
}

getChallengeTrack.schema = {
  id: Joi.id()
}

/**
 * Fully update challenge type.
 * @param {String} id the challenge type id
 * @param {Object} data the challenge type data to be updated
 * @returns {Object} the updated challenge type
 */
async function fullyUpdateChallengeTrack (id, data) {
  const type = await helper.getById('ChallengeTrack', id)
  if (type.name.toLowerCase() !== data.name.toLowerCase()) {
    await helper.validateDuplicate('ChallengeTrack', 'name', data.name)
  }
  if (type.abbreviation.toLowerCase() !== data.abbreviation.toLowerCase()) {
    await helper.validateDuplicate('ChallengeTrack', 'abbreviation', data.abbreviation)
  }
  if (data.legacyId && type.legacyId !== data.legacyId) {
    await helper.validateDuplicate('ChallengeTrack', 'legacyId', data.legacyId)
  }
  if (_.isUndefined(data.description)) {
    type.description = undefined
  }
  if (_.isUndefined(data.legacyId)) {
    type.legacyId = undefined
  }
  if (_.isUndefined(data.track)) {
    type.track = undefined
  }
  const ret = await helper.update(type, data)
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTrackUpdated, ret)
  return ret
}

fullyUpdateChallengeTrack.schema = {
  id: Joi.id(),
  data: Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string(),
    isActive: Joi.boolean().required(),
    abbreviation: Joi.string().required(),
    legacyId: Joi.number().integer().positive(),
    track: Joi.string().valid(_.values(constants.challengeTracks))
  }).required()
}

/**
 * Partially update challenge type.
 * @param {String} id the challenge type id
 * @param {Object} data the challenge type data to be updated
 * @returns {Object} the updated challenge type
 */
async function partiallyUpdateChallengeTrack (id, data) {
  const type = await helper.getById('ChallengeTrack', id)
  if (data.name && type.name.toLowerCase() !== data.name.toLowerCase()) {
    await helper.validateDuplicate('ChallengeTrack', 'name', data.name)
  }
  if (data.abbreviation && type.abbreviation.toLowerCase() !== data.abbreviation.toLowerCase()) {
    await helper.validateDuplicate('ChallengeTrack', 'abbreviation', data.abbreviation)
  }
  if (data.legacyId && type.legacyId !== data.legacyId) {
    await helper.validateDuplicate('ChallengeTrack', 'legacyId', data.legacyId)
  }
  const ret = await helper.update(type, data)
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeTrackUpdated, _.assignIn({ id }, data))
  return ret
}

partiallyUpdateChallengeTrack.schema = {
  id: Joi.id(),
  data: Joi.object().keys({
    name: Joi.string(),
    description: Joi.string(),
    isActive: Joi.boolean(),
    abbreviation: Joi.string(),
    legacyId: Joi.number().integer().positive(),
    track: Joi.string().valid(_.values(constants.challengeTracks))
  }).required()
}

module.exports = {
  searchChallengeTracks,
  createChallengeTrack,
  getChallengeTrack,
  fullyUpdateChallengeTrack,
  partiallyUpdateChallengeTrack
}

// logger.buildService(module.exports)
