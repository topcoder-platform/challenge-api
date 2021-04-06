/**
 * This service provides operations of audit logs.
 */

const _ = require('lodash')
const Joi = require('joi')
const helper = require('../common/helper')
const logger = require('../common/logger')
const models = require('../models')
const errors = require('../common/errors')

/**
 * Search audit logs
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function searchAuditLogs (criteria) {
  logger.info(`searching audit logs with criteria ${JSON.stringify(criteria)}`)

  const page = criteria.page || 1
  const perPage = criteria.perPage || 50

  const AuditTable = models['AuditLog']
  let results = []
  let query = null

  // atleast one of these fields must be present for the compulsory equality check for dynamoose query function
  if (!criteria.id && !criteria.challengeId) {
    throw new errors.BadRequestError('You should pass at least one of challengeId or id in params')
  }

  // equality filters
  if (criteria.challengeId) query = AuditTable.query('challengeId').eq(criteria.challengeId)
  if (criteria.id) query = query ? query.and().filter('id').eq(criteria.id) : AuditTable.query('id').eq(criteria.id)

  // range filters
  if (criteria.createdDateStart && criteria.createdDateEnd) {
    if (criteria.createdDateEnd.getTime() < criteria.createdDateStart.getTime()) {
      throw new errors.BadRequestError('createdDateEnd param should be greater than or equal to createdDateStart')
    }
    query = query.and().filter('created').between(criteria.createdDateStart, criteria.createdDateEnd)
  } else if (criteria.createdDateStart) {
    query = query.and().filter('created').ge(criteria.createdDateStart)
  } else if (criteria.createdDateEnd) {
    query = query.and().filter('created').le(criteria.createdDateEnd)
  }

  results = await query.all().exec()

  // we can't execute case insensitive matches directly on dynamodb.
  // hence filtering after fetching the data
  // case insensitive exact matches
  if (criteria.createdBy) results = _.filter(results, res => res.createdBy.toLowerCase() === criteria.createdBy.toLowerCase())

  // case insensitive partial matches
  if (criteria.fieldName) results = _.filter(results, res => helper.partialMatch(criteria.fieldName, res.fieldName))
  if (criteria.oldValue) results = _.filter(results, res => helper.partialMatch(criteria.oldValue, res.oldValue))
  if (criteria.newValue) results = _.filter(results, res => helper.partialMatch(criteria.newValue, res.newValue))

  const total = results.length
  const result = results.slice((page - 1) * perPage, page * perPage)

  logger.info(`querying audit logs complete totalCount:${total} currentPageCount:${result.length}`)
  return { total, page, perPage, result }
}

searchAuditLogs.schema = {
  criteria: Joi.object().keys({
    page: Joi.page(),
    perPage: Joi.perPage(),
    challengeId: Joi.string(),
    fieldName: Joi.string(),
    createdDateStart: Joi.date(),
    createdDateEnd: Joi.date(),
    createdBy: Joi.string(),
    id: Joi.string(),
    oldValue: Joi.string(),
    newValue: Joi.string()
  })
}

module.exports = {
  searchAuditLogs
}

logger.decorateWithValidators(module.exports)
