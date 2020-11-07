/**
 * This file defines helper methods
 */
const Joi = require('joi')
const _ = require('lodash')
const querystring = require('querystring')
const constants = require('../../app-constants')
const models = require('../models')
const errors = require('./errors')
const util = require('util')
const AWS = require('aws-sdk')
const config = require('config')
const m2mAuth = require('tc-core-library-js').auth.m2m
const m2m = m2mAuth(_.pick(config, ['AUTH0_URL', 'AUTH0_AUDIENCE', 'TOKEN_CACHE_TIME']))
const axios = require('axios')
const busApi = require('topcoder-bus-api-wrapper')
const elasticsearch = require('elasticsearch')
const moment = require('moment')
const HttpStatus = require('http-status-codes')
const xss = require('xss')

// Bus API Client
let busApiClient

// Elasticsearch client
let esClient

// validate ES refresh method
validateESRefreshMethod(config.ES.ES_REFRESH)

AWS.config.update({
  s3: config.AMAZON.S3_API_VERSION,
  // accessKeyId: config.AMAZON.AWS_ACCESS_KEY_ID,
  // secretAccessKey: config.AMAZON.AWS_SECRET_ACCESS_KEY,
  region: config.AMAZON.AWS_REGION
})
const s3 = new AWS.S3()

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
  return `${config.API_BASE_URL}${req.path}?${querystring.stringify(q)}`
}

/**
 * Set HTTP response headers from result.
 * @param {Object} req the HTTP request
 * @param {Object} res the HTTP response
 * @param {Object} result the operation result
 */
function setResHeaders (req, res, result) {
  const totalPages = Math.ceil(result.total / result.perPage)
  if (parseInt(result.page, 10) > 1) {
    res.set('X-Prev-Page', parseInt(result.page, 10) - 1)
  }
  if (parseInt(result.page, 10) < totalPages) {
    res.set('X-Next-Page', parseInt(result.page, 10) + 1)
  }
  res.set('X-Page', parseInt(result.page, 10))
  res.set('X-Per-Page', result.perPage)
  res.set('X-Total', result.total)
  res.set('X-Total-Pages', totalPages)
  // set Link header
  if (totalPages > 0) {
    let link = `<${getPageLink(req, 1)}>; rel="first", <${getPageLink(req, totalPages)}>; rel="last"`
    if (parseInt(result.page, 10) > 1) {
      link += `, <${getPageLink(req, parseInt(result.page, 10) - 1)}>; rel="prev"`
    }
    if (parseInt(result.page, 10) < totalPages) {
      link += `, <${getPageLink(req, parseInt(result.page, 10) + 1)}>; rel="next"`
    }
    res.set('Link', link)
  }
}

/**
 * Check if the user has admin role
 * @param {Object} authUser the user
 */
function hasAdminRole (authUser) {
  if (authUser && authUser.roles) {
    for (let i = 0; i < authUser.roles.length; i++) {
      if (authUser.roles[i].toLowerCase() === constants.UserRoles.Admin.toLowerCase()) {
        return true
      }
    }
  }
  return false
}

/**
 * Remove invalid properties from the object and hide long arrays
 * @param {Object} obj the object
 * @returns {Object} the new object with removed properties
 * @private
 */
