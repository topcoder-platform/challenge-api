/**
 * This service provides operations of audit logs.
 */

const Joi = require("joi");
const logger = require('../common/logger')
const prisma = require('../common/prisma').getClient()

/**
 * Search audit logs
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function searchAuditLogs (criteria) {
  const page = criteria.page || 1
  const perPage = criteria.perPage || 50

  const prismaFilter = { where: { AND: [] } }
  if (criteria.fieldName) {
    prismaFilter.where.AND.push({
      fieldName: criteria.fieldName
    })
  }
  if (criteria.createdDateStart) {
    prismaFilter.where.AND.push({
      createdAt: { gte: criteria.createdDateStart }
    })
  }
  if (criteria.createdDateEnd) {
    prismaFilter.where.AND.push({
      createdAt: { lte: criteria.createdDateEnd }
    })
  }
  if (criteria.challengeId) {
    prismaFilter.where.AND.push({
      challengeId: criteria.challengeId
    })
  }
  if (criteria.createdBy) {
    prismaFilter.where.AND.push({
      createdBy: criteria.createdBy
    })
  }
  const total = await prisma.auditLog.count(prismaFilter)
  const result = await prisma.auditLog.findMany({
    ...prismaFilter,
    take: perPage,
    skip: (page - 1) * perPage
  })

  return { total, page, perPage, result };
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
  }),
};

module.exports = {
  searchAuditLogs,
};

logger.buildService(module.exports);
