/**
 * This file defines helper methods
 */
const _ = require('lodash')
const querystring = require('querystring')
const constants = require('../../app-constants')
const models = require('../models')
const errors = require('./errors')

/**
 * Wrap async function to standard express function
 * @param {Function} fn the async function
 * @returns {Function} the wrapped function
 */
function wrapExpress (fn) {
  return function (req, res, next) {
    fn(req, res, next).catch(next)
  }
}

/**
 * Wrap all functions from object
 * @param obj the object (controller exports)
 * @returns {Object|Array} the wrapped object
 */
function autoWrapExpress (obj) {
  if (_.isArray(obj)) {
    return obj.map(autoWrapExpress)
  }
  if (_.isFunction(obj)) {
    if (obj.constructor.name === 'AsyncFunction') {
      return wrapExpress(obj)
    }
    return obj
  }
  _.each(obj, (value, key) => {
    obj[key] = autoWrapExpress(value)
  })
  return obj
}

/**
 * Get link for a given page.
 * @param {Object} req the HTTP request
 * @param {Number} page the page number
 * @returns {String} link for the page
 */
function getPageLink (req, page) {
  const q = _.assignIn({}, req.query, { page })
  return `${req.protocol}://${req.get('Host')}${req.baseUrl}${req.path}?${querystring.stringify(q)}`
}

/**
 * Set HTTP response headers from result.
 * @param {Object} req the HTTP request
 * @param {Object} res the HTTP response
 * @param {Object} result the operation result
 */
function setResHeaders (req, res, result) {
  const totalPages = Math.ceil(result.total / result.perPage)
  if (result.page < totalPages) {
    res.set('X-Next-Page', result.page + 1)
  }
  res.set('X-Page', result.page)
  res.set('X-Per-Page', result.perPage)
  res.set('X-Total', result.total)
  res.set('X-Total-Pages', totalPages)
  // set Link header
  if (totalPages > 0) {
    let link = `<${getPageLink(req, 1)}>; rel="first", <${getPageLink(req, totalPages)}>; rel="last"`
    if (result.page > 1) {
      link += `, <${getPageLink(req, result.page - 1)}>; rel="prev"`
    }
    if (result.page < totalPages) {
      link += `, <${getPageLink(req, result.page + 1)}>; rel="next"`
    }
    res.set('Link', link)
  }
}

/**
 * Check if the user has admin role
 * @param {Object} authUser the user
 */
function hasAdminRole (authUser) {
  for (let i = 0; i < authUser.roles.length; i++) {
    if (authUser.roles[i].toLowerCase() === constants.UserRoles.Admin.toLowerCase()) {
      return true
    }
  }
  return false
}

/**
 * Check if exists.
 *
 * @param {Array} source the array in which to search for the term
 * @param {Array | String} term the term to search
 */
function checkIfExists (source, term) {
  let terms

  if (!_.isArray(source)) {
    throw new Error('Source argument should be an array')
  }

  source = source.map(s => s.toLowerCase())

  if (_.isString(term)) {
    terms = term.split(' ')
  } else if (_.isArray(term)) {
    terms = term.map(t => t.toLowerCase())
  } else {
    throw new Error('Term argument should be either a string or an array')
  }

  for (let i = 0; i < terms.length; i++) {
    if (source.includes(terms[i])) {
      return true
    }
  }

  return false
}

/**
 * Get Data by model id
 * @param {Object} modelName The dynamoose model name
 * @param {String} id The id value
 * @returns {Promise<void>}
 */
async function getById (modelName, id) {
  return new Promise((resolve, reject) => {
    models[modelName].query('id').eq(id).exec((err, result) => {
      if (err) {
        reject(err)
      }
      if (result.length > 0) {
        return resolve(result[0])
      } else {
        reject(new errors.NotFoundError(`${modelName} with id: ${id} doesn't exist`))
      }
    })
  })
}

/**
 * Validate the data to ensure no duplication
 * @param {Object} modelName The dynamoose model name
 * @param {String} name The attribute name of dynamoose model
 * @param {String} value The attribute value to be validated
 * @returns {Promise<void>}
 */
async function validateDuplicate (modelName, name, value) {
  const list = await scan(modelName)
  for (let i = 0; i < list.length; i++) {
    if (list[i][name].toLowerCase() === value.toLowerCase()) {
      throw new errors.ConflictError(`${modelName} with ${name}: ${value} already exist`)
    }
  }
}

/**
 * Create item in database
 * @param {Object} modelName The dynamoose model name
 * @param {Object} data The create data object
 * @returns {Promise<void>}
 */
async function create (modelName, data) {
  return new Promise((resolve, reject) => {
    const dbItem = new models[modelName](data)
    dbItem.save((err) => {
      if (err) {
        reject(err)
      }

      return resolve(dbItem)
    })
  })
}

/**
 * Update item in database
 * @param {Object} dbItem The Dynamo database item
 * @param {Object} data The updated data object
 * @returns {Promise<void>}
 */
async function update (dbItem, data) {
  Object.keys(data).forEach((key) => {
    dbItem[key] = data[key]
  })
  return new Promise((resolve, reject) => {
    dbItem.save((err) => {
      if (err) {
        reject(err)
      }

      return resolve(dbItem)
    })
  })
}

/**
 * Get data collection by scan parameters
 * @param {Object} modelName The dynamoose model name
 * @param {Object} scanParams The scan parameters object
 * @returns {Promise<void>}
 */
async function scan (modelName, scanParams) {
  return new Promise((resolve, reject) => {
    models[modelName].scan(scanParams).exec((err, result) => {
      if (err) {
        reject(err)
      }

      return resolve(result.count === 0 ? [] : result)
    })
  })
}

/**
 * Test whether the given value is partially match the filter.
 * @param {String} filter the filter
 * @param {String} value the value to test
 * @returns {Boolean} the match result
 */
function partialMatch (filter, value) {
  if (filter) {
    if (value) {
      return RegExp(filter, 'i').test(value)
    } else {
      return false
    }
  } else {
    return true
  }
}

module.exports = {
  wrapExpress,
  autoWrapExpress,
  setResHeaders,
  checkIfExists,
  hasAdminRole,
  getById,
  create,
  update,
  scan,
  validateDuplicate,
  partialMatch
}
