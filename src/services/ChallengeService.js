/**
 * This service provides operations of challenge.
 */

const _ = require('lodash')
const Joi = require('joi')
const uuid = require('uuid/v4')
const dynamoose = require('dynamoose')
const helper = require('../common/helper')
const logger = require('../common/logger')
const errors = require('../common/errors')
const models = require('../models')

/**
 * Search challenges
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function searchChallenges (criteria) {
  const list = await helper.scan('Challenge')
  const records = _.filter(list, e => helper.partialMatch(criteria.name, e.name) &&
    helper.partialMatch(criteria.description, e.description) &&
    (_.isUndefined(criteria.createdDateStart) || criteria.createdDateStart.getTime() <= e.created.getTime()) &&
    (_.isUndefined(criteria.createdDateEnd) || criteria.createdDateEnd.getTime() >= e.created.getTime()) &&
    (_.isUndefined(criteria.updatedDateStart) || (!_.isUndefined(e.updated) && criteria.updatedDateStart.getTime() <= e.updated.getTime())) &&
    (_.isUndefined(criteria.updatedDateEnd) || (!_.isUndefined(e.updated) && criteria.updatedDateEnd.getTime() >= e.updated.getTime())) &&
    (_.isUndefined(criteria.createdBy) || criteria.createdBy.toLowerCase() === e.createdBy.toLowerCase())
  )
  const total = records.length
  const result = records.slice((criteria.page - 1) * criteria.perPage, criteria.page * criteria.perPage)

  const typeList = await helper.scan('ChallengeType')
  const typeMap = new Map()
  _.each(typeList, e => {
    typeMap.set(e.id, e.name)
  })
  _.each(result, element => {
    element.type = typeMap.get(element.typeId)
    delete element.typeId
  })

  return { total, page: criteria.page, perPage: criteria.perPage, result: await populateSettings(result) }
}

searchChallenges.schema = {
  criteria: Joi.object().keys({
    page: Joi.page(),
    perPage: Joi.perPage(),
    name: Joi.string(),
    description: Joi.string(),
    createdDateStart: Joi.date(),
    createdDateEnd: Joi.date(),
    updatedDateStart: Joi.date(),
    updatedDateEnd: Joi.date(),
    createdBy: Joi.string()
  })
}

/**
 * Validate the challenge data.
 * @param {Object} challenge the challenge data
 */
async function validateChallengeData (challenge) {
  if (challenge.typeId) {
    try {
      await helper.getById('ChallengeType', challenge.typeId)
    } catch (e) {
      if (e.name === 'NotFoundError') {
        throw new errors.BadRequestError(`No challenge type found with id: ${challenge.typeId}.`)
      } else {
        throw e
      }
    }
  }
  if (challenge.challengeSettings) {
    const list = await helper.scan('ChallengeSetting')
    const map = new Map()
    _.each(list, e => {
      map.set(e.id, e.name)
    })
    const invalidSettings = _.filter(challenge.challengeSettings, s => !map.has(s.type))
    if (invalidSettings.length > 0) {
      throw new errors.BadRequestError(`The following settings are invalid: ${invalidSettings}`)
    }
  }
}

/**
 * Create challenge.
 * @param {Object} currentUser the user who perform operation
 * @param {Object} challenge the challenge to created
 * @returns {Object} the created challenge
 */
async function createChallenge (currentUser, challenge) {
  await validateChallengeData(challenge)

  const ret = await helper.create('Challenge', _.assign({
    id: uuid(), created: new Date(), createdBy: currentUser.handle }, challenge))
  return ret
}

createChallenge.schema = {
  currentUser: Joi.any(),
  challenge: Joi.object().keys({
    typeId: Joi.string().required(),
    track: Joi.string().required(),
    name: Joi.string().required(),
    description: Joi.string().required(),
    challengeSettings: Joi.array().items(Joi.object().keys({
      type: Joi.string().required(),
      value: Joi.string().required()
    })).unique((a, b) => a.type === b.type)
  }).required()
}

/**
 * Populate challenge settings data.
 * @param {Object|Array} the challenge entities
 * @param {Object|Array} the modified challenge entities
 */
async function populateSettings (data) {
  const list = await helper.scan('ChallengeSetting')
  const map = new Map()
  _.each(list, e => {
    map.set(e.id, e.name)
  })
  if (_.isArray(data)) {
    _.each(data, element => {
      if (element.challengeSettings) {
        _.each(element.challengeSettings, s => {
          s.type = map.get(s.type)
        })
      }
    })
  } else if (data.challengeSettings) {
    _.each(data.challengeSettings, s => {
      s.type = map.get(s.type)
    })
  }
  return data
}

/**
 * Get challenge.
 * @param {String} id the challenge id
 * @returns {Object} the challenge with given id
 */
