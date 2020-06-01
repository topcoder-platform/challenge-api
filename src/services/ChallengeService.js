/**
 * This service provides operations of challenge.
 */

const _ = require('lodash')
const Joi = require('joi')
const uuid = require('uuid/v4')
const config = require('config')
const helper = require('../common/helper')
const logger = require('../common/logger')
const errors = require('../common/errors')
const constants = require('../../app-constants')
const models = require('../models')
const HttpStatus = require('http-status-codes')
const moment = require('moment')
const phaseService = require('./PhaseService')
const challengeTypeService = require('./ChallengeTypeService')
const timelineTemplateService = require('./TimelineTemplateService')

const esClient = helper.getESClient()

/**
 * Filter challenges by groups access
 * @param {Object} currentUser the user who perform operation
 * @param {Array} challenges the challenges to filter
 * @returns {Array} the challenges that can be accessed by current user
 */
async function filterChallengesByGroupsAccess (currentUser, challenges) {
  const res = []
  let userGroups
  const needToCheckForGroupAccess = !currentUser ? true : !currentUser.isMachine && !helper.hasAdminRole(currentUser)
  for (const challenge of challenges) {
    challenge.groups = _.filter(challenge.groups, g => !_.includes(['null', 'undefined'], _.toString(g).toLowerCase()))
    if (!challenge.groups || _.get(challenge, 'groups.length', 0) === 0 || !needToCheckForGroupAccess) {
      res.push(challenge)
    } else if (currentUser) {
      // get user groups if not yet
      if (_.isNil(userGroups)) {
        userGroups = await helper.getUserGroups(currentUser.userId)
      }
      // check if there is matched group
      // logger.debug('Groups', challenge.groups, userGroups)
      if (_.find(challenge.groups, (group) => !!_.find(userGroups, (ug) => ug.id === group))) {
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
  const filtered = await filterChallengesByGroupsAccess(currentUser, [challenge])
  if (filtered.length === 0) {
    throw new errors.ForbiddenError(`You don't have access to this group!`)
  }
}

/**
 * Ensure the user can access the groups being updated to
 * @param {Object} currentUser the user who perform operation
 * @param {Object} data the challenge data to be updated
 * @param {String} challenge the original challenge data
 */

async function ensureAcessibilityToModifiedGroups (currentUser, data, challenge) {
  const userGroups = await helper.getUserGroups(currentUser.userId)
  const userGroupsNames = _.map(userGroups, group => group.name)
  const updatedGroups = _.difference(_.union(challenge.groups, data.groups), _.intersection(challenge.groups, data.groups))
  const filtered = updatedGroups.filter(g => !userGroupsNames.includes(g))
  if (filtered.length > 0) {
    throw new errors.ForbiddenError(`You don't have access to this group!`)
  }
}

/**
 * Search challenges
 * @param {Object} currentUser the user who perform operation
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function searchChallenges (currentUser, criteria) {
  // construct ES query
  const boolQuery = []
  _.forIn(_.omit(criteria, ['name', 'description', 'page', 'perPage', 'tag', 'group', 'groups', 'gitRepoURL', 'createdDateStart', 'createdDateEnd',
    'updatedDateStart', 'updatedDateEnd', 'startDateStart', 'startDateEnd', 'endDateStart', 'endDateEnd', 'memberId',
    'currentPhaseId', 'currentPhaseName', 'forumId', 'track', 'reviewType', 'confidentialityType', 'directProjectId', 'sortBy', 'sortOrder']), (value, key) => {
    if (!_.isUndefined(value)) {
      const filter = { match_phrase: {} }
      filter.match_phrase[key] = value
      boolQuery.push(filter)
    }
  })

  if (criteria.name) {
    boolQuery.push({ match: { name: `.*${criteria.name}.*` } })
  }
  if (criteria.description) {
    boolQuery.push({ match: { description: `.*${criteria.name}.*` } })
  }
  if (criteria.forumId) {
    boolQuery.push({ match_phrase: { 'legacy.forumId': criteria.forumId } })
  }
  if (criteria.track) {
    boolQuery.push({ match_phrase: { 'legacy.track': criteria.track } })
  }
  if (criteria.reviewType) {
    boolQuery.push({ match_phrase: { 'legacy.reviewType': criteria.reviewType } })
  }
  if (criteria.confidentialityType) {
    boolQuery.push({ match_phrase: { 'legacy.confidentialityType': criteria.confidentialityType } })
  }
  if (criteria.directProjectId) {
    boolQuery.push({ match_phrase: { 'legacy.directProjectId': criteria.directProjectId } })
  }
  if (criteria.tag) {
    boolQuery.push({ match_phrase: { tags: criteria.tag } })
  }
  if (criteria.group && !_.isUndefined(currentUser)) {
    boolQuery.push({ match_phrase: { groups: criteria.group } })
  }
  if (criteria.gitRepoURL) {
    boolQuery.push({ match_phrase: { gitRepoURLs: criteria.gitRepoURL } })
  }
  if (criteria.currentPhaseId) {
    boolQuery.push({ match_phrase: { 'currentPhase.id': criteria.currentPhaseId } })
  }
  if (criteria.currentPhaseName) {
    boolQuery.push({ match_phrase: { 'currentPhase.name': criteria.currentPhaseName } })
  }
  if (criteria.createdDateStart) {
    boolQuery.push({ range: { created: { gte: criteria.createdDateStart } } })
  }
  if (criteria.createdDateEnd) {
    boolQuery.push({ range: { created: { lte: criteria.createdDateEnd } } })
  }
  if (criteria.updatedDateStart) {
    boolQuery.push({ range: { updated: { gte: criteria.updatedDateStart } } })
  }
  if (criteria.updatedDateEnd) {
    boolQuery.push({ range: { updated: { lte: criteria.updatedDateEnd } } })
  }
  if (criteria.startDateStart) {
    boolQuery.push({ range: { startDate: { gte: criteria.startDateStart } } })
  }
  if (criteria.startDateEnd) {
    boolQuery.push({ range: { startDate: { lte: criteria.startDateEnd } } })
  }
  if (criteria.endDateStart) {
    boolQuery.push({ range: { endDate: { gte: criteria.endDateStart } } })
  }
  if (criteria.endDateEnd) {
    boolQuery.push({ range: { endDate: { lte: criteria.endDateEnd } } })
  }
  const sortByProp = criteria.sortBy ? criteria.sortBy : 'created'
  const sortOrderProp = criteria.sortOrder ? criteria.sortOrder : 'asc'

  const mustQuery = []

  const shouldQuery = []

  if (criteria.groups && !_.isUndefined(currentUser)) {
    for (const group of criteria.groups) {
      shouldQuery.push({ match: { groups: group } })
    }
  }

  if (shouldQuery.length > 0) {
    mustQuery.push({
      bool: {
        should: shouldQuery
      }
    })
  }

  let mustNotQuery

  const accessQuery = []

  // FIXME: This is wrong!
  // if (!_.isUndefined(currentUser) && currentUser.handle) {
  //   accessQuery.push({ match_phrase: { createdBy: currentUser.handle } })
  // }

  if (_.isUndefined(currentUser)) {
    mustNotQuery = { exists: { field: 'groups' } }
  }

  if (criteria.memberId) {
    const ids = await helper.listChallengesByMember(criteria.memberId)
    accessQuery.push({ terms: { _id: ids } })
  }

  if (accessQuery.length > 0) {
    mustQuery.push({
      bool: {
        should: accessQuery
      }
    })
  }

  if (boolQuery.length > 0) {
    mustQuery.push({
      bool: {
        filter: boolQuery
      }
    })
  }

  const esQuery = {
    index: config.get('ES.CHALLENGE_ES_INDEX'),
    type: config.get('ES.CHALLENGE_ES_TYPE'),
    size: criteria.perPage,
    from: (criteria.page - 1) * criteria.perPage, // Es Index starts from 0
    body: {
      query: mustQuery.length > 0 || !_.isUndefined(mustNotQuery) ? {
        bool: {
          must: mustQuery,
          must_not: mustNotQuery
        }
      } : {
        match_all: {}
      },
      sort: [{ [sortByProp]: { 'order': sortOrderProp, 'missing': '_last', 'unmapped_type': 'String' } }]
    }
  }

  logger.info('Query Object', esQuery)

  // Search with constructed query
  let docs
  try {
    docs = await esClient.search(esQuery)
  } catch (e) {
    // Catch error when the ES is fresh and has no data
    docs = {
      hits: {
        total: 0,
        hits: []
      }
    }
  }
  // Extract data from hits
  const total = docs.hits.total
  let result = _.map(docs.hits.hits, item => item._source)
  result = await filterChallengesByGroupsAccess(currentUser, result)

  // Hide privateDescription for non-register challenges
  if (currentUser) {
    if (!currentUser.isMachine && !helper.hasAdminRole(currentUser)) {
      const ids = await helper.listChallengesByMember(currentUser.userId)
      result = _.each(result, (val) => {
        if (!_.includes(ids, val.id)) {
          _.unset(val, 'privateDescription')
        }
      })
    }
  } else {
    result = _.each(result, val => _.unset(val, 'privateDescription'))
  }

  const typeList = await challengeTypeService.searchChallengeTypes()
  const typeMap = new Map()
  _.each(typeList, e => {
    typeMap.set(e.id, e.name)
  })
  _.each(result, element => {
    element.type = typeMap.get(element.typeId) || 'Code'
  })
  _.each(result, async element => {
    await getPhasesAndPopulate(element)
  })

  return { total, page: criteria.page, perPage: criteria.perPage, result }
}

searchChallenges.schema = {
  currentUser: Joi.any(),
  criteria: Joi.object().keys({
    page: Joi.page(),
    perPage: Joi.perPage(),
    id: Joi.optionalId(),
    confidentialityType: Joi.string(),
    directProjectId: Joi.number(),
    typeId: Joi.optionalId(),
    track: Joi.string(),
    name: Joi.string(),
    description: Joi.string(),
    timelineTemplateId: Joi.string(), // Joi.optionalId(),
    reviewType: Joi.string(),
    tag: Joi.string(),
    projectId: Joi.number().integer().positive(),
    forumId: Joi.number().integer().positive(),
    legacyId: Joi.number().integer().positive(),
    status: Joi.string().valid(_.values(constants.challengeStatuses)),
    group: Joi.string(),
    gitRepoURL: Joi.string().uri(),
    startDateStart: Joi.date(),
    startDateEnd: Joi.date(),
    endDateStart: Joi.date(),
    endDateEnd: Joi.date(),
    currentPhaseId: Joi.optionalId(),
    currentPhaseName: Joi.string(),
    createdDateStart: Joi.date(),
    createdDateEnd: Joi.date(),
    updatedDateStart: Joi.date(),
    updatedDateEnd: Joi.date(),
    createdBy: Joi.string(),
    updatedBy: Joi.string(),
    memberId: Joi.number().integer().positive(),
    sortBy: Joi.string().valid(_.values(constants.validChallengeParams)),
    sortOrder: Joi.string().valid(['asc', 'desc']),
    groups: Joi.array().items(Joi.optionalId()).unique().min(1)
  })
}

/**
 * Validate the challenge data.
 * @param {Object} challenge the challenge data
 */
async function validateChallengeData (challenge) {
  if (challenge.typeId) {
    try {
      await challengeTypeService.getChallengeType(challenge.typeId)
    } catch (e) {
      if (e.name === 'NotFoundError') {
        throw new errors.BadRequestError(`No challenge type found with id: ${challenge.typeId}.`)
      } else {
        throw e
      }
    }
  }
  if (challenge.timelineTemplateId) {
    const template = await timelineTemplateService.getTimelineTemplate(challenge.timelineTemplateId)
    if (!template.isActive) {
      throw new errors.BadRequestError(`The timeline template with id: ${challenge.timelineTemplateId} is inactive`)
    }
  }
}

/**
 * Populate challenge phases.
 * @param {Array} phases the phases to populate
 * @param {Date} startDate the challenge start date
 * @param {String} timelineTemplateId the timeline template id
 */
async function populatePhases (phases, startDate, timelineTemplateId) {
  if (!phases || phases.length === 0) {
    return
  }
  const template = timelineTemplateService.getTimelineTemplate(timelineTemplateId)
  const phaseDefinitions = await phaseService.searchPhases()
  // generate phase instance ids
  for (let i = 0; i < phases.length; i += 1) {
    phases[i].id = uuid()
  }
  for (let i = 0; i < phases.length; i += 1) {
    const phase = phases[i]
    const templatePhase = _.find(template.phases, (p) => p.phaseId === phase.phaseId)
    const phaseDefinition = _.find(phaseDefinitions, (p) => p.id === phase.phaseId)
    phase.name = _.get(phaseDefinition, 'name')
    phase.isOpen = false
    if (templatePhase) {
      // use default duration if not provided
      if (!phase.duration) {
        phase.duration = templatePhase.defaultDuration
      }
      // set predecessor
      if (templatePhase.predecessor) {
        const prePhase = _.find(phases, (p) => p.phaseId === templatePhase.predecessor)
        if (!prePhase) {
          throw new errors.BadRequestError(`Predecessor ${templatePhase.predecessor} not found from given phases.`)
        }
        phase.predecessor = prePhase.id
      }
    }
  }

  // calculate dates
  if (!startDate) {
    return
  }
  const done = []
  for (let i = 0; i < phases.length; i += 1) {
    done.push(false)
  }
  let doing = true
  while (doing) {
    doing = false
    for (let i = 0; i < phases.length; i += 1) {
      if (!done[i]) {
        const phase = phases[i]
        if (!phase.predecessor) {
          phase.scheduledStartDate = startDate
          phase.scheduledEndDate = moment(startDate).add(phase.duration || 0, 'seconds').toDate()
          phase.actualStartDate = phase.scheduledStartDate
          phase.actualEndDate = phase.scheduledEndDate
          done[i] = true
          doing = true
        } else {
          const preIndex = _.findIndex(phases, (p) => p.id === phase.predecessor)
          if (preIndex < 0) {
            throw new Error(`Invalid phase predecessor: ${phase.predecessor}`)
          }
          if (done[preIndex]) {
            phase.scheduledStartDate = phases[preIndex].scheduledEndDate
            phase.scheduledEndDate = moment(phase.scheduledStartDate).add(phase.duration || 0, 'seconds').toDate()
            phase.actualStartDate = phase.scheduledStartDate
            phase.actualEndDate = phase.scheduledEndDate
            done[i] = true
            doing = true
          }
        }
      }
    }
  }
  // validate that all dates are calculated
  for (let i = 0; i < phases.length; i += 1) {
    if (!done[i]) {
      throw new Error(`Invalid phase predecessor: ${phases[i].predecessor}`)
    }
  }
  phases.sort((a, b) => moment(a.scheduledStartDate).isAfter(b.scheduledStartDate))
}

/**
 * Create challenge.
 * @param {Object} currentUser the user who perform operation
 * @param {Object} challenge the challenge to created
 * @param {String} userToken the user token
 * @returns {Object} the created challenge
 */
async function createChallenge (currentUser, challenge, userToken) {
  await helper.ensureProjectExist(challenge.projectId, userToken)
  await validateChallengeData(challenge)
  if (challenge.phases && challenge.phases.length > 0) {
    await helper.validatePhases(challenge.phases)
  }
  helper.ensureNoDuplicateOrNullElements(challenge.tags, 'tags')
  helper.ensureNoDuplicateOrNullElements(challenge.groups, 'groups')
  helper.ensureNoDuplicateOrNullElements(challenge.terms, 'terms')

  // check groups authorization
  await ensureAccessibleByGroupsAccess(currentUser, challenge)

  // populate phases
  if (challenge.timelineTemplateId && challenge.phases && challenge.phases.length > 0) {
    await populatePhases(challenge.phases, challenge.startDate, challenge.timelineTemplateId)
  }

  // populate challenge terms
  const projectTerms = await helper.getProjectDefaultTerms(challenge.projectId)
  challenge.terms = await helper.getChallengeTerms(_.union(projectTerms, challenge.terms))

  if (challenge.phases && challenge.phases.length > 0) {
    challenge.endDate = helper.calculateChallengeEndDate(challenge)
  }
  const ret = await helper.create('Challenge', _.assign({
    id: uuid(),
    created: new Date(),
    createdBy: currentUser.handle || currentUser.sub,
    updated: new Date(),
    updatedBy: currentUser.handle || currentUser.sub
  }, challenge))
  ret.numOfSubmissions = 0
  ret.numOfRegistrants = 0
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeCreated, ret)

  // Create in ES
  await esClient.create({
    index: config.get('ES.CHALLENGE_ES_INDEX'),
    type: config.get('ES.CHALLENGE_ES_TYPE'),
    refresh: config.get('ES.ES_REFRESH'),
    id: ret.id,
    body: ret
  })
  return ret
}

createChallenge.schema = {
  currentUser: Joi.any(),
  challenge: Joi.object().keys({
    typeId: Joi.optionalId(),
    legacy: Joi.object().keys({
      track: Joi.string().required(),
      reviewType: Joi.string().required(),
      confidentialityType: Joi.string().default(config.DEFAULT_CONFIDENTIALITY_TYPE),
      forumId: Joi.number().integer().positive(),
      informixModified: Joi.string()
    }),
    name: Joi.string().required(),
    description: Joi.string(),
    privateDescription: Joi.string(),
    descriptionFormat: Joi.string(),
    metadata: Joi.array().items(Joi.object().keys({
      name: Joi.string().required(),
      value: Joi.string().required()
    })).unique((a, b) => a.name === b.name),
    timelineTemplateId: Joi.string(), // Joi.optionalId(),
    phases: Joi.array().items(Joi.object().keys({
      phaseId: Joi.id(),
      duration: Joi.number().positive()
    })),
    prizeSets: Joi.array().items(Joi.object().keys({
      type: Joi.string().valid(_.values(constants.prizeSetTypes)).required(),
      description: Joi.string(),
      prizes: Joi.array().items(Joi.object().keys({
        description: Joi.string(),
        type: Joi.string().required(),
        value: Joi.number().min(0).required()
      })).min(1).required()
    })),
    tags: Joi.array().items(Joi.string().required()), // tag names
    projectId: Joi.number().integer().positive().required(),
    legacyId: Joi.number().integer().positive(),
    startDate: Joi.date(),
    status: Joi.string().valid(_.values(constants.challengeStatuses)).required(),
    groups: Joi.array().items(Joi.string()), // group names
    gitRepoURLs: Joi.array().items(Joi.string().uri()),
    terms: Joi.array().items(Joi.optionalId()).default([])
  }).required(),
  userToken: Joi.any()
}

/**
 * Populate phase data from phase API.
 * @param {Object} the challenge entity
 */
async function getPhasesAndPopulate (data) {
  _.each(data.phases, async p => {
    const phase = await phaseService.getPhase(p.phaseId)
    p.name = phase.name
    if (phase.description) {
      p.description = phase.description
    }
  })
}

/**
 * Get challenge.
 * @param {Object} currentUser the user who perform operation
 * @param {String} id the challenge id
 * @returns {Object} the challenge with given id
 */
async function getChallenge (currentUser, id) {
  // get challenge from Elasticsearch
  let challenge
  try {
    challenge = await esClient.getSource({
      index: config.get('ES.CHALLENGE_ES_INDEX'),
      type: config.get('ES.CHALLENGE_ES_TYPE'),
      id
    })
  } catch (e) {
    if (e.statusCode === HttpStatus.NOT_FOUND) {
      throw new errors.NotFoundError(`Challenge of id ${id} is not found.`)
    } else {
      throw e
    }
  }
  // check groups authorization
  await ensureAccessibleByGroupsAccess(currentUser, challenge)
  // FIXME: Temporarily hard coded as the migrad
  // populate type property based on the typeId
  if (challenge.typeId) {
    try {
      const type = await challengeTypeService.getChallengeType(challenge.typeId)
      challenge.type = type.name
    } catch (e) {
      challenge.typeId = '45415132-79fa-4d13-a9ac-71f50020dc10'
      const type = await challengeTypeService.getChallengeType(challenge.typeId)
      challenge.type = type.name
    }
  }
  // delete challenge.typeId

  // Remove privateDescription for unregistered users
  if (currentUser) {
    if (!currentUser.isMachine) {
      const ids = await helper.listChallengesByMember(currentUser.userId)
      if (!_.includes(ids, challenge.id)) {
        _.unset(challenge, 'privateDescription')
      }
    }
  } else {
    _.unset(challenge, 'privateDescription')
  }

  if (challenge.phases && challenge.phases.length > 0) {
    await getPhasesAndPopulate(challenge)
  }

  return challenge
}

getChallenge.schema = {
  currentUser: Joi.any(),
  id: Joi.id()
}

/**
 * Check whether given two phases array are different.
 * @param {Array} phases the first phases array
 * @param {Array} otherPhases the second phases array
 * @returns {Boolean} true if different, false otherwise
 */
function isDifferentPhases (phases = [], otherPhases) {
  if (phases.length !== otherPhases.length) {
    return true
  } else {
    for (let i = 0; i < phases.length; i++) {
      if (!_.isEqual(phases[i], otherPhases[i])) {
        return true
      }
    }
    return false
  }
}

/**
 * Check whether given two Prize Array are the same.
 * @param {Array} prizes the first Prize Array
 * @param {Array} otherPrizes the second Prize Array
 * @returns {Boolean} true if the same, false otherwise
 */
function isSamePrizeArray (prizes, otherPrizes) {
  const length = otherPrizes.length
  if (prizes.length === otherPrizes.length) {
    let used = Array(length).fill(false)
    for (const prize of prizes) {
      let index = -1
      for (let i = 0; i < length; i++) {
        if (!used[i] && prize.description === otherPrizes[i].description &&
          prize.type === otherPrizes[i].type &&
          prize.value === otherPrizes[i].value) {
          used[i] = true
          index = i
          break
        }
      }
      if (index === -1) {
        return false
      }
    }
    return true
  } else {
    return false
  }
}

/**
 * Check whether given two PrizeSet Array are different.
 * @param {Array} prizeSets the first PrizeSet Array
 * @param {Array} otherPrizeSets the second PrizeSet Array
 * @returns {Boolean} true if different, false otherwise
 */
function isDifferentPrizeSets (prizeSets = [], otherPrizeSets) {
  const length = otherPrizeSets.length
  if (prizeSets.length === otherPrizeSets.length) {
    let used = Array(length).fill(false)
    for (const set of prizeSets) {
      let index = -1
      for (let i = 0; i < length; i++) {
        if (!used[i] && set.type === otherPrizeSets[i].type &&
          set.description === otherPrizeSets[i].description &&
          isSamePrizeArray(set.prizes, otherPrizeSets[i].prizes)) {
          used[i] = true
          index = i
          break
        }
      }
      if (index === -1) {
        return true
      }
    }
  }
  return false
}

/**
 * Validate the winners array.
 * @param {Array} winners the Winner Array
 */
function validateWinners (winners) {
  for (const winner of winners) {
    const diffWinners = _.differenceWith(winners, [winner], _.isEqual)
    if (diffWinners.length + 1 !== winners.length) {
      throw new errors.BadRequestError(`Duplicate member with placement: ${helper.toString(winner)}`)
    }

    // find another member with the placement
    const placementExists = _.find(diffWinners, function (w) { return w.placement === winner.placement })
    if (placementExists && (placementExists.userId !== winner.userId || placementExists.handle !== winner.handle)) {
      throw new errors.BadRequestError(`Only one member can have a placement: ${winner.placement}`)
    }

    // find another placement for a member
    const memberExists = _.find(diffWinners, function (w) { return w.userId === winner.userId })
    if (memberExists && memberExists.placement !== winner.placement) {
      throw new errors.BadRequestError(`The same member ${winner.userId} cannot have multiple placements`)
    }
  }
}

/**
 * Update challenge.
 * @param {Object} currentUser the user who perform operation
 * @param {String} challengeId the challenge id
 * @param {Object} data the challenge data to be updated
 * @param {String} userToken the user token
 * @param {Boolean} isFull the flag indicate it is a fully update operation.
 * @returns {Object} the updated challenge
 */
async function update (currentUser, challengeId, data, userToken, isFull) {
  if (data.projectId) {
    await helper.ensureProjectExist(data.projectId, userToken)
  }

  helper.ensureNoDuplicateOrNullElements(data.tags, 'tags')
  helper.ensureNoDuplicateOrNullElements(data.attachmentIds, 'attachmentIds')
  helper.ensureNoDuplicateOrNullElements(data.groups, 'groups')
  helper.ensureNoDuplicateOrNullElements(data.gitRepoURLs, 'gitRepoURLs')

  const challenge = await helper.getById('Challenge', challengeId)

  // FIXME: Tech Debt
  if (_.get(challenge, 'legacy.track') && _.get(data, 'legacy.track') && _.get(challenge, 'legacy.track') !== _.get(data, 'legacy.track')) {
    throw new errors.ForbiddenError('Cannot change legacy.track')
  }
  if (_.get(challenge, 'typeId') && _.get(data, 'typeId') && _.get(challenge, 'typeId') !== _.get(data, 'typeId')) {
    throw new errors.ForbiddenError('Cannot change typeId')
  }

  if (!_.isUndefined(challenge.legacy) && !_.isUndefined(data.legacy)) {
    _.extend(challenge.legacy, data.legacy)
  }

  // check groups authorization
  await ensureAccessibleByGroupsAccess(currentUser, challenge)

  // check groups access to be updated group values
  if (data.groups) {
    await ensureAcessibilityToModifiedGroups(currentUser, data, challenge)
  }

  let newAttachments
  if (isFull || !_.isUndefined(data.attachmentIds)) {
    newAttachments = await helper.getByIds('Attachment', data.attachmentIds || [])
  }

  if (!currentUser.isMachine && !helper.hasAdminRole(currentUser) && challenge.createdBy.toLowerCase() !== currentUser.handle.toLowerCase()) {
    throw new errors.ForbiddenError(`Only M2M, admin or challenge's copilot can perform modification.`)
  }

  // Validate the challenge terms
  let newTermsOfUse
  if (!_.isUndefined(data.terms)) {
    helper.ensureNoDuplicateOrNullElements(data.terms, 'terms')

    // Get the project default terms
    const defaultTerms = await helper.getProjectDefaultTerms(challenge.projectId)

    // Make sure that the default project terms were not removed
    const removedTerms = _.difference(defaultTerms, data.terms)
    if (removedTerms.length !== 0) {
      throw new errors.BadRequestError(`Default project terms ${removedTerms} should not be removed`)
    }
    newTermsOfUse = await helper.getChallengeTerms(_.union(data.terms, defaultTerms))
  }

  // find out attachment ids to delete
  const attachmentIdsToDelete = []
  if (isFull || !_.isUndefined(data.attachmentIds)) {
    _.forEach(challenge.attachments || [], (attachment) => {
      if (!_.find(data.attachmentIds || [], (id) => id === attachment.id)) {
        attachmentIdsToDelete.push(attachment.id)
      }
    })
  }

  await validateChallengeData(data)
  if ((challenge.status === constants.challengeStatuses.Completed || challenge.status === constants.challengeStatuses.Cancelled) && data.status && data.status !== challenge.status) {
    throw new errors.BadRequestError(`Cannot change ${challenge.status} challenge status to ${data.status} status`)
  }

  if (data.winners && (challenge.status !== constants.challengeStatuses.Completed && data.status !== constants.challengeStatuses.Completed)) {
    throw new errors.BadRequestError(`Cannot set winners for challenge with non-completed ${challenge.status} status`)
  }

  if (data.phases || data.startDate) {
    const newPhases = data.phases || challenge.phases
    const newStartDate = data.startDate || challenge.startDate

    await helper.validatePhases(newPhases)
    // populate phases
    await populatePhases(newPhases, newStartDate, data.timelineTemplateId || challenge.timelineTemplateId)
    data.phases = newPhases
    data.startDate = newStartDate
    data.endDate = helper.calculateChallengeEndDate(challenge, data)
  }

  if (data.winners && data.winners.length) {
    await validateWinners(data.winners)
  }

  data.updated = new Date()
  data.updatedBy = currentUser.handle || currentUser.sub
  const updateDetails = {}
  const auditLogs = []
  _.each(data, (value, key) => {
    let op
    if (key === 'metadata') {
      if (_.isUndefined(challenge[key]) || challenge[key].length !== value.length ||
        _.differenceWith(challenge[key], value, _.isEqual).length !== 0) {
        op = '$PUT'
      }
    } else if (key === 'phases') {
      if (isDifferentPhases(challenge[key], value)) {
        logger.info('update phases')
        op = '$PUT'
      }
    } else if (key === 'prizeSets') {
      if (isDifferentPrizeSets(challenge[key], value)) {
        logger.info('update prize sets')
        op = '$PUT'
      }
    } else if (key === 'tags') {
      if (_.isUndefined(challenge[key]) || challenge[key].length !== value.length ||
        _.intersection(challenge[key], value).length !== value.length) {
        op = '$PUT'
      }
    } else if (key === 'attachmentIds') {
      const oldIds = _.map(challenge.attachments || [], (a) => a.id)
      if (oldIds.length !== value.length ||
        _.intersection(oldIds, value).length !== value.length) {
        op = '$PUT'
      }
    } else if (key === 'groups') {
      if (_.isUndefined(challenge[key]) || challenge[key].length !== value.length ||
        _.intersection(challenge[key], value).length !== value.length) {
        op = '$PUT'
      }
    } else if (key === 'gitRepoURLs') {
      if (_.isUndefined(challenge[key]) || challenge[key].length !== value.length ||
        _.intersection(challenge[key], value).length !== value.length) {
        op = '$PUT'
      }
    } else if (key === 'winners') {
      if (_.isUndefined(challenge[key]) || challenge[key].length !== value.length ||
      _.intersectionWith(challenge[key], value, _.isEqual).length !== value.length) {
        op = '$PUT'
      }
    } else if (key === 'terms') {
      const oldIds = _.map(challenge.terms || [], (t) => t.id)
      if (oldIds.length !== value.length ||
        _.intersection(oldIds, value).length !== value.length) {
        op = '$PUT'
      }
    } else if (_.isUndefined(challenge[key]) || challenge[key] !== value) {
      op = '$PUT'
    }

    if (op) {
      if (_.isUndefined(updateDetails[op])) {
        updateDetails[op] = {}
      }
      if (key === 'attachmentIds') {
        updateDetails[op].attachments = newAttachments
      } else if (key === 'terms') {
        updateDetails[op].terms = newTermsOfUse
      } else {
        updateDetails[op][key] = value
      }
      if (key !== 'updated' && key !== 'updatedBy') {
        let oldValue
        let newValue
        if (key === 'attachmentIds') {
          oldValue = challenge.attachments ? JSON.stringify(challenge.attachments) : 'NULL'
          newValue = JSON.stringify(newAttachments)
        } else if (key === 'terms') {
          oldValue = challenge.terms ? JSON.stringify(challenge.terms) : 'NULL'
          newValue = JSON.stringify(newTermsOfUse)
        } else {
          oldValue = challenge[key] ? JSON.stringify(challenge[key]) : 'NULL'
          newValue = JSON.stringify(value)
        }
        logger.debug(`Audit Log: Key ${key} OldValue: ${oldValue} NewValue: ${newValue}`)
        auditLogs.push({
          id: uuid(),
          challengeId,
          fieldName: key,
          oldValue,
          newValue,
          created: new Date(),
          createdBy: currentUser.handle || currentUser.sub,
          memberId: currentUser.userId || null
        })
      }
    }
  })

  if (isFull && _.isUndefined(data.metadata) && challenge.metadata) {
    updateDetails['$DELETE'] = { metadata: null }
    auditLogs.push({
      id: uuid(),
      challengeId,
      fieldName: 'metadata',
      oldValue: JSON.stringify(challenge.metadata),
      newValue: 'NULL',
      created: new Date(),
      createdBy: currentUser.handle || currentUser.sub,
      memberId: currentUser.userId || null
    })
    delete challenge.metadata
    // send null to Elasticsearch to clear the field
    data.metadata = null
  }
  if (isFull && _.isUndefined(data.attachmentIds) && challenge.attachments) {
    if (!updateDetails['$DELETE']) {
      updateDetails['$DELETE'] = {}
    }
    updateDetails['$DELETE'].attachments = null
    auditLogs.push({
      id: uuid(),
      challengeId,
      fieldName: 'attachments',
      oldValue: JSON.stringify(challenge.attachments),
      newValue: 'NULL',
      created: new Date(),
      createdBy: currentUser.handle || currentUser.sub,
      memberId: currentUser.userId || null
    })
    delete challenge.attachments
    // send null to Elasticsearch to clear the field
    data.attachments = null
  }
  if (isFull && _.isUndefined(data.groups) && challenge.groups) {
    if (!updateDetails['$DELETE']) {
      updateDetails['$DELETE'] = {}
    }
    updateDetails['$DELETE'].groups = null
    auditLogs.push({
      id: uuid(),
      challengeId,
      fieldName: 'groups',
      oldValue: JSON.stringify(challenge.groups),
      newValue: 'NULL',
      created: new Date(),
      createdBy: currentUser.handle || currentUser.sub,
      memberId: currentUser.userId || null
    })
    delete challenge.groups
    // send null to Elasticsearch to clear the field
    data.groups = null
  }
  if (isFull && _.isUndefined(data.gitRepoURLs) && challenge.gitRepoURLs) {
    if (!updateDetails['$DELETE']) {
      updateDetails['$DELETE'] = {}
    }
    updateDetails['$DELETE'].gitRepoURLs = null
    auditLogs.push({
      id: uuid(),
      challengeId,
      fieldName: 'gitRepoURLs',
      oldValue: JSON.stringify(challenge.gitRepoURLs),
      newValue: 'NULL',
      created: new Date(),
      createdBy: currentUser.handle || currentUser.sub,
      memberId: currentUser.userId || null
    })
    delete challenge.gitRepoURLs
    // send null to Elasticsearch to clear the field
    data.gitRepoURLs = null
  }
  if (isFull && _.isUndefined(data.legacyId) && challenge.legacyId) {
    if (!updateDetails['$DELETE']) {
      updateDetails['$DELETE'] = {}
    }
    updateDetails['$DELETE'].legacyId = null
    auditLogs.push({
      id: uuid(),
      challengeId,
      fieldName: 'legacyId',
      oldValue: JSON.stringify(challenge.legacyId),
      newValue: 'NULL',
      created: new Date(),
      createdBy: currentUser.handle || currentUser.sub,
      memberId: currentUser.userId || null
    })
    delete challenge.legacyId
    // send null to Elasticsearch to clear the field
    data.legacyId = null
  }
  if (isFull && _.isUndefined(data.winners) && challenge.winners) {
    if (!updateDetails['$DELETE']) {
      updateDetails['$DELETE'] = {}
    }
    updateDetails['$DELETE'].winners = null
    auditLogs.push({
      id: uuid(),
      challengeId,
      fieldName: 'winners',
      oldValue: JSON.stringify(challenge.winners),
      newValue: 'NULL',
      created: new Date(),
      createdBy: currentUser.handle || currentUser.sub,
      memberId: currentUser.userId || null
    })
    delete challenge.winners
    // send null to Elasticsearch to clear the field
    data.winners = null
  }

  logger.debug(`Challenge.update id: ${challengeId} Details:  ${JSON.stringify(updateDetails)}`)
  await models.Challenge.update({ id: challengeId }, updateDetails)

  if (auditLogs.length > 0) {
    await models.AuditLog.batchPut(auditLogs)
  }

  delete data.attachmentIds
  delete data.terms
  if (data.phases) {
    _.each(data.phases, p => {
      delete p.name
      if (p.description) {
        delete p.description
      }
    })
  }
  _.assign(challenge, data)
  if (!_.isUndefined(newAttachments)) {
    challenge.attachments = newAttachments
    data.attachments = newAttachments
  }

  if (!_.isUndefined(newTermsOfUse)) {
    challenge.terms = newTermsOfUse
    data.terms = newTermsOfUse
  }

  // delete unused attachments
  for (const attachmentId of attachmentIdsToDelete) {
    await helper.deleteFromS3(attachmentId)
    const attachment = await helper.getById('Attachment', attachmentId)
    await attachment.delete()
  }

  if (challenge.phases && challenge.phases.length > 0) {
    await getPhasesAndPopulate(challenge)
  }

  // post bus event
  logger.debug(`Post Bus Event: ${constants.Topics.ChallengeUpdated} ${JSON.stringify(challenge)}`)
  await helper.postBusEvent(constants.Topics.ChallengeUpdated, challenge)

  if (challenge.phases && challenge.phases.length > 0) {
    challenge.currentPhase = challenge.phases.slice().reverse().find(phase => phase.isOpen)
    challenge.endDate = helper.calculateChallengeEndDate(challenge)
  }
  // Update ES
  await esClient.update({
    index: config.get('ES.CHALLENGE_ES_INDEX'),
    type: config.get('ES.CHALLENGE_ES_TYPE'),
    refresh: config.get('ES.ES_REFRESH'),
    id: challengeId,
    body: {
      doc: challenge
    }
  })
  return challenge
}

/**
 * Fully update challenge.
 * @param {Object} currentUser the user who perform operation
 * @param {String} challengeId the challenge id
 * @param {Object} data the challenge data to be updated
 * @param {String} userToken the user token
 * @returns {Object} the updated challenge
 */
async function fullyUpdateChallenge (currentUser, challengeId, data, userToken) {
  return update(currentUser, challengeId, data, userToken, true)
}

fullyUpdateChallenge.schema = {
  currentUser: Joi.any(),
  challengeId: Joi.id(),
  data: Joi.object().keys({
    legacy: Joi.object().keys({
      track: Joi.string(),
      reviewType: Joi.string(),
      confidentialityType: Joi.string().default(config.DEFAULT_CONFIDENTIALITY_TYPE),
      directProjectId: Joi.number(),
      forumId: Joi.number().integer().positive(),
      informixModified: Joi.string()
    }),
    typeId: Joi.optionalId(),
    name: Joi.string().required(),
    description: Joi.string(),
    privateDescription: Joi.string(),
    descriptionFormat: Joi.string(),
    metadata: Joi.array().items(Joi.object().keys({
      name: Joi.string().required(),
      value: Joi.string().required()
    })).unique((a, b) => a.name === b.name),
    timelineTemplateId: Joi.string(), // Joi.optionalId(),
    phases: Joi.array().items(Joi.object().keys({
      phaseId: Joi.id(),
      duration: Joi.number().positive()
    })),
    prizeSets: Joi.array().items(Joi.object().keys({
      type: Joi.string().valid(_.values(constants.prizeSetTypes)).required(),
      description: Joi.string(),
      prizes: Joi.array().items(Joi.object().keys({
        description: Joi.string(),
        type: Joi.string().required(),
        value: Joi.number().min(0).required()
      })).min(1).required()
    })),
    tags: Joi.array().items(Joi.string().required()), // tag names
    projectId: Joi.number().integer().positive().required(),
    legacyId: Joi.number().integer().positive(),
    startDate: Joi.date(),
    status: Joi.string().valid(_.values(constants.challengeStatuses)).required(),
    attachmentIds: Joi.array().items(Joi.optionalId()),
    groups: Joi.array().items(Joi.string()), // group names
    gitRepoURLs: Joi.array().items(Joi.string().uri()),
    winners: Joi.array().items(Joi.object().keys({
      userId: Joi.number().integer().positive().required(),
      handle: Joi.string().required(),
      placement: Joi.number().integer().positive().required()
    })).min(1),
    terms: Joi.array().items(Joi.id().optional()).optional().allow([])
  }).required(),
  userToken: Joi.any()
}

/**
 * Partially update challenge.
 * @param {Object} currentUser the user who perform operation
 * @param {String} challengeId the challenge id
 * @param {Object} data the challenge data to be updated
 * @param {String} userToken the user token
 * @returns {Object} the updated challenge
 */
async function partiallyUpdateChallenge (currentUser, challengeId, data, userToken) {
  return update(currentUser, challengeId, data, userToken)
}

partiallyUpdateChallenge.schema = {
  currentUser: Joi.any(),
  challengeId: Joi.id(),
  data: Joi.object().keys({
    legacy: Joi.object().keys({
      track: Joi.string(),
      reviewType: Joi.string(),
      confidentialityType: Joi.string().default(config.DEFAULT_CONFIDENTIALITY_TYPE),
      directProjectId: Joi.number(),
      forumId: Joi.number().integer().positive(),
      informixModified: Joi.string()
    }),
    typeId: Joi.optionalId(),
    name: Joi.string(),
    description: Joi.string(),
    privateDescription: Joi.string(),
    descriptionFormat: Joi.string(),
    metadata: Joi.array().items(Joi.object().keys({
      name: Joi.string().required(),
      value: Joi.string().required()
    })).unique((a, b) => a.name === b.name),
    timelineTemplateId: Joi.string(), // changing this to update migrated challenges
    phases: Joi.array().items(Joi.object().keys({
      phaseId: Joi.id(),
      duration: Joi.number().positive()
    })).min(1),
    startDate: Joi.date(),
    prizeSets: Joi.array().items(Joi.object().keys({
      type: Joi.string().valid(_.values(constants.prizeSetTypes)).required(),
      description: Joi.string(),
      prizes: Joi.array().items(Joi.object().keys({
        description: Joi.string(),
        type: Joi.string().required(),
        value: Joi.number().min(0).required()
      })).min(1).required()
    })).min(1),
    tags: Joi.array().items(Joi.string().required()).min(1), // tag names
    projectId: Joi.number().integer().positive(),
    legacyId: Joi.number().integer().positive(),
    status: Joi.string().valid(_.values(constants.challengeStatuses)),
    attachmentIds: Joi.array().items(Joi.optionalId()),
    groups: Joi.array().items(Joi.string()), // group names
    gitRepoURLs: Joi.array().items(Joi.string().uri()),
    winners: Joi.array().items(Joi.object().keys({
      userId: Joi.number().integer().positive().required(),
      handle: Joi.string().required(),
      placement: Joi.number().integer().positive().required()
    })).min(1),
    terms: Joi.array().items(Joi.id().optional()).optional().allow([])
  }).required(),
  userToken: Joi.any()
}

module.exports = {
  searchChallenges,
  createChallenge,
  getChallenge,
  fullyUpdateChallenge,
  partiallyUpdateChallenge
}

logger.buildService(module.exports)