function _sanitizeObject (obj) {
  try {
    return JSON.parse(JSON.stringify(obj, (name, value) => {
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
 * Convert the object into user-friendly string which is used in error message.
 * @param {Object} obj the object
 * @returns {String} the string value
 */
function toString (obj) {
  return util.inspect(_sanitizeObject(obj), { breakLength: Infinity })
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
    terms = term.toLowerCase().split(' ')
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
 * @param {String} modelName The dynamoose model name
 * @param {String} id The id value
 * @returns {Promise<void>}
 */
async function getById (modelName, id) {
  return new Promise((resolve, reject) => {
    models[modelName].query('id').eq(id).exec((err, result) => {
      if (err) {
        return reject(err)
      }
      if (result.length > 0) {
        return resolve(result[0])
      } else {
        return reject(new errors.NotFoundError(`${modelName} with id: ${id} doesn't exist`))
      }
    })
  })
}

/**
 * Get Data by model ids
 * @param {String} modelName The dynamoose model name
 * @param {Array} ids The ids
 * @returns {Promise<Array>} the found entities
 */
async function getByIds (modelName, ids) {
  const entities = []
  const theIds = ids || []
  for (const id of theIds) {
    entities.push(await getById(modelName, id))
  }
  return entities
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
    if (list[i][name] && String(list[i][name]).toLowerCase() === String(value).toLowerCase()) {
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
        return reject(err)
      } else {
        return resolve(dbItem)
      }
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
        return reject(err)
      } else {
        return resolve(dbItem)
      }
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
    models[modelName].scan(scanParams).all().exec((err, result) => {
      if (err) {
        return reject(err)
      } else {
        return resolve(result.count === 0 ? [] : result)
      }
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
      const filtered = xss(filter)
      return _.toLower(value).includes(_.toLower(filtered))
    } else {
      return false
    }
  } else {
    return true
  }
}

/**
 * Perform validation on phases.
 * @param {Array} phases the phases data.
 */
async function validatePhases (phases) {
  if (!phases || phases.length === 0) {
    return
  }
  const records = await scan('Phase')
  const map = new Map()
  _.each(records, r => {
    map.set(r.id, r)
  })
  const invalidPhases = _.filter(phases, p => !map.has(p.phaseId))
  if (invalidPhases.length > 0) {
    throw new errors.BadRequestError(`The following phases are invalid: ${toString(invalidPhases)}`)
  }
}

/**
 * Upload file to S3
 * @param {String} attachmentId the attachment id
 * @param {Buffer} data the file data
 * @param {String} mimetype the MIME type
 * @param {String} fileName the original file name
 * @return {Promise} promise to upload file to S3
 */
async function uploadToS3 (attachmentId, data, mimetype, fileName) {
  const params = {
    Bucket: config.AMAZON.ATTACHMENT_S3_BUCKET,
    Key: attachmentId,
    Body: data,
    ContentType: mimetype,
    Metadata: {
      fileName
    }
  }
  // Upload to S3
  return s3.upload(params).promise()
}

/**
 * Download file from S3
 * @param {String} attachmentId the attachment id
 * @return {Promise} promise resolved to downloaded data
 */
async function downloadFromS3 (attachmentId) {
  const file = await s3.getObject({ Bucket: config.AMAZON.ATTACHMENT_S3_BUCKET, Key: attachmentId }).promise()
  return {
    data: file.Body,
    mimetype: file.ContentType
  }
}

/**
 * Delete file from S3
 * @param {String} attachmentId the attachment id
 * @return {Promise} promise resolved to deleted data
 */
async function deleteFromS3 (attachmentId) {
  return s3.deleteObject({ Bucket: config.AMAZON.ATTACHMENT_S3_BUCKET, Key: attachmentId }).promise()
}

/**
 * Get M2M token.
 * @returns {Promise<String>} the M2M token
 */
async function getM2MToken () {
  return m2m.getMachineToken(config.AUTH0_CLIENT_ID, config.AUTH0_CLIENT_SECRET)
}

/**
 * Get challenge resources
 * @param {String} challengeId the challenge id
 * @returns {Promise<Array>} the challenge resources
 */
async function getChallengeResources (challengeId) {
  const token = await getM2MToken()
  const perPage = 100
  let page = 1
  let result = []
  while (true) {
    const url = `${config.RESOURCES_API_URL}?challengeId=${challengeId}&perPage=${perPage}&page=${page}`
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.data || res.data.length === 0) {
      break
    }
    result = result.concat(res.data)
    page += 1
    if (res.headers['x-total-pages'] && page > Number(res.headers['x-total-pages'])) {
      break
    }
  }
  return result
}

/**
 * Create challenge resources
 * @param {String} challengeId the challenge id
 * @param {String} memberHandle the user's member handle
 * @param {String} roleId the resource role ID to assign
 */
async function createResource (challengeId, memberHandle, roleId) {
  const token = await getM2MToken()

  const userObj = {
    challengeId,
    memberHandle,
    roleId
  }
  const url = `${config.RESOURCES_API_URL}`
  const res = await axios.post(url, userObj, { headers: { Authorization: `Bearer ${token}` } })
  return res || false
}

/**
 * Get resource roles
 * @returns {Promise<Array>} the challenge resources
 */
async function getResourceRoles () {
  const token = await getM2MToken()
  const res = await axios.get(config.RESOURCE_ROLES_API_URL, { headers: { Authorization: `Bearer ${token}` } })
  return res.data || []
}

/**
 * Check if a user has full access on a challenge
 * @param {String} challengeId the challenge UUID
 * @param {String} userId the user ID
 */
async function userHasFullAccess (challengeId, userId) {
  const resourceRoles = await getResourceRoles()
  const rolesWithFullAccess = _.map(_.filter(resourceRoles, r => r.fullWriteAccess), 'id')
  const challengeResources = await getChallengeResources(challengeId)
  return _.filter(challengeResources, r => _.toString(r.memberId) === _.toString(userId) && _.includes(rolesWithFullAccess, r.roleId)).length > 0
}

/**
 * Get all user groups
 * @param {String} userId the user id
 * @returns {Promise<Array>} the user groups
 */
async function getUserGroups (userId) {
  const token = await getM2MToken()
  let allGroups = []
  // get search is paginated, we need to get all pages' data
  let page = 1
  while (true) {
    const result = await axios.get(config.GROUPS_API_URL, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        page,
        memberId: userId,
        membershipType: 'user'
      }
    })
    const groups = result.data || []
    if (groups.length === 0) {
      break
    }
    allGroups = allGroups.concat(groups)
    page += 1
    if (result.headers['x-total-pages'] && page > Number(result.headers['x-total-pages'])) {
      break
    }
  }
  return allGroups
}

/**
 * Get all user groups including all parent groups for each child group
 * @param {String} userId the user id
 * @returns {Promise<Array>} the user groups
 */
async function getCompleteUserGroupTreeIds (userId) {
  const childGroups = await getUserGroups(userId)
  const childGroupIds = _.map(childGroups, 'id')
  let result = []
  for (const id of childGroupIds) {
    if (!result.includes(id)) {
      const expanded = await expandWithParentGroups(id)
      result = _.concat(result, expanded)
    }
  }
  return _.uniq(result)
}

/**
 * Get all subgroups for the given group ID
 * @param {String} groupId the group ID
 * @returns {Array<String>} an array with the groups ID and the IDs of all subGroups
 */
async function expandWithSubGroups (groupId) {
  const token = await getM2MToken()
  const result = await axios.get(`${config.GROUPS_API_URL}/${groupId}`, {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      includeSubGroups: true
    }
  })
  const groups = result.data || {}
  return [groupId, ..._.map(_.get(groups, 'subGroups', []), 'id')]
}

/**
 * Get the "up the chain" group tree for the given group ID
 * @param {String} groupId the group ID
 * @returns {Array<String>} an array with the group ID and the IDs of all parent groups up the chain
 */
async function expandWithParentGroups (groupId) {
  const token = await getM2MToken()
  const result = await axios.get(`${config.GROUPS_API_URL}/${groupId}`, {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      includeParentGroup: true,
      oneLevel: false
    }
  })

  const ids = []
  const extractIds = (group) => {
    ids.push(group.id)
    _.each(_.get(group, 'parentGroups', []), (parent) => {
      extractIds(parent)
    })
  }

  extractIds(result.data || {})
  return ids
}