async function getChallenge (id) {
  const challenge = await helper.getById('Challenge', id)

  // populate type property based on the typeId
  const type = await helper.getById('ChallengeType', challenge.typeId)
  challenge.type = type.name
  delete challenge.typeId

  return populateSettings(challenge)
}

getChallenge.schema = {
  id: Joi.id()
}

/**
 * Update challenge.
 * @param {Object} currentUser the user who perform operation
 * @param {String} challengeId the challenge id
 * @param {Object} data the challenge data to be updated
 * @param {Boolean} isFull the flag indicate it is a fully update operation.
 * @returns {Object} the updated challenge
 */
async function update (currentUser, challengeId, data, isFull) {
  const challenge = await helper.getById('Challenge', challengeId)

  if (challenge.createdBy.toLowerCase() !== currentUser.handle.toLowerCase() && !helper.hasAdminRole(currentUser)) {
    throw new errors.ForbiddenError(`Only admin or challenge's copilot can perform modification.`)
  }

  await validateChallengeData(data)

  data.updated = new Date()
  data.updatedBy = currentUser.handle
  const updateDetails = {}
  const transactionItems = []
  _.each(data, (value, key) => {
    let op
    if (key === 'challengeSettings') {
      if (challenge.challengeSettings) {
        if (_.differenceWith(challenge.challengeSettings, value, _.isEqual).length !== 0) {
          op = '$PUT'
        }
      } else {
        op = '$PUT'
      }
    } else if (_.isUndefined(challenge[key]) || challenge[key] !== value) {
      op = '$PUT'
    }

    if (op) {
      if (_.isUndefined(updateDetails[op])) {
        updateDetails[op] = {}
      }
      updateDetails[op][key] = value
      if (key !== 'updated' && key !== 'updatedBy') {
        transactionItems.push(models.AuditLog.transaction.create({
          id: uuid(),
          challengeId,
          fieldName: key,
          oldValue: challenge[key] ? JSON.stringify(challenge[key]) : 'NULL',
          newValue: JSON.stringify(value),
          created: new Date(),
          createdBy: currentUser.handle
        }))
      }
    }
  })

  if (isFull && _.isUndefined(data.challengeSettings) && challenge.challengeSettings) {
    updateDetails['$DELETE'] = { challengeSettings: _.cloneDeep(challenge.challengeSettings) }
    transactionItems.push(models.AuditLog.transaction.create({
      id: uuid(),
      challengeId,
      fieldName: 'challengeSettings',
      oldValue: JSON.stringify(challenge.challengeSettings),
      newValue: 'NULL',
      created: new Date(),
      createdBy: currentUser.handle
    }))
    delete challenge.challengeSettings
  }

  transactionItems.push(models.Challenge.transaction.update({ id: challengeId }, updateDetails))

  await dynamoose.transaction(transactionItems)

  _.assign(challenge, data)
  return challenge
}

/**
 * Fully update challenge.
 * @param {Object} currentUser the user who perform operation
 * @param {String} challengeId the challenge id
 * @param {Object} data the challenge data to be updated
 * @returns {Object} the updated challenge
 */
async function fullyUpdateChallenge (currentUser, challengeId, data) {
  return update(currentUser, challengeId, data, true)
}

fullyUpdateChallenge.schema = {
  currentUser: Joi.any(),
  challengeId: Joi.id(),
  data: Joi.object().keys({
    typeId: Joi.string().required(),
    track: Joi.string().required(),
    name: Joi.string().required(),
    description: Joi.string().required(),
    challengeSettings: Joi.array().items(Joi.object().keys({
      type: Joi.string().required(),
      value: Joi.string().required()
    })).unique((a, b) => a.type === b.type)
  }).required()
}

/**
 * Partially update challenge.
 * @param {Object} currentUser the user who perform operation
 * @param {String} challengeId the challenge id
 * @param {Object} data the challenge data to be updated
 * @returns {Object} the updated challenge
 */
async function partiallyUpdateChallenge (currentUser, challengeId, data) {
  return update(currentUser, challengeId, data)
}

partiallyUpdateChallenge.schema = {
  currentUser: Joi.any(),
  challengeId: Joi.id(),
  data: Joi.object().keys({
    typeId: Joi.string(),
    track: Joi.string(),
    name: Joi.string(),
    description: Joi.string(),
    challengeSettings: Joi.array().items(Joi.object().keys({
      type: Joi.string().required(),
      value: Joi.string().required()
    })).unique((a, b) => a.type === b.type)
  }).required()
}

module.exports = {
  searchChallenges,
  createChallenge,
  getChallenge,
  fullyUpdateChallenge,
  partiallyUpdateChallenge
}

logger.buildService(module.exports)
