/**
 * This service provides operations of challenge settings.
 */

const _ = require('lodash')
const Joi = require('joi')
const uuid = require('uuid/v4')
const helper = require('../common/helper')
const logger = require('../common/logger')
const constants = require('../../app-constants')

/**
 * Search challenge settings
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function searchChallengeMetadata (criteria) {
  const list = await helper.scan('ChallengeMetadata')
  const records = _.filter(list, e => helper.partialMatch(criteria.name, e.name))
  const total = records.length
  const result = records.slice((criteria.page - 1) * criteria.perPage, criteria.page * criteria.perPage)

  return { total, page: criteria.page, perPage: criteria.perPage, result }
}

searchChallengeMetadata.schema = {
  criteria: Joi.object().keys({
    page: Joi.page(),
    perPage: Joi.perPage(),
    name: Joi.string()
  })
}

/**
 * Create challenge setting.
 * @param {Object} setting the challenge setting to created
 * @returns {Object} the created challenge setting
 */
async function createChallengeMetadata (setting) {
  await helper.validateDuplicate('ChallengeMetadata', 'name', setting.name)
  const ret = await helper.create('ChallengeMetadata', _.assign({ id: uuid() }, setting))

  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeMetadataCreated, ret)
  return ret
}

createChallengeMetadata.schema = {
  setting: Joi.object().keys({
    name: Joi.string().required()
  }).required()
}

/**
 * Get challenge setting.
 * @param {String} id the challenge setting id
 * @returns {Object} the challenge setting with given id
 */
async function getChallengeMetadata (id) {
  const ret = await helper.getById('ChallengeMetadata', id)
  return ret
}

getChallengeMetadata.schema = {
  id: Joi.id()
}

/**
 * Update challenge setting.
 * @param {String} id the challenge setting id
 * @param {Object} data the challenge setting data to be updated
 * @returns {Object} the updated challenge setting
 */
async function updateChallengeMetadata (id, data) {
  const setting = await helper.getById('ChallengeMetadata', id)
  if (setting.name.toLowerCase() !== data.name.toLowerCase()) {
    await helper.validateDuplicate('ChallengeMetadata', 'name', data.name)
  }
  const ret = await helper.update(setting, data)
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeMetadataUpdated, ret)
  return ret
}

updateChallengeMetadata.schema = {
  id: Joi.id(),
  data: Joi.object().keys({
    name: Joi.string().required()
  }).required()
}

module.exports = {
  searchChallengeMetadata,
  createChallengeMetadata,
  getChallengeMetadata,
  updateChallengeMetadata
}

logger.buildService(module.exports)