/**
 * Ensures there are no duplicate or null elements in given array.
 * @param {Array} arr the array to check
 * @param {String} name the array name
 */
function ensureNoDuplicateOrNullElements (arr, name) {
  const a = arr || []
  for (let i = 0; i < a.length; i += 1) {
    if (_.isNil(a[i])) {
      throw new errors.BadRequestError(`There is null element for ${name}.`)
    }
    for (let j = i + 1; j < a.length; j += 1) {
      if (a[i] === a[j]) {
        throw new errors.BadRequestError(`There are duplicate elements (${a[i]}) for ${name}.`)
      }
    }
  }
}

/**
 * Get Bus API Client
 * @return {Object} Bus API Client Instance
 */
function getBusApiClient () {
  // if there is no bus API client instance, then create a new instance
  if (!busApiClient) {
    busApiClient = busApi(_.pick(config,
      ['AUTH0_URL', 'AUTH0_AUDIENCE', 'TOKEN_CACHE_TIME',
        'AUTH0_CLIENT_ID', 'AUTH0_CLIENT_SECRET', 'BUSAPI_URL',
        'KAFKA_ERROR_TOPIC', 'AUTH0_PROXY_SERVER_URL']))
  }

  return busApiClient
}

/**
 * Post bus event.
 * @param {String} topic the event topic
 * @param {Object} payload the event payload
 */
