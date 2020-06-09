/**
 * This service provides operations of audit logs.
 */

const _ = require('lodash')
const Joi = require('joi')
const helper = require('../common/helper')
const logger = require('../common/logger')

/**
 * Search audit logs
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function searchAuditLogs (criteria) {
  const list = await helper.scan('AuditLog')
  const records = _.filter(list, e => helper.partialMatch(criteria.fieldName, e.fieldName) &&
    (_.isUndefined(criteria.createdDateStart) || criteria.createdDateStart.getTime() <= e.created.getTime()) &&
    (_.isUndefined(criteria.createdDateEnd) || criteria.createdDateEnd.getTime() >= e.created.getTime()) &&
    (_.isUndefined(criteria.challengeId) || criteria.challengeId === e.challengeId) &&
    (_.isUndefined(criteria.createdBy) || criteria.createdBy.toLowerCase() === e.createdBy.toLowerCase())
  )
  const total = records.length
  const result = records.slice((criteria.page - 1) * criteria.perPage, criteria.page * criteria.perPage)

  return { total, page: criteria.page, perPage: criteria.perPage, result }
}

searchAuditLogs.schema = {
  criteria: Joi.object().keys({
    page: Joi.page(),
    perPage: Joi.perPage(),
    challengeId: Joi.string(),
    fieldName: Joi.string(),
    createdDateStart: Joi.date(),
    createdDateEnd: Joi.date(),
    createdBy: Joi.string()
  })
}

module.exports = {
  searchAuditLogs
}

// logger.buildService(module.exports)
