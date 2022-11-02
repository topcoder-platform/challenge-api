/**
 * This module contains the winston logger configuration.
 */

const { ENV } = process.env

const _ = require('lodash')
const Joi = require('joi')
const util = require('util')
const config = require('config')
const getParams = require('get-parameter-names')

const { createLogger, format, transports } = require('winston')
const AWSXRay = require('aws-xray-sdk')
const AWS = require('aws-sdk')

const logger = createLogger({
  level: config.LOG_LEVEL,
  transports: [
    new transports.Console({
      format: ENV === 'local' ? format.combine(
        format.colorize(),
        format.simple()
      ) : format.combine(
        format.timestamp(),
        format.json()
      )
    })
  ]
})

/**
 * Log error details with signature
 * @param err the error
 * @param signature the signature
 */
logger.logFullError = (err, signature) => {
  if (!err) {
    return
  }
  if (signature) {
    logger.error(`Error happened in ${signature}`)
  }
  logger.error(util.inspect(err))
  if (!err.logged) {
    logger.error(err.stack)
    err.logged = true
  }
}

/**
 * Remove invalid properties from the object and hide long arrays
 * @param {Object} obj the object
 * @returns {Object} the new object with removed properties
 * @private
 */
const _sanitizeObject = (obj) => {
  try {
    return JSON.parse(JSON.stringify(obj, (name, value) => {
      // Array of field names that should not be logged
      // add field if necessary (password, tokens etc)
      const removeFields = ['userToken']
      if (_.includes(removeFields, name)) {
        return '<removed>'
      }
      if (_.isArray(value) && value.length > 30) {
        return `Array(${value.length})`
      }
      return value
    }))
  } catch (e) {
    return obj
  }
}

/**
 * Convert array with arguments to object
 * @param {Array} params the name of parameters
 * @param {Array} arr the array with values
 * @private
 */
const _combineObject = (params, arr) => {
  const ret = {}
  _.each(arr, (arg, i) => {
    ret[params[i]] = arg
  })
  return ret
}

/**
 * Decorate all functions of a service and log debug information if DEBUG is enabled
 * @param {Object} service the service
 */
logger.decorateWithLogging = (service) => {
  if (config.LOG_LEVEL !== 'debug') {
    return
  }
  _.each(service, (method, name) => {
    const params = method.params || getParams(method)
    service[name] = async function () {
      const args = Array.prototype.slice.call(arguments)
      logger.debug(util.inspect(_sanitizeObject(_combineObject(params, args))))
      try {
        const result = await method.apply(this, arguments)
        if (result !== null && result !== undefined) {
          logger.debug(util.inspect(_sanitizeObject(result)))
        }
        return result
      } catch (e) {
        logger.logFullError(e, name)
        throw e
      }
    }
  })
}

/**
 * Decorate all functions of a service and validate input values
 * and replace input arguments with sanitized result form Joi
 * Service method must have a `schema` property with Joi schema
 * @param {Object} service the service
 */
logger.decorateWithValidators = function (service) {
  _.each(service, (method, name) => {
    if (!method.schema) {
      return
    }
    const params = getParams(method)
    service[name] = async function () {
      const args = Array.prototype.slice.call(arguments)
      const value = _combineObject(params, args)
      const normalized = Joi.attempt(value, method.schema)

      const newArgs = []
      // Joi will normalize values
      // for example string number '1' to 1
      // if schema type is number
      _.each(params, (param) => {
        newArgs.push(normalized[param])
      })
      return method.apply(this, newArgs)
    }
    service[name].params = params
  })
}

function extractUsingPath (params, path) {
  return path.split('.').reduce((obj, k) => {
    return obj[k] != null ? obj[k] : {}
  }, params)
}

function enhanceTraceWith (type, additionalData, functionArgs, subsegment) {
  if (additionalData == null) {
    return
  }

  try {
    const functionToCall =
        type === 'Annotation' ? 'addAnnotation' : 'addMetadata'

    for (const key of additionalData) {
      if (key.indexOf('.') != null) {
        let args = functionArgs.filter(arg => typeof arg === 'object')
        let allArgs = {}
        for (const arg of args) {
          allArgs = { ...allArgs, ...arg }
        }
        const keyValue = extractUsingPath(allArgs, key)
        if (Object.keys(keyValue).length > 0) {
          subsegment[functionToCall](
            key.substr(key.lastIndexOf('.') + 1),
            keyValue
          )
        }
      } else if (functionArgs[key] != null) {
        subsegment[functionToCall](key, functionArgs[key])
      }
    }
  } catch (err) {
    logger.warn(`Error trying to enhance trace with ${type}`, {})
  }
}

logger.decorateWithTracing = (service, annotations, metadata) => {
  _.each(service, (method, name) => {
    if (method.constructor.name === 'Function') {
      service[name] = function () {
        const args = Array.prototype.slice.call(arguments)
        return AWSXRay.captureFunc(`${name}`, (subsegment) => {
          enhanceTraceWith(
            'Metadata',
            metadata,
            args,
            subsegment
          )

          enhanceTraceWith(
            'Annotation',
            annotations,
            args,
            subsegment
          )

          try {
            const result = method.apply(this, arguments)
            return result
          } catch (err) {
            subsegment.addError(new Error(err))
            throw err
          } finally {
            subsegment.close()
          }
        })
      }
    } else if (method.constructor.name === 'AsyncFunction') {
      service[name] = async function () {
        const args = Array.prototype.slice.call(arguments)
        return AWSXRay.captureAsyncFunc(`${name}`, (subsegment) => {
          enhanceTraceWith(
            'Metadata',
            metadata,
            args,
            subsegment
          )

          enhanceTraceWith(
            'Annotation',
            annotations,
            args,
            subsegment
          )

          return method.apply(this, args).then((result) => {
            return result
          }).catch((err) => {
            subsegment.addError(new Error(err))
            throw err
          }).finally(() => {
            subsegment.close()
          })
        })
      }
    }
  })
}

/**
 * Apply logger and validation decorators
 * @param {Object} service the service to wrap
 */
logger.buildService = (service, config = {
  validators: { enabled: true },
  logging: { enabled: true },
  tracing: { enabled: true, annotations: [], metadata: [] }
}) => {
  if (config != null && config.validations != null && config.validators.enabled) {
    logger.decorateWithValidators(service)
  }

  if (config != null && config.logging != null && config.logging.enabled) {
    logger.decorateWithLogging(service)
  }

  if (config != null && config.tracing != null && config.tracing.enabled) {
    // eslint-disable-next-line global-require
    AWSXRay.captureHTTPsGlobal(require('http'))
    // eslint-disable-next-line global-require
    AWSXRay.captureHTTPsGlobal(require('https'))
    AWSXRay.captureAWSClient(new AWS.DynamoDB())

    logger.decorateWithTracing(service, config.tracing.annotations, config.tracing.metadata)
  }
}

module.exports = logger