async function postBusEvent (topic, payload) {
  const client = getBusApiClient()
  await client.postEvent({
    topic,
    originator: constants.EVENT_ORIGINATOR,
    timestamp: new Date().toISOString(),
    'mime-type': constants.EVENT_MIME_TYPE,
    payload
  })
}

/**
 * Get ES Client
 * @return {Object} Elasticsearch Client Instance
 */
function getESClient () {
  if (esClient) {
    return esClient
  }
  const esHost = config.get('ES.HOST')
  // AWS ES configuration is different from other providers
  if (/.*amazonaws.*/.test(esHost)) {
    esClient = elasticsearch.Client({
      apiVersion: config.get('ES.API_VERSION'),
      hosts: esHost,
      connectionClass: require('http-aws-es'), // eslint-disable-line global-require
      amazonES: {
        region: config.get('AMAZON.AWS_REGION'),
        credentials: new AWS.EnvironmentCredentials('AWS')
      }
    })
  } else {
    esClient = new elasticsearch.Client({
      apiVersion: config.get('ES.API_VERSION'),
      hosts: esHost
    })
  }
  return esClient
}

/**
 * Ensure project exist
 * @param {String} projectId the project id
 * @param {String} userToken the user token
 */
async function ensureProjectExist (projectId, userToken) {
  let token = await getM2MToken()
  const url = `${config.PROJECTS_API_URL}/${projectId}`
  try {
    await axios.get(url, { headers: { Authorization: `Bearer ${token}` } })
  } catch (err) {
    if (_.get(err, 'response.status') === HttpStatus.NOT_FOUND) {
      throw new errors.BadRequestError(`Project with id: ${projectId} doesn't exist`)
    } else {
      // re-throw other error
      throw err
    }
  }
}

/**
 * Calculates challenge end date based on its phases
 * @param {any} challenge
 */
function calculateChallengeEndDate (challenge, data) {
  if (!data) {
    data = challenge
  }
  let phase = data.phases.slice(-1)[0]
  if (!phase || (!data.startDate && !challenge.startDate)) {
    return data.startDate || challenge.startDate
  }
  const phases = (challenge.phases || []).reduce((obj, elem) => {
    obj[elem.id] = elem
    return obj
  }, {})
  let result = moment(data.startDate || challenge.startDate)
  while (phase) {
    result.add(phase.duration || 0, 'seconds')
    phase = phase.predecessor && phases[phase.predecessor]
  }
  return result.toDate()
}

/**
 * Lists challenge ids that given member has access to.
 * @param {Number} memberId the member id
 * @returns {Promise<Array>} an array of challenge ids represents challenges that given member has access to.
 */
