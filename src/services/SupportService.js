/**
 * This service provides operations of support requests.
 */

const _ = require('lodash')
const Joi = require('joi')
const config = require('config')
const helper = require('../common/helper')
const logger = require('tc-framework').logger(config)

const withApm = {}

/**
 * Create a request in zendesk
 * @param {Object} currentUser the current user
 * @param {Object} request the request
 * @returns {Object} the search result
 */
withApm.createRequest = async function (currentUser, request) {
  let subject
  if (request.isSelfService) {
    subject += 'Self-Service customer support request'
  } else {
    subject = 'General support request'
  }
  if (request.challengeId) {
    subject += ` for Challenge ID: ${request.challengeId}`
  }
  return helper.submitZendeskRequest({
    requester: {
      name: `${request.firstName} ${request.lastName}`,
      email: request.email
    },
    subject,
    comment: {
      body: request.question
    },
    priority: config.ZENDESK_DEFAULT_PRIORITY,
    ...(request.isSelfService && config.ZENDESK_CUSTOM_FIELD_TAG_ID ? {
      custom_fields: [
        {
          id: _.toNumber(config.ZENDESK_CUSTOM_FIELD_TAG_ID),
          value: 'self_service'
        }
      ]
    } : {})
  })
}

withApm.createRequest.schema = {
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

_.each(withApm, (method) => {
  method.apm = true
  delete method.schema
})

logger.buildService(withApm)

module.exports = withApm
