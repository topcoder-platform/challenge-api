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
async function searchChallengeSettings (criteria) {
  const list = await helper.scan('ChallengeSetting')
  const records = _.filter(list, e => helper.partialMatch(criteria.name, e.name))
  const total = records.length
  const result = records.slice((criteria.page - 1) * criteria.perPage, criteria.page * criteria.perPage)

  return { total, page: criteria.page, perPage: criteria.perPage, result }
}

searchChallengeSettings.schema = {
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
async function createChallengeSetting (setting) {
  await helper.validateDuplicate('ChallengeSetting', 'name', setting.name)
  const ret = await helper.create('ChallengeSetting', _.assign({ id: uuid() }, setting))

  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeSettingCreated, ret)
  return ret
}

createChallengeSetting.schema = {
  setting: Joi.object().keys({
    name: Joi.string().required()
  }).required()
}

/**
 * Get challenge setting.
 * @param {String} id the challenge setting id
 * @returns {Object} the challenge setting with given id
 */
async function getChallengeSetting (id) {
  const ret = await helper.getById('ChallengeSetting', id)
  return ret
}

getChallengeSetting.schema = {
  id: Joi.id()
}

/**
 * Update challenge setting.
 * @param {String} id the challenge setting id
 * @param {Object} data the challenge setting data to be updated
 * @returns {Object} the updated challenge setting
 */
async function updateChallengeSetting (id, data) {
  const setting = await helper.getById('ChallengeSetting', id)
  if (setting.name.toLowerCase() !== data.name.toLowerCase()) {
    await helper.validateDuplicate('ChallengeSetting', 'name', data.name)
  }
  const ret = await helper.update(setting, data)
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeSettingUpdated, ret)
  return ret
}

updateChallengeSetting.schema = {
  id: Joi.id(),
  data: Joi.object().keys({
    name: Joi.string().required()
  }).required()
}

module.exports = {
  searchChallengeSettings,
  createChallengeSetting,
  getChallengeSetting,
  updateChallengeSetting
}

logger.buildService(module.exports)
