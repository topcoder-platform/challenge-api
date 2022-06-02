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
const NodeCache = require('node-cache')
const HttpStatus = require('http-status-codes')
const xss = require('xss')
const logger = require('./logger')

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

// Internal cache
const internalCache = new NodeCache({ stdTTL: config.INTERNAL_CACHE_TTL })

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
    models[modelName].scan(scanParams).exec((err, result) => {
      if (err) {
        return reject(err)
      } else {
        return resolve(result.count === 0 ? [] : result)
      }
    })
  })
}

/**
 * Get all data collection (avoid default page limit of DynamoDB) by scan parameters
 * @param {Object} modelName The dynamoose model name
 * @param {Object} scanParams The scan parameters object
 * @returns {Array}
 */
async function scanAll (modelName, scanParams) {
  let results = await models[modelName].scan(scanParams).exec()
  let lastKey = results.lastKey
  while (!_.isUndefined(results.lastKey)) {
    const newResult = await models[modelName].scan(scanParams).startAt(lastKey).exec()
    results = [...results, ...newResult]
    lastKey = newResult.lastKey
  }
  return results
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
 * Download file from S3
 * @param {String} bucket the bucket name
 * @param {String} key the key name
 * @return {Promise} promise resolved to downloaded data
 */
async function downloadFromFileStack (url) {
  const res = await axios.get(url)
  return {
    data: res.data,
    mimetype: _.get(res, `headers['content-type']`, 'application/json')
  }
}

/**
 * Download file from S3
 * @param {String} bucket the bucket name
 * @param {String} key the key name
 * @return {Promise} promise resolved to downloaded data
 */
async function downloadFromS3 (bucket, key) {
  const file = await s3.getObject({ Bucket: bucket, Key: key }).promise()
  return {
    data: file.Body,
    mimetype: file.ContentType
  }
}

/**
 * Delete file from S3
 * @param {String} bucket the bucket name
 * @param {String} key the key name
 * @return {Promise} promise resolved to deleted data
 */
async function deleteFromS3 (bucket, key) {
  return s3.deleteObject({ Bucket: bucket, Key: key }).promise()
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
 * Create Project
 * @param {String} name The name
 * @param {String} description The description
 * @param {String} type The type
 * @param {String} token The token
 * @returns
 */
async function createSelfServiceProject (name, description, type, token) {
  const projectObj = {
    name,
    description,
    type
  }
  const url = `${config.PROJECTS_API_URL}`
  const res = await axios.post(url, projectObj, { headers: { Authorization: `Bearer ${token}` } })
  return _.get(res, 'data.id')
}

/**
 * Get project id by roundId
 * @param {String} roundId the round id
 */
async function getProjectIdByRoundId (roundId) {
  const url = `${config.CHALLENGE_MIGRATION_APP_URL}/getChallengeProjectId/${roundId}`
  const res = await axios.get(url)
  return _.get(res, 'data.projectId')
}

/**
 * Get project payment
 * @param {String} projectId the project id
 */
async function getProjectPayment (projectId) {
  const token = await getM2MToken()
  const url = `${config.CUSTOMER_PAYMENTS_URL}`
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      referenceId: projectId,
      reference: 'project'
    }
  })
  const [payment] = res.data
  return payment
}

/**
 * Charge payment
 * @param {String} paymentId the payment ID
 */
async function capturePayment (paymentId) {
  const token = await getM2MToken()
  const url = `${config.CUSTOMER_PAYMENTS_URL}/${paymentId}/charge`
  logger.info(`Calling: ${url} to capture payment`)
  const res = await axios.patch(url, {}, { headers: { Authorization: `Bearer ${token}` } })
  logger.debug(`Payment API Response: ${JSON.stringify(res.data, null, 2)}`)
  if (res.data.status !== 'succeeded') {
    throw new Error(`Failed to charge payment. Current status: ${res.data.status}`)
  }
  return res.data
}

/**
 * Cancel payment
 * @param {String} paymentId the payment ID
 */
