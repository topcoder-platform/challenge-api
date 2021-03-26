/**
 * This service provides operations of audit logs.
 */

const _ = require('lodash')
const Joi = require('joi')
const helper = require('../common/helper')
// const logger = require('../common/logger')

/**
 * Search audit logs
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function searchAuditLogs (criteria) {
  const page = criteria.page || 1
  const perPage = criteria.perPage || 50
  let records = await helper.scanAll('AuditLog')
  // TODO this needs to be in ES
  if (criteria.fieldName) records = _.filter(records, e => helper.partialMatch(criteria.fieldName, e.fieldName))
  if (criteria.createdDateStart) records = _.filter(records, e => criteria.createdDateStart.getTime() <= e.created.getTime())
  if (criteria.createdDateEnd) records = _.filter(records, e => criteria.createdDateEnd.getTime() <= e.created.getTime())
  if (criteria.challengeId) records = _.filter(records, e => criteria.challengeId === e.challengeId)
  if (criteria.createdBy) records = _.filter(records, e => criteria.createdBy.toLowerCase() === e.createdBy.toLowerCase())

  const total = records.length
  const result = records.slice((page - 1) * perPage, page * perPage)

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
    createdBy: Joi.string()
  })
}

module.exports = {
  searchAuditLogs
}

// logger.buildService(module.exports)
