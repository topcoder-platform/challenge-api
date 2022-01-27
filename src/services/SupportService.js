/**
 * This service provides operations of support requests.
 */

const _ = require('lodash')
const Joi = require('joi')
const helper = require('../common/helper')
const logger = require('../common/logger')

/**
 * Create a request in zendesk
 * @param {Object} currentUser the current user
 * @param {Object} request the request
 * @returns {Object} the search result
 */
async function createRequest (currentUser, request) {
  return await helper.submitZendeskRequest({
    requester: {
      name: `${request.firstName} ${request.lastName}`,
      email: request.email
    },
    subject: `${request.isSelfService ? 'Self-Service customer request for' : ''} Challenge ID: ${request.challengeId}`,
    comment: {
      body: request.question
    }
  })
}

createRequest.schema = {
  currentUser: Joi.any(),
  request: Joi.object().keys({
    challengeId: Joi.optionalId(),
    email: Joi.string().email().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    isSelfService: Joi.boolean(),
    question: Joi.string().required()
  })
}

module.exports = {
  createRequest
}

logger.buildService(module.exports)