async function cancelPayment (paymentId) {
  const token = await getM2MToken()
  const url = `${config.CUSTOMER_PAYMENTS_URL}/${paymentId}/cancel`
  const res = await axios.patch(url, {}, { headers: { Authorization: `Bearer ${token}` } })
  if (res.data.status !== 'canceled') {
    throw new Error(`Failed to cancel payment. Current status: ${res.data.status}`)
  }
  return res.data
}

/**
 * Cancel project
 * @param {String} projectId the project id
 * @param {String} cancelReason the cancel reasonn
 * @param {Object} currentUser the current user
 */
async function cancelProject (projectId, cancelReason, currentUser) {
  let payment = await getProjectPayment(projectId)
  const project = await ensureProjectExist(projectId, currentUser)
  if (project.status === 'cancelled') return // already canceled
  try {
    payment = await cancelPayment(payment.id)
  } catch (e) {
    logger.debug(`Failed to cancel payment with error: ${e.message}`)
  }
  const token = await getM2MToken()
  const url = `${config.PROJECTS_API_URL}/${projectId}`
  await axios.patch(url, {
    cancelReason,
    status: 'cancelled',
    details: {
      ...project.details,
      paymentProvider: config.DEFAULT_PAYMENT_PROVIDER,
      paymentId: payment.id,
      paymentIntentId: payment.paymentIntentId,
      paymentAmount: payment.amount,
      paymentCurrency: payment.currency,
      paymentStatus: payment.status
    }
  }, { headers: { Authorization: `Bearer ${token}` } })
}

/**
 * Activate project
 * @param {String} projectId the project id
 * @param {Object} currentUser the current user
 */
async function activateProject (projectId, currentUser, name, description) {
  let payment
  let project
  try {
    payment = await getProjectPayment(projectId)
    project = await ensureProjectExist(projectId, currentUser)
    if (payment.status !== 'succeeded') {
      payment = await capturePayment(payment.id)
    }
  } catch (e) {
    logger.debug(e)
    logger.debug(`Failed to charge payment ${payment.id} with error: ${e.message}`)
    await cancelProject(projectId, `Failed to charge payment ${payment.id} with error: ${e.message}`, currentUser)
    throw new Error(`Failed to charge payment ${payment.id} with error: ${e.message}`)
  }
  const token = await getM2MToken()
  const url = `${config.PROJECTS_API_URL}/${projectId}`
  const res = await axios.patch(url, {
    name,
    description,
    status: 'active',
    details: {
      ...project.details,
      paymentProvider: config.DEFAULT_PAYMENT_PROVIDER,
      paymentId: payment.id,
      paymentIntentId: payment.paymentIntentId,
      paymentAmount: payment.amount,
      paymentCurrency: payment.currency,
      paymentStatus: payment.status
    }
  }, { headers: { Authorization: `Bearer ${token}` } })

  if (res.data && res.data.status === 'reviewed') {
    // auto activate if the project goes in reviewed state
    await activateProject(projectId, currentUser, name, description)
  }
}

/**
 * Update self service project info
 * @param {*} projectId the project id
 * @param {*} workItemPlannedEndDate the planned end date of the work item
 * @param {*} currentUser the current user
 */