async function listChallengesByMember (memberId) {
  const token = await getM2MToken()
  const url = `${config.RESOURCES_API_URL}/${memberId}/challenges?perPage=10000`
  const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } })
  return res.data || []
}

/**
 * Check if ES refresh method is valid.
 *
 * @param {String} method method to be tested
 * @returns {String} method valid method
 */
async function validateESRefreshMethod (method) {
  Joi.attempt(method, Joi.string().label('ES_REFRESH').valid(['true', 'false', 'wait_for']))
  return method
}

/**
 * This functions gets the default terms of use for a given project id
 *
 * @param {Number} projectId The id of the project for which to get the default terms of use
 * @returns {Promise<Array<Number>>} An array containing the ids of the default project terms of use
 */
async function getProjectDefaultTerms (projectId) {
  const token = await getM2MToken()
  const projectUrl = `${config.PROJECTS_API_URL}/${projectId}`
  try {
    const res = await axios.get(projectUrl, { headers: { Authorization: `Bearer ${token}` } })
    return res.data.terms || []
  } catch (err) {
    if (_.get(err, 'response.status') === HttpStatus.NOT_FOUND) {
      throw new errors.BadRequestError(`Project with id: ${projectId} doesn't exist`)
    } else {
      // re-throw other error
      throw err
    }
  }
}

/**
 * This functions gets the default billing account for a given project id
 *
 * @param {Number} projectId The id of the project for which to get the default terms of use
 * @returns {Promise<Number>} The billing account ID
 */
async function getProjectBillingAccount (projectId) {
  const token = await getM2MToken()
  const projectUrl = `${config.V3_PROJECTS_API_URL}/${projectId}`
  try {
    const res = await axios.get(projectUrl, { headers: { Authorization: `Bearer ${token}` } })
    return _.get(res, 'data.result.content.billingAccountIds[0]', null)
  } catch (err) {
    if (_.get(err, 'response.status') === HttpStatus.NOT_FOUND) {
      throw new errors.BadRequestError(`Project with id: ${projectId} doesn't exist`)
    } else {
      // re-throw other error
      throw err
    }
  }
}

/**
 * This function gets the challenge terms array with the terms data
 * The terms data is retrieved from the terms API using the specified terms ids
 *
 * @param {Array<Object>} terms The array of terms {id, roleId} to retrieve from terms API
 */
async function validateChallengeTerms (terms = []) {
  const listOfTerms = []
  const token = await getM2MToken()
  for (let term of terms) {
    // Get the terms details from the API
    try {
      await axios.get(`${config.TERMS_API_URL}/${term.id}`, { headers: { Authorization: `Bearer ${token}` } })
      listOfTerms.push(term)
    } catch (e) {
      if (_.get(e, 'response.status') === HttpStatus.NOT_FOUND) {
        throw new errors.BadRequestError(`Terms of use identified by the id ${term.id} does not exist`)
      } else {
        // re-throw other error
        throw e
      }
    }
  }

  return listOfTerms
}

module.exports = {
  wrapExpress,
  autoWrapExpress,
  setResHeaders,
  checkIfExists,
  hasAdminRole,
  toString,
  getById,
  getByIds,
  create,
  update,
  scan,
  validateDuplicate,
  partialMatch,
  validatePhases,
  uploadToS3,
  downloadFromS3,
  deleteFromS3,
  getChallengeResources,
  createResource,
  getUserGroups,
  ensureNoDuplicateOrNullElements,
  postBusEvent,
  getESClient,
  ensureProjectExist,
  calculateChallengeEndDate,
  listChallengesByMember,
  validateESRefreshMethod,
  getProjectDefaultTerms,
  validateChallengeTerms,
  getProjectBillingAccount,
  expandWithSubGroups,
  getCompleteUserGroupTreeIds,
  expandWithParentGroups,
  getResourceRoles,
  userHasFullAccess
}
