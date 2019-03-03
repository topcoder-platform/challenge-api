/**
 * Controller for challenge type endpoints
 */
const service = require('../services/AuditLogService')
const helper = require('../common/helper')

/**
 * Search audit logs
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function searchAuditLogs (req, res) {
  const result = await service.searchAuditLogs(req.query)
  helper.setResHeaders(req, res, result)
  res.send(result.result)
}

module.exports = {
  searchAuditLogs
}