async function updateSelfServiceProjectInfo (projectId, workItemPlannedEndDate, currentUser) {
  const project = await ensureProjectExist(projectId, currentUser)
  const payment = await getProjectPayment(projectId)
  const token = await getM2MToken()
  const url = `${config.PROJECTS_API_URL}/${projectId}`
  const res = await axios.patch(url, {
    details: {
      ...project.details,
      paymentProvider: config.DEFAULT_PAYMENT_PROVIDER,
      paymentId: payment.id,
      paymentIntentId: payment.paymentIntentId,
      paymentAmount: payment.amount,
      paymentCurrency: payment.currency,
      paymentStatus: payment.status,
      workItemPlannedEndDate
    }
  }, { headers: { Authorization: `Bearer ${token}` } })
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
        perPage: 5000,
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
  const token = await getM2MToken()
  const result = await axios.get(`${config.GROUPS_API_URL}/memberGroups/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      uuid: true
    }
  })

  return result.data || []
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
 * @param {Object} options the extra options to the message
 */
async function postBusEvent (topic, payload, options = {}) {
  const client = getBusApiClient()
  const message = {
    topic,
    originator: constants.EVENT_ORIGINATOR,
    timestamp: new Date().toISOString(),
    'mime-type': constants.EVENT_MIME_TYPE,
    payload
  }
  if (options.key) {
    message.key = options.key
  }
  await client.postEvent(message)
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
 * @param {String} currentUser the user
 */
async function ensureProjectExist (projectId, currentUser) {
  let token = await getM2MToken()
  const url = `${config.PROJECTS_API_URL}/${projectId}`
  try {
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } })
    if (currentUser.isMachine || hasAdminRole(currentUser)) {
      return res.data
    }
    if (_.get(res, 'data.type') === 'self-service' && _.includes(config.SELF_SERVICE_WHITELIST_HANDLES, currentUser.handle.toLowerCase())) {
      return res.data
    }
    if (!_.find(_.get(res, 'data.members', []), m => _.toString(m.userId) === _.toString(currentUser.userId))) {
      throw new errors.ForbiddenError(`You don't have access to project with ID: ${projectId}`)
    }
    return res.data
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
  let lastPhase = data.phases[data.phases.length - 1]
  return lastPhase.actualEndDate || lastPhase.scheduledEndDate
  // let phase = data.phases[data.phases.length - 1]
  // if (!phase || (!data.startDate && !challenge.startDate)) {
  //   return data.startDate || challenge.startDate
  // }
  // const phases = (challenge.phases || []).reduce((obj, elem) => {
  //   obj[elem.id] = elem
  //   return obj
  // }, {})
  // let result = moment(data.startDate || challenge.startDate)
  // while (phase) {
  //   result.add(phase.duration || 0, 'seconds')
  //   phase = phase.predecessor ? phases[phase.predecessor] : null
  // }
  // return result.toDate()
}

/**
 * Lists challenge ids that given member has access to.
 * @param {Number} memberId the member id
 * @returns {Promise<Array>} an array of challenge ids represents challenges that given member has access to.
 */
async function listChallengesByMember (memberId) {
  const token = await getM2MToken()
  let allIds = []
  // get search is paginated, we need to get all pages' data
  let page = 1
  while (true) {
    const result = await axios.get(`${config.RESOURCES_API_URL}/${memberId}/challenges`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        page,
        perPage: 10000
      }
    })
    const ids = result.data || []
    if (ids.length === 0) {
      break
    }
    allIds = allIds.concat(ids)
    page += 1
    if (result.headers['x-total-pages'] && page > Number(result.headers['x-total-pages'])) {
      break
    }
  }
  return allIds
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
async function getProjectBillingInformation (projectId) {
  const token = await getM2MToken()
  const projectUrl = `${config.PROJECTS_API_URL}/${projectId}/billingAccount`
  try {
    const res = await axios.get(projectUrl, { headers: { Authorization: `Bearer ${token}` } })
    let markup = _.get(res, 'data.markup', null) ? _.toNumber(_.get(res, 'data.markup', null)) : null
    if (markup && markup > 0) {
      // TODO - Hack to change int returned from api to decimal
      markup = markup / 100
    }
    return {
      billingAccountId: _.get(res, 'data.tcBillingAccountId', null),
      markup
    }
  } catch (err) {
    if (_.get(err, 'response.status') === HttpStatus.NOT_FOUND) {
      return {
        billingAccountId: null,
        markup: null
      }
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

/**
 * Filter challenges by groups access
 * @param {Object} currentUser the user who perform operation
 * @param {Array} challenges the challenges to filter
 * @returns {Array} the challenges that can be accessed by current user
 */
async function _filterChallengesByGroupsAccess (currentUser, challenges) {
  const res = []
  const needToCheckForGroupAccess = !currentUser ? true : !currentUser.isMachine && !hasAdminRole(currentUser)
  if (!needToCheckForGroupAccess) return challenges

  let userGroups

  for (const challenge of challenges) {
    challenge.groups = _.filter(challenge.groups, g => !_.includes(['null', 'undefined'], _.toString(g).toLowerCase()))
    if (!challenge.groups || _.get(challenge, 'groups.length', 0) === 0 || !needToCheckForGroupAccess) {
      res.push(challenge)
    } else if (currentUser) {
      if (_.isNil(userGroups)) {
        userGroups = await getCompleteUserGroupTreeIds(currentUser.userId)
      }
      // get user groups if not yet
      if (_.find(challenge.groups, (group) => !!_.find(userGroups, (ug) => ug === group))) {
        res.push(challenge)
      }
    }
  }
  return res
}

/**
 * Ensure the user can access the challenge by groups access
 * @param {Object} currentUser the user who perform operation
 * @param {Object} challenge the challenge to check
 */
async function ensureAccessibleByGroupsAccess (currentUser, challenge) {
  const filtered = await _filterChallengesByGroupsAccess(currentUser, [challenge])
  if (filtered.length === 0) {
    throw new errors.ForbiddenError("helper ensureAcessibilityToModifiedGroups :: You don't have access to this group!")
  }
}

/**
 * Ensure the user can access a task challenge.
 *
 * @param {Object} currentUser the user who perform operation
 * @param {Object} challenge the challenge to check
 */
async function _ensureAccessibleForTaskChallenge (currentUser, challenge) {
  let challengeResourceIds
  // Check if challenge is task and apply security rules
  if (_.get(challenge, 'task.isTask', false) && _.get(challenge, 'task.isAssigned', false)) {
    if (currentUser) {
      if (!currentUser.isMachine) {
        const challengeResources = await getChallengeResources(challenge.id)
        challengeResourceIds = _.map(challengeResources, r => _.toString(r.memberId))
      }
    }
    const canAccesChallenge = _.isUndefined(currentUser) ? false : currentUser.isMachine || hasAdminRole(currentUser) || _.includes((challengeResourceIds || []), _.toString(currentUser.userId))
    if (!canAccesChallenge) {
      throw new errors.ForbiddenError(`You don't have access to view this challenge`)
    }
  }
}

/**
 * Ensure the user can view a challenge.
 *
 * @param {Object} currentUser the user who perform operation
 * @param {Object} challenge the challenge to check
 */
async function ensureUserCanViewChallenge (currentUser, challenge) {
  // check groups authorization
  await ensureAccessibleByGroupsAccess(currentUser, challenge)
  // check if user can access a challenge that is a task
  await _ensureAccessibleForTaskChallenge(currentUser, challenge)
}

/**
 * Ensure user can perform modification to a challenge
 *
 * @param {Object} currentUser the user who perform operation
 * @param {Object} challenge the challenge to check
 * @returns {undefined}
 */
async function ensureUserCanModifyChallenge (currentUser, challenge) {
  // check groups authorization
  await ensureAccessibleByGroupsAccess(currentUser, challenge)
  // check full access
  const isUserHasFullAccess = await userHasFullAccess(challenge.id, currentUser.userId)
  if (!currentUser.isMachine && !hasAdminRole(currentUser) && challenge.createdBy.toLowerCase() !== currentUser.handle.toLowerCase() && !isUserHasFullAccess) {
    throw new errors.ForbiddenError(`Only M2M, admin, challenge's copilot or users with full access can perform modification.`)
  }
}

/**
  * Calculate the sum of prizes.
  *
  * @param {Array} prizes the list of prize
  * @returns {Number} the result prize
  */
function sumOfPrizes (prizes) {
  let sum = 0
  if (!prizes.length) {
    return sum
  }
  for (const prize of prizes) {
    sum += prize.value
  }
  return sum
}

/**
  * Get group by id
  * @param {String} groupId the group id
  * @returns {Promise<Object>} the group
  */
async function getGroupById (groupId) {
  const token = await getM2MToken()
  try {
    const result = await axios.get(`${config.GROUPS_API_URL}/${groupId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return result.data
  } catch (err) {
    if (err.response.status === HttpStatus.NOT_FOUND) {
      return
    }
    throw err
  }
}

/**
 * Get challenge submissions
 * @param {String} challengeId the challenge id
 * @returns {Array} the submission
 */
async function getChallengeSubmissions (challengeId) {
  const token = await getM2MToken()
  let allSubmissions = []
  // get search is paginated, we need to get all pages' data
  let page = 1
  while (true) {
    const result = await axios.get(`${config.SUBMISSIONS_API_URL}?challengeId=${challengeId}`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        page,
        perPage: 100
      }
    })
    const ids = result.data || []
    if (ids.length === 0) {
      break
    }
    allSubmissions = allSubmissions.concat(ids)
    page += 1
    if (result.headers['x-total-pages'] && page > Number(result.headers['x-total-pages'])) {
      break
    }
  }
  return allSubmissions
}

/**
 * Get member by ID
 * @param {String} userId the user ID
 * @returns {Object}
 */
async function getMemberById (userId) {
  const token = await getM2MToken()
  const res = await axios.get(`${config.MEMBERS_API_URL}?userId=${userId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (res.data.length > 0) return res.data[0]
  return {}
}

/**
 * Get member by handle
 * @param {String} handle the user handle
 * @returns {Object}
 */
async function getMemberByHandle (handle) {
  const token = await getM2MToken()
  const res = await axios.get(`${config.MEMBERS_API_URL}/${handle}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.data || {}
}

/**
 * Send self service notification
 * @param {String} type the notification type
 * @param {Array} recipients the array of recipients in { userId || email || handle } format
 * @param {Object} data the data
 */
async function sendSelfServiceNotification (type, recipients, data) {
  try {
    await postBusEvent(constants.Topics.Notifications, {
      notifications: [
        {
          serviceId: 'email',
          type,
          details: {
            from: config.EMAIL_FROM,
            recipients: [...recipients],
            cc: [...constants.SelfServiceNotificationSettings[type].cc],
            data: {
              ...data,
              supportUrl: `${config.SELF_SERVICE_APP_URL}/support`
            },
            sendgridTemplateId: constants.SelfServiceNotificationSettings[type].sendgridTemplateId,
            version: 'v3'
          }
        }
      ]
    })
  } catch (e) {
    logger.debug(`Failed to post notification ${type}: ${e.message}`)
  }
}

/**
 * Submit a request to zendesk
 * @param {Object} request the request
 */
async function submitZendeskRequest (request) {
  try {
    const res = await axios.post(`${config.ZENDESK_API_URL}/api/v2/requests`, {
      request: {
        ...request
      }
    }, {
      auth: {
        username: `${request.requester.email}/token`,
        password: config.ZENDESK_API_TOKEN
      }
    })
    return res.data || {}
  } catch (e) {
    logger.debug(`Failed to submit request: ${e.message}`)
    throw e
  }
}

function getFromInternalCache (key) {
  return internalCache.get(key)
}

function setToInternalCache (key, value) {
  internalCache.set(key, value)
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
  scanAll,
  validateDuplicate,
  partialMatch,
  validatePhases,
  downloadFromFileStack,
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
  getProjectBillingInformation,
  expandWithSubGroups,
  getCompleteUserGroupTreeIds,
  expandWithParentGroups,
  getResourceRoles,
  ensureAccessibleByGroupsAccess,
  ensureUserCanViewChallenge,
  ensureUserCanModifyChallenge,
  userHasFullAccess,
  sumOfPrizes,
  getProjectIdByRoundId,
  getGroupById,
  getChallengeSubmissions,
  getMemberById,
  createSelfServiceProject,
  activateProject,
  cancelProject,
  getProjectPayment,
  capturePayment,
  cancelPayment,
  sendSelfServiceNotification,
  getMemberByHandle,
  submitZendeskRequest,
  updateSelfServiceProjectInfo,
  getFromInternalCache,
  setToInternalCache
}
