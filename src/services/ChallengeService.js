/**
 * This service provides operations of challenge.
 */

const _ = require('lodash')
const Joi = require('joi')
const uuid = require('uuid/v4')
const config = require('config')
const xss = require('xss')
const helper = require('../common/helper')
const logger = require('../common/logger')
const errors = require('../common/errors')
const constants = require('../../app-constants')
const models = require('../models')
const HttpStatus = require('http-status-codes')
const moment = require('moment')
const PhaseService = require('./PhaseService')
const ChallengeTypeService = require('./ChallengeTypeService')
const ChallengeTrackService = require('./ChallengeTrackService')
const ChallengeTimelineTemplateService = require('./ChallengeTimelineTemplateService')

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
  const subGroupsMap = {}
  for (const challenge of challenges) {
    challenge.groups = _.filter(challenge.groups, g => !_.includes(['null', 'undefined'], _.toString(g).toLowerCase()))
    let expandedGroups = []
    if (!challenge.groups || _.get(challenge, 'groups.length', 0) === 0 || !needToCheckForGroupAccess) {
      res.push(challenge)
    } else if (currentUser) {
      // get user groups if not yet
      if (_.isNil(userGroups)) {
        userGroups = await helper.getUserGroups(currentUser.userId)
      }
      // Expand challenge groups by subGroups
      // results are being saved on a hashmap for efficiency
      for (const group of challenge.groups) {
        let subGroups
        if (subGroupsMap[group]) {
          subGroups = subGroupsMap[group]
        } else {
          subGroups = await helper.expandWithSubGroups(group)
          subGroupsMap[group] = subGroups
        }
        expandedGroups = [
          ..._.concat(expandedGroups, subGroups)
        ]
      }
      // check if there is matched group
      // logger.debug('Groups', challenge.groups, userGroups)
      if (_.find(expandedGroups, (group) => !!_.find(userGroups, (ug) => ug.id === group))) {
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
  const needToCheckForGroupAccess = !currentUser ? true : !currentUser.isMachine && !helper.hasAdminRole(currentUser)
  if (!needToCheckForGroupAccess) {
    return
  }
  const userGroups = await helper.getUserGroups(currentUser.userId)
  const userGroupsIds = _.map(userGroups, group => group.id)
  const updatedGroups = _.difference(_.union(challenge.groups, data.groups), _.intersection(challenge.groups, data.groups))
  const filtered = updatedGroups.filter(g => !userGroupsIds.includes(g))
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

  const page = criteria.page || 1
  const perPage = criteria.perPage || 20
  const boolQuery = []
  let sortByScore = false
  const matchPhraseKeys = [
    'id',
    'timelineTemplateId',
    'projectId',
    'legacyId',
    'status',
    'createdBy',
    'updatedBy'
  ]

  const includedTrackIds = _.isArray(criteria.trackIds) ? criteria.trackIds : []

  const includedTypeIds = _.isArray(criteria.typeIds) ? criteria.typeIds : []

  if (criteria.type) {
    const typeSearchRes = await ChallengeTypeService.searchChallengeTypes({ abbreviation: criteria.type })
    if (typeSearchRes.total > 0) {
      criteria.typeId = _.get(typeSearchRes, 'result[0].id')
    }
  }
  if (criteria.track) {
    const trackSearchRes = await ChallengeTrackService.searchChallengeTracks({ abbreviation: criteria.track })
    if (trackSearchRes.total > 0) {
      criteria.trackId = _.get(trackSearchRes, 'result[0].id')
    }
  }

  if (criteria.types) {
    for (const t of criteria.types) {
      const typeSearchRes = await ChallengeTypeService.searchChallengeTypes({ abbreviation: t })
      if (typeSearchRes.total > 0) {
        includedTypeIds.push(_.get(typeSearchRes, 'result[0].id'))
      }
    }
  }
  if (criteria.tracks) {
    for (const t of criteria.tracks) {
      const trackSearchRes = await ChallengeTrackService.searchChallengeTracks({ abbreviation: t })
      if (trackSearchRes.total > 0) {
        includedTrackIds.push(_.get(trackSearchRes, 'result[0].id'))
      }
    }
  }

  if (criteria.typeId) {
    includedTypeIds.push(criteria.typeId)
  }
  if (criteria.trackId) {
    includedTrackIds.push(criteria.trackId)
  }

  _.forIn(_.pick(criteria, matchPhraseKeys), (value, key) => {
    if (!_.isUndefined(value)) {
      const filter = { match_phrase: {} }
      filter.match_phrase[key] = value
      boolQuery.push(filter)
    }
  })

  _.forEach(_.keys(criteria), (key) => {
    if (_.toString(key).indexOf('meta.') > -1) {
      // Parse and use metadata key
      if (!_.isUndefined(criteria[key])) {
        const metaKey = key.split('meta.')[1]
        boolQuery.push({
          bool: {
            must: [
              { match_phrase: { 'metadata.name': metaKey } },
              { match_phrase: { 'metadata.value': _.toString(criteria[key]) } }
            ]
          }
        })
      }
    }
  })

  if (includedTypeIds.length > 0) {
    boolQuery.push({
      bool: {
        should: _.map(includedTypeIds, t => ({ match_phrase: { typeId: t } }))
      }
    })
  }

  if (includedTrackIds.length > 0) {
    boolQuery.push({
      bool: {
        should: _.map(includedTrackIds, t => ({ match_phrase: { trackId: t } }))
      }
    })
  }

  if (criteria.search) {
    boolQuery.push({
      bool: {
        should: [
          { match_phrase_prefix: { 'name': criteria.search } },
          { match_phrase_prefix: { 'description': criteria.search } },
          { match_phrase_prefix: { 'tags': criteria.search } }
        ]
      }
    })
  } else {
    if (criteria.name) {
      boolQuery.push({ bool: {
        should: [
          { wildcard: { name: `*${criteria.name}*` } },
          { wildcard: { name: `${criteria.name}*` } },
          { wildcard: { name: `*${criteria.name}` } }
        ]
      } })
    }

    if (criteria.description) {
      boolQuery.push({ match_phrase_prefix: { 'description': criteria.description } })
    }
  }

  // 'search', 'name', 'description' fields should be sorted by function score unless sortBy param provided.
  if (!criteria.sortBy && (
    criteria.search ||
      criteria.name ||
      criteria.description
  )) {
    sortByScore = true
  }

  if (criteria.tag) {
    boolQuery.push({ match_phrase: { tags: criteria.tag } })
  }

  if (criteria.tags) {
    boolQuery.push({
      bool: {
        [criteria.includeAllTags ? 'must' : 'should']: _.map(criteria.tags, t => ({ match_phrase: { tags: t } }))
      }
    })
  }

  if (criteria.forumId) {
    boolQuery.push({ match_phrase: { 'legacy.forumId': criteria.forumId } })
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
  if (criteria.currentPhaseName) {
    boolQuery.push({ match_phrase: { 'currentPhaseNames': criteria.currentPhaseName } })
  }
  if (criteria.createdDateStart) {
    boolQuery.push({ range: { created: { gte: criteria.createdDateStart } } })
  }
  if (criteria.createdDateEnd) {
    boolQuery.push({ range: { created: { lte: criteria.createdDateEnd } } })
  }
  if (criteria.registrationStartDateStart) {
    boolQuery.push({ range: { registrationStartDate: { gte: criteria.registrationStartDateStart } } })
  }
  if (criteria.registrationStartDateEnd) {
    boolQuery.push({ range: { registrationStartDate: { lte: criteria.registrationStartDateEnd } } })
  }
  if (criteria.registrationEndDateStart) {
    boolQuery.push({ range: { registrationEndDate: { gte: criteria.registrationEndDateStart } } })
  }
  if (criteria.registrationEndDateEnd) {
    boolQuery.push({ range: { registrationEndDate: { lte: criteria.registrationEndDateEnd } } })
  }
  if (criteria.submissionStartDateStart) {
    boolQuery.push({ range: { submissionStartDate: { gte: criteria.submissionStartDateStart } } })
  }
  if (criteria.submissionStartDateEnd) {
    boolQuery.push({ range: { submissionStartDate: { lte: criteria.submissionStartDateEnd } } })
  }
  if (criteria.submissionEndDateStart) {
    boolQuery.push({ range: { submissionEndDate: { gte: criteria.submissionEndDateStart } } })
  }
  if (criteria.submissionEndDateEnd) {
    boolQuery.push({ range: { submissionEndDate: { lte: criteria.submissionEndDateEnd } } })
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

  let sortByProp = criteria.sortBy ? criteria.sortBy : 'created'
  const sortOrderProp = criteria.sortOrder ? criteria.sortOrder : 'desc'

  const mustQuery = []

  const groupsQuery = []

  if (criteria.events) {
    boolQuery.push({
      bool: {
        [criteria.includeAllEvents ? 'must' : 'should']: _.map(criteria.events, e => ({ match_phrase: { 'events.key': e } }))
      }
    })
  }

  const mustNotQuery = []

  let groupsToFilter = []
  let accessibleGroups = []

  if (currentUser && !currentUser.isMachine && !helper.hasAdminRole(currentUser)) {
    accessibleGroups = await helper.getCompleteUserGroupTreeIds(currentUser.userId)
  }

  // Filter all groups from the criteria to make sure the user can access those
  if (!_.isUndefined(criteria.group) || !_.isUndefined(criteria.groups)) {
    // check group access
    if (_.isUndefined(currentUser)) {
      throw new errors.BadRequestError('Authentication is required to filter challenges based on groups')
    }
    if (!currentUser.isMachine && !helper.hasAdminRole(currentUser)) {
      if (accessibleGroups.includes(criteria.group)) {
        groupsToFilter.push(criteria.group)
      }
      if (criteria.groups && criteria.groups.length > 0) {
        _.each(criteria.groups, (g) => {
          if (accessibleGroups.includes(g)) {
            groupsToFilter.push(g)
          }
        })
      }
    } else {
      groupsToFilter = [
        ...(criteria.groups ? criteria.groups : [])
      ]
      if (criteria.group) {
        groupsToFilter.push(criteria.group)
      }
    }
    groupsToFilter = _.uniq(groupsToFilter)

    if (groupsToFilter.length === 0) {
      // User can't access any of the groups from the filters
      // We return an empty array as the result
      return { total: 0, page, perPage, result: [] }
    }
  }

  if (groupsToFilter.length === 0) {
    // Return public challenges + challenges from groups that the user has access to
    if (_.isUndefined(currentUser)) {
      // If the user is not authenticated, only query challenges that don't have a group
      mustNotQuery.push({ exists: { field: 'groups' } })
    } else if (!currentUser.isMachine && !helper.hasAdminRole(currentUser)) {
      // If the user is not M2M and is not an admin, return public + challenges from groups the user can access
      _.each(accessibleGroups, (g) => {
        groupsQuery.push({ match_phrase: { groups: g } })
      })
      // include public challenges
      groupsQuery.push({ bool: { must_not: { exists: { field: 'groups' } } } })
    }
  } else {
    _.each(groupsToFilter, (g) => {
      groupsQuery.push({ match_phrase: { groups: g } })
    })
  }

  if (criteria.ids) {
    boolQuery.push({
      bool: {
        should: _.map(criteria.ids, id => ({ match_phrase: { _id: id } }))
      }
    })
  }

  const accessQuery = []
  let memberChallengeIds

  // FIXME: This is wrong!
  // if (!_.isUndefined(currentUser) && currentUser.handle) {
  //   accessQuery.push({ match_phrase: { createdBy: currentUser.handle } })
  // }

  if (criteria.memberId) {
    // logger.error(`memberId ${criteria.memberId}`)
    memberChallengeIds = await helper.listChallengesByMember(criteria.memberId)
    // logger.error(`response ${JSON.stringify(ids)}`)
    accessQuery.push({ terms: { _id: memberChallengeIds } })
  } else if (currentUser && !helper.hasAdminRole(currentUser) && !_.get(currentUser, 'isMachine', false)) {
    memberChallengeIds = await helper.listChallengesByMember(currentUser.userId)
  }

  if (accessQuery.length > 0) {
    mustQuery.push({
      bool: {
        should: accessQuery
      }
    })
  }

  // FIXME: Tech Debt
  let excludeTasks = true
  // if you're an admin or m2m, security rules wont be applied
  if (currentUser && (helper.hasAdminRole(currentUser) || _.get(currentUser, 'isMachine', false))) {
    excludeTasks = false
  }

  /**
   * For non-authenticated users:
   * - Only unassigned tasks will be returned
   * For authenticated users (non-admin):
   * - Only unassigned tasks and tasks assigned to the logged in user will be returned
   * For admins/m2m:
   * - All tasks will be returned
   */
  if (currentUser && (helper.hasAdminRole(currentUser) || _.get(currentUser, 'isMachine', false))) {
    // For admins/m2m, allow filtering based on task properties
    if (criteria.isTask) {
      boolQuery.push({ match_phrase: { 'task.isTask': criteria.isTask } })
    }
    if (criteria.taskIsAssigned) {
      boolQuery.push({ match_phrase: { 'task.isAssigned': criteria.taskIsAssigned } })
    }
    if (criteria.taskMemberId || criteria.memberId) {
      boolQuery.push({ match_phrase: { 'task.memberId': criteria.taskMemberId || criteria.memberId } })
    }
  } else if (excludeTasks) {
    mustQuery.push({
      bool: {
        should: [
          ...(_.get(memberChallengeIds, 'length', 0) > 0 ? [{ bool: { should: [ { terms: { _id: memberChallengeIds } } ] } }] : []),
          { bool: { must_not: { exists: { field: 'task.isTask' } } } },
          { match_phrase: { 'task.isTask': false } },
          {
            bool: {
              must: [
                { match_phrase: { 'task.isTask': true } },
                { match_phrase: { 'task.isAssigned': false } }
              ]
            }
          },
          ...(
            currentUser && !helper.hasAdminRole(currentUser) && !_.get(currentUser, 'isMachine', false)
              ? [{ match_phrase: { 'task.memberId': currentUser.userId } }]
              : []
          )
        ]
      }
    })
  }

  if (groupsQuery.length > 0) {
    mustQuery.push({
      bool: {
        should: groupsQuery
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

  let finalQuery = {
    bool: {}
  }

  if (mustQuery.length > 0) {
    finalQuery.bool.must = mustQuery
  }
  if (mustNotQuery.length > 0) {
    finalQuery.bool.must_not = mustNotQuery
    if (!finalQuery.bool.must) {
      finalQuery.bool.must = mustQuery
    }
  }
  // if none of the above were set, match all
  if (!finalQuery.bool.must) {
    finalQuery = {
      match_all: {}
    }
  }

  const esQuery = {
    index: config.get('ES.ES_INDEX'),
    type: config.get('ES.ES_TYPE'),
    size: perPage,
    from: (page - 1) * perPage, // Es Index starts from 0
    body: {
      query: finalQuery,
      sort: [sortByScore ? { '_score': { 'order': 'desc' } } : { [sortByProp]: { 'order': sortOrderProp, 'missing': '_last', 'unmapped_type': 'String' } }]
    }
  }

  logger.debug(`es Query ${JSON.stringify(esQuery)}`)

  // Search with constructed query
  let docs
  try {
    docs = await esClient.search(esQuery)
  } catch (e) {
    // Catch error when the ES is fresh and has no data
    logger.error(`Query Error from ES ${JSON.stringify(e)}`)
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

  if (criteria.isLightweight === 'true') {
    result = _.each(result, val => {
      // _.unset(val, 'terms')
      _.unset(val, 'description')
      _.unset(val, 'privateDescription')
      return val
    })
  }

  const typeList = await helper.scan('ChallengeType')
  const typeMap = new Map()
  _.each(typeList, e => {
    typeMap.set(e.id, e.name)
  })
  _.each(result, element => {
    element.type = typeMap.get(element.typeId) || 'Code'
  })
  _.each(result, async element => {
    await getPhasesAndPopulate(element)
    if (element.status !== constants.challengeStatuses.Completed) {
      _.unset(element, 'winners')
    }
  })

  return { total, page, perPage, result }
}

searchChallenges.schema = {
  currentUser: Joi.any(),
  criteria: Joi.object().keys({
    page: Joi.page(),
    perPage: Joi.perPage(),
    id: Joi.optionalId(),
    confidentialityType: Joi.string(),
    directProjectId: Joi.number(),
    typeIds: Joi.array().items(Joi.optionalId()),
    trackIds: Joi.array().items(Joi.optionalId()),
    types: Joi.array().items(Joi.string()),
    tracks: Joi.array().items(Joi.string()),
    typeId: Joi.optionalId(),
    trackId: Joi.optionalId(),
    type: Joi.string(),
    track: Joi.string(),
    name: Joi.string(),
    search: Joi.string(),
    description: Joi.string(),
    timelineTemplateId: Joi.string(), // Joi.optionalId(),
    reviewType: Joi.string(),
    tag: Joi.string(),
    tags: Joi.array().items(Joi.string()),
    includeAllTags: Joi.boolean().default(true),
    projectId: Joi.number().integer().positive(),
    forumId: Joi.number().integer().positive(),
    legacyId: Joi.number().integer().positive(),
    status: Joi.string().valid(_.values(constants.challengeStatuses)),
    group: Joi.string(),
    startDateStart: Joi.date(),
    startDateEnd: Joi.date(),
    endDateStart: Joi.date(),
    endDateEnd: Joi.date(),
    currentPhaseName: Joi.string(),
    createdDateStart: Joi.date(),
    createdDateEnd: Joi.date(),
    updatedDateStart: Joi.date(),
    updatedDateEnd: Joi.date(),
    registrationStartDateStart: Joi.date(),
    registrationStartDateEnd: Joi.date(),
    registrationEndDateStart: Joi.date(),
    registrationEndDateEnd: Joi.date(),
    submissionStartDateStart: Joi.date(),
    submissionStartDateEnd: Joi.date(),
    submissionEndDateStart: Joi.date(),
    submissionEndDateEnd: Joi.date(),
    createdBy: Joi.string(),
    updatedBy: Joi.string(),
    isLightweight: Joi.boolean().default(false),
    memberId: Joi.string(),
    sortBy: Joi.string().valid(_.values(constants.validChallengeParams)),
    sortOrder: Joi.string().valid(['asc', 'desc']),
    groups: Joi.array().items(Joi.optionalId()).unique().min(1),
    ids: Joi.array().items(Joi.optionalId()).unique().min(1),
    isTask: Joi.boolean(),
    taskIsAssigned: Joi.boolean(),
    taskMemberId: Joi.string(),
    events: Joi.array().items(Joi.number()),
    includeAllEvents: Joi.boolean().default(true)
  }).unknown(true)
}

/**
 * Validate the challenge data.
 * @param {Object} challenge the challenge data
 */
async function validateChallengeData (challenge) {
  let type
  let track
  if (challenge.typeId) {
    try {
      type = await helper.getById('ChallengeType', challenge.typeId)
    } catch (e) {
      if (e.name === 'NotFoundError') {
        throw new errors.BadRequestError(`No challenge type found with id: ${challenge.typeId}.`)
      } else {
        throw e
      }
    }
  }
  if (challenge.trackId) {
    try {
      track = await helper.getById('ChallengeTrack', challenge.trackId)
    } catch (e) {
      if (e.name === 'NotFoundError') {
        throw new errors.BadRequestError(`No challenge track found with id: ${challenge.trackId}.`)
      } else {
        throw e
      }
    }
  }
  if (challenge.timelineTemplateId) {
    const template = await helper.getById('TimelineTemplate', challenge.timelineTemplateId)
    if (!template.isActive) {
      throw new errors.BadRequestError(`The timeline template with id: ${challenge.timelineTemplateId} is inactive`)
    }
  }
  return { type, track }
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
  if (_.isUndefined(timelineTemplateId)) {
    throw new errors.BadRequestError(`Invalid timeline template ID: ${timelineTemplateId}`)
  }
  const template = await helper.getById('TimelineTemplate', timelineTemplateId)
  const phaseDefinitions = await helper.scan('Phase')
  // generate phase instance ids
  for (let i = 0; i < phases.length; i += 1) {
    phases[i].id = uuid()
  }
  for (let i = 0; i < phases.length; i += 1) {
    const phase = phases[i]
    const templatePhase = _.find(template.phases, (p) => p.phaseId === phase.phaseId)
    const phaseDefinition = _.find(phaseDefinitions, (p) => p.id === phase.phaseId)
    phase.name = _.get(phaseDefinition, 'name')
    phase.isOpen = _.get(phase, 'isOpen', false)
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
  challenge.name = xss(challenge.name)
  challenge.description = xss(challenge.description)
  if (challenge.status === constants.challengeStatuses.Active) {
    throw new errors.BadRequestError('You cannot create an Active challenge. Please create a Draft challenge and then change the status to Active.')
  }
  await helper.ensureProjectExist(challenge.projectId, userToken)
  const { track, type } = await validateChallengeData(challenge)
  if (_.get(type, 'isTask')) {
    _.set(challenge, 'task.isTask', true)
    if (_.isUndefined(_.get(challenge, 'task.isAssigned'))) {
      _.set(challenge, 'task.isAssigned', false)
    }
    if (_.isUndefined(_.get(challenge, 'task.memberId'))) {
      _.set(challenge, 'task.memberId', null)
    } else {
      throw new errors.BadRequestError(`Cannot assign a member before the challenge gets created.`)
    }
  }
  if (challenge.discussions && challenge.discussions.length > 0) {
    for (let i = 0; i < challenge.discussions.length; i += 1) {
      challenge.discussions[i].id = uuid()
    }
  }
  if (challenge.phases && challenge.phases.length > 0) {
    await helper.validatePhases(challenge.phases)
  }
  helper.ensureNoDuplicateOrNullElements(challenge.tags, 'tags')
  helper.ensureNoDuplicateOrNullElements(challenge.groups, 'groups')
  // helper.ensureNoDuplicateOrNullElements(challenge.terms, 'terms')
  // helper.ensureNoDuplicateOrNullElements(challenge.events, 'events')

  // check groups authorization
  await ensureAccessibleByGroupsAccess(currentUser, challenge)

  // populate phases
  if (!challenge.timelineTemplateId) {
    if (challenge.typeId && challenge.trackId) {
      const [challengeTimelineTemplate] = await ChallengeTimelineTemplateService.searchChallengeTimelineTemplates({
        typeId: challenge.typeId,
        trackId: challenge.trackId,
        isDefault: true
      })
      if (!challengeTimelineTemplate) {
        throw new errors.BadRequestError(`The selected trackId ${challenge.trackId} and typeId: ${challenge.typeId} does not have a default timeline template. Please provide a timelineTemplateId`)
      }
      challenge.timelineTemplateId = challengeTimelineTemplate.timelineTemplateId
    } else {
      throw new errors.BadRequestError(`trackId and typeId are required to create a challenge`)
    }
  }
  if (challenge.timelineTemplateId && challenge.phases && challenge.phases.length > 0) {
    await populatePhases(challenge.phases, challenge.startDate, challenge.timelineTemplateId)
  }

  // populate challenge terms
  // const projectTerms = await helper.getProjectDefaultTerms(challenge.projectId)
  // challenge.terms = await helper.validateChallengeTerms(_.union(projectTerms, challenge.terms))
  // TODO - challenge terms returned from projects api don't have a role associated
  // this will need to be updated to associate project terms with a roleId
  challenge.terms = await helper.validateChallengeTerms(challenge.terms || [])

  // default the descriptionFormat
  if (!challenge.descriptionFormat) {
    challenge.descriptionFormat = 'markdown'
  }

  if (challenge.phases && challenge.phases.length > 0) {
    challenge.endDate = helper.calculateChallengeEndDate(challenge)
  }
  const ret = await helper.create('Challenge', _.assign({
    id: uuid(),
    created: moment().utc(),
    createdBy: currentUser.handle || currentUser.sub,
    updated: moment().utc(),
    updatedBy: currentUser.handle || currentUser.sub
  }, challenge))
  ret.numOfSubmissions = 0
  ret.numOfRegistrants = 0
  if (ret.phases && ret.phases.length > 0) {
    const registrationPhase = _.find(ret.phases, p => p.name === 'Registration')
    const submissionPhase = _.find(ret.phases, p => p.name === 'Submission')
    ret.currentPhaseNames = _.map(_.filter(ret.phases, p => p.isOpen === true), 'name')
    if (registrationPhase) {
      ret.registrationStartDate = registrationPhase.actualStartDate || registrationPhase.scheduledStartDate
      ret.registrationEndDate = registrationPhase.actualEndDate || registrationPhase.scheduledEndDate
    }
    if (submissionPhase) {
      ret.submissionStartDate = submissionPhase.actualStartDate || submissionPhase.scheduledStartDate
      ret.submissionEndDate = submissionPhase.actualEndDate || submissionPhase.scheduledEndDate
    }
  }

  if (track) {
    ret.track = track.name
  }
  if (type) {
    ret.type = type.name
  }

  // Create in ES
  await esClient.create({
    index: config.get('ES.ES_INDEX'),
    type: config.get('ES.ES_TYPE'),
    refresh: config.get('ES.ES_REFRESH'),
    id: ret.id,
    body: ret
  })

  // if created by a user, add user as a manager
  if (currentUser.handle) {
    logger.debug(`Adding user as manager ${currentUser.handle}`)
    await helper.createResource(ret.id, ret.createdBy, config.MANAGER_ROLE_ID)
  } else {
    logger.debug(`Not adding manager ${currentUser.sub} ${JSON.stringify(currentUser)}`)
  }

  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeCreated, ret)

  return ret
}

createChallenge.schema = {
  currentUser: Joi.any(),
  challenge: Joi.object().keys({
    typeId: Joi.id(),
    trackId: Joi.id(),
    legacy: Joi.object().keys({
      reviewType: Joi.string().required(),
      confidentialityType: Joi.string().default(config.DEFAULT_CONFIDENTIALITY_TYPE),
      forumId: Joi.number().integer(),
      directProjectId: Joi.number().integer(),
      screeningScorecardId: Joi.number().integer(),
      reviewScorecardId: Joi.number().integer(),
      isTask: Joi.boolean()
    }),
    task: Joi.object().keys({
      isTask: Joi.boolean().default(false),
      isAssigned: Joi.boolean().default(false),
      memberId: Joi.string().allow(null)
    }),
    name: Joi.string().required(),
    description: Joi.string(),
    privateDescription: Joi.string(),
    descriptionFormat: Joi.string(),
    metadata: Joi.array().items(Joi.object().keys({
      name: Joi.string().required(),
      value: Joi.required()
    })).unique((a, b) => a.name === b.name),
    timelineTemplateId: Joi.string(), // Joi.optionalId(),
    phases: Joi.array().items(Joi.object().keys({
      phaseId: Joi.id(),
      duration: Joi.number().positive()
    })),
    events: Joi.array().items(Joi.object().keys({
      id: Joi.number().required(),
      name: Joi.string(),
      key: Joi.string()
    })),
    discussions: Joi.array().items(Joi.object().keys({
      name: Joi.string().required(),
      type: Joi.string().required().valid(_.values(constants.DiscussionTypes)),
      provider: Joi.string().required(),
      url: Joi.string(),
      options: Joi.array().items(Joi.object())
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
    groups: Joi.array().items(Joi.optionalId()).unique(),
    // gitRepoURLs: Joi.array().items(Joi.string().uri()),
    terms: Joi.array().items(Joi.object().keys({
      id: Joi.id(),
      roleId: Joi.id()
    }))
  }).required(),
  userToken: Joi.any()
}

/**
 * Populate phase data from phase API.
 * @param {Object} the challenge entity
 */
async function getPhasesAndPopulate (data) {
  _.each(data.phases, async p => {
    const phase = await PhaseService.getPhase(p.phaseId)
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
  // logger.warn(JSON.stringify({
  //   index: config.get('ES.ES_INDEX'),
  //   type: config.get('ES.ES_TYPE'),
  //   _id: id
  // }))
  try {
    challenge = await esClient.getSource({
      index: config.get('ES.ES_INDEX'),
      type: config.get('ES.ES_TYPE'),
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
  // // FIXME: Temporarily hard coded as the migrad
  // // populate type property based on the typeId
  // if (challenge.typeId) {
  //   try {
  //     const type = await helper.getById('ChallengeType', challenge.typeId)
  //     challenge.type = type.name
  //   } catch (e) {
  //     challenge.typeId = '45415132-79fa-4d13-a9ac-71f50020dc10' // TODO Fix HardCode
  //     const type = await helper.getById('ChallengeType', challenge.typeId)
  //     challenge.type = type.name
  //   }
  // }
  // delete challenge.typeId

  let memberChallengeIds
  // Remove privateDescription for unregistered users
  if (currentUser) {
    if (!currentUser.isMachine) {
      memberChallengeIds = await helper.listChallengesByMember(currentUser.userId)
      if (!_.includes(memberChallengeIds, challenge.id)) {
        _.unset(challenge, 'privateDescription')
      }
    }
  } else {
    _.unset(challenge, 'privateDescription')
  }

  // Check if challenge is task and apply security rules
  if (_.get(challenge, 'task.isTask', false) && _.get(challenge, 'task.isAssigned', false)) {
    const canAccesChallenge = _.isUndefined(currentUser) ? false : _.includes((memberChallengeIds || []), challenge.id) || currentUser.isMachine || helper.hasAdminRole(currentUser)
    if (!canAccesChallenge) {
      throw new errors.ForbiddenError(`You don't have access to view this challenge`)
    }
  }

  if (challenge.phases && challenge.phases.length > 0) {
    await getPhasesAndPopulate(challenge)
  }

  if (challenge.status !== constants.challengeStatuses.Completed) {
    _.unset(challenge, 'winners')
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
 * Check whether given two PrizeSet Array are different.
 * @param {Array} prizeSets the first PrizeSet Array
 * @param {Array} otherPrizeSets the second PrizeSet Array
 * @returns {Boolean} true if different, false otherwise
 */
function isDifferentPrizeSets (prizeSets = [], otherPrizeSets = []) {
  return !_.isEqual(_.sortBy(prizeSets, 'type'), _.sortBy(otherPrizeSets, 'type'))
}

/**
 * Validate the winners array.
 * @param {Array} winners the Winner Array
 * @param {String} winchallengeIdners the challenge ID
 */
async function validateWinners (winners, challengeId) {
  const challengeResources = await helper.getChallengeResources(challengeId)
  const registrants = _.filter(challengeResources, r => r.roleId === config.SUBMITTER_ROLE_ID)
  for (const winner of winners) {
    if (!_.find(registrants, r => _.toString(r.memberId) === _.toString(winner.userId))) {
      throw new errors.BadRequestError(`Member with userId: ${winner.userId} is not registered on the challenge`)
    }
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
  // helper.ensureNoDuplicateOrNullElements(data.gitRepoURLs, 'gitRepoURLs')

  const challenge = await helper.getById('Challenge', challengeId)
  // FIXME: Tech Debt
  let billingAccountId
  if (data.status) {
    if (data.status === constants.challengeStatuses.Active) {
      if (_.isUndefined(_.get(challenge, 'legacy.directProjectId'))) {
        throw new errors.BadRequestError('You cannot activate the challenge as it has not been created on legacy yet. Please try again later or contact support.')
      }
      billingAccountId = await helper.getProjectBillingAccount(_.get(challenge, 'legacy.directProjectId'))
      // if activating a challenge, the challenge must have a billing account id
      if ((!billingAccountId || billingAccountId === null) &&
        challenge.status === constants.challengeStatuses.Draft) {
        throw new errors.BadRequestError('Cannot Activate this project, it has no active billing accounts.')
      }
    }
    if (data.status === constants.challengeStatuses.Completed) {
      if (challenge.status !== constants.challengeStatuses.Active) {
        throw new errors.BadRequestError('You cannot mark a Draft challenge as Completed')
      }
      billingAccountId = await helper.getProjectBillingAccount(_.get(challenge, 'legacy.directProjectId'))
    }
  }

  // FIXME: Tech Debt
  if (_.get(challenge, 'legacy.track') && _.get(data, 'legacy.track') && _.get(challenge, 'legacy.track') !== _.get(data, 'legacy.track')) {
    throw new errors.ForbiddenError('Cannot change legacy.track')
  }
  if (_.get(challenge, 'trackId') && _.get(data, 'trackId') && _.get(challenge, 'trackId') !== _.get(data, 'trackId')) {
    throw new errors.ForbiddenError('Cannot change trackId')
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

  const userHasFullAccess = await helper.userHasFullAccess(challengeId, currentUser.userId)
  if (!currentUser.isMachine && !helper.hasAdminRole(currentUser) && challenge.createdBy.toLowerCase() !== currentUser.handle.toLowerCase() && !userHasFullAccess) {
    throw new errors.ForbiddenError(`Only M2M, admin, challenge's copilot or users with full access can perform modification.`)
  }

  // Only M2M can update url and options of discussions
  if (data.discussions && data.discussions.length > 0) {
    for (let i = 0; i < data.discussions.length; i += 1) {
      if (_.isUndefined(data.discussions[i].id)) {
        data.discussions[i].id = uuid()
        if (!currentUser.isMachine) {
          _.unset(data.discussions, 'url')
          _.unset(data.discussions, 'options')
        }
      } else if (!currentUser.isMachine) {
        const existingDiscussion = _.find(_.get(challenge, 'discussions', []), d => d.id === data.discussions[i].id)
        if (existingDiscussion) {
          _.assign(data.discussions[i], _.pick(existingDiscussion, ['url', 'options']))
        } else {
          _.unset(data.discussions, 'url')
          _.unset(data.discussions, 'options')
        }
      }
    }
  }

  // Validate the challenge terms
  let newTermsOfUse
  if (!_.isUndefined(data.terms)) {
    // helper.ensureNoDuplicateOrNullElements(data.terms, 'terms')

    // Get the project default terms
    const defaultTerms = await helper.getProjectDefaultTerms(challenge.projectId)

    if (defaultTerms) {
    // Make sure that the default project terms were not removed
    // TODO - there are no default terms returned by v5
    // the terms array is objects with a roleId now, so this _.difference won't work
      // const removedTerms = _.difference(defaultTerms, data.terms)
      // if (removedTerms.length !== 0) {
      //   throw new errors.BadRequestError(`Default project terms ${removedTerms} should not be removed`)
      // }
    }
    // newTermsOfUse = await helper.validateChallengeTerms(_.union(data.terms, defaultTerms))
    newTermsOfUse = await helper.validateChallengeTerms(data.terms)
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

  if (data.winners && data.winners.length > 0 && (challenge.status !== constants.challengeStatuses.Completed && data.status !== constants.challengeStatuses.Completed)) {
    throw new errors.BadRequestError(`Cannot set winners for challenge with non-completed ${challenge.status} status`)
  }

  // TODO: Fix this Tech Debt once legacy is turned off
  const finalStatus = data.status || challenge.status
  const finalTimelineTemplateId = data.timelineTemplateId || challenge.timelineTemplateId
  if (finalStatus !== constants.challengeStatuses.New && finalTimelineTemplateId !== challenge.timelineTemplateId) {
    throw new errors.BadRequestError(`Cannot change the timelineTemplateId for challenges with status: ${finalStatus}`)
  }

  if (data.phases || data.startDate) {
    if (data.phases && data.phases.length > 0) {
      for (let i = 0; i < challenge.phases.length; i += 1) {
        const updatedPhaseInfo = _.find(data.phases, p => p.phaseId === challenge.phases[i].phaseId)
        if (updatedPhaseInfo) {
          _.extend(challenge.phases[i], updatedPhaseInfo)
        }
      }
    }
    const newPhases = challenge.phases
    const newStartDate = data.startDate || challenge.startDate

    await helper.validatePhases(newPhases)
    // populate phases
    await populatePhases(newPhases, newStartDate, data.timelineTemplateId || challenge.timelineTemplateId)
    data.phases = newPhases
    data.startDate = newStartDate
    data.endDate = helper.calculateChallengeEndDate(challenge, data)
  }

  if (data.winners && data.winners.length && data.winners.length > 0) {
    await validateWinners(data.winners, challengeId)
  }

  data.updated = moment().utc()
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
    // } else if (key === 'gitRepoURLs') {
    //   if (_.isUndefined(challenge[key]) || challenge[key].length !== value.length ||
    //     _.intersection(challenge[key], value).length !== value.length) {
    //     op = '$PUT'
    //   }
    } else if (key === 'winners') {
      if (_.isUndefined(challenge[key]) || challenge[key].length !== value.length ||
      _.intersectionWith(challenge[key], value, _.isEqual).length !== value.length) {
        op = '$PUT'
      }
    } else if (key === 'terms') {
      const oldIds = _.map(challenge.terms || [], (t) => t.id)
      const newIds = _.map(value || [], (t) => t.id)
      if (oldIds.length !== newIds.length ||
        _.intersection(oldIds, newIds).length !== value.length) {
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
        // logger.debug(`Audit Log: Key ${key} OldValue: ${oldValue} NewValue: ${newValue}`)
        auditLogs.push({
          id: uuid(),
          challengeId,
          fieldName: key,
          oldValue,
          newValue,
          created: moment().utc(),
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
      created: moment().utc(),
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
      created: moment().utc(),
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
      created: moment().utc(),
      createdBy: currentUser.handle || currentUser.sub,
      memberId: currentUser.userId || null
    })
    delete challenge.groups
    // send null to Elasticsearch to clear the field
    data.groups = null
  }
  // if (isFull && _.isUndefined(data.gitRepoURLs) && challenge.gitRepoURLs) {
  //   if (!updateDetails['$DELETE']) {
  //     updateDetails['$DELETE'] = {}
  //   }
  //   updateDetails['$DELETE'].gitRepoURLs = null
  //   auditLogs.push({
  //     id: uuid(),
  //     challengeId,
  //     fieldName: 'gitRepoURLs',
  //     oldValue: JSON.stringify(challenge.gitRepoURLs),
  //     newValue: 'NULL',
  //     created: moment().utc(),
  //     createdBy: currentUser.handle || currentUser.sub,
  //     memberId: currentUser.userId || null
  //   })
  //   delete challenge.gitRepoURLs
  //   // send null to Elasticsearch to clear the field
  //   data.gitRepoURLs = null
  // }
  if (isFull && _.isUndefined(data.legacyId) && challenge.legacyId) {
    data.legacyId = challenge.legacyId
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
      created: moment().utc(),
      createdBy: currentUser.handle || currentUser.sub,
      memberId: currentUser.userId || null
    })
    delete challenge.winners
    // send null to Elasticsearch to clear the field
    data.winners = null
  }

  const { track, type } = await validateChallengeData(_.pick(challenge, ['trackId', 'typeId']))

  // Only m2m tokens are allowed to modify the `task.*` information on a challenge
  if (!_.isUndefined(_.get(data, 'task')) && !currentUser.isMachine) {
    if (!_.isUndefined(_.get(challenge, 'task'))) {
      data.task = challenge.task
    } else {
      delete data.task
    }
  }

  if (_.get(type, 'isTask')) {
    if (!_.isEmpty(_.get(data, 'task.memberId'))) {
      const challengeResources = await helper.getChallengeResources(challengeId)
      const registrants = _.filter(challengeResources, r => r.roleId === config.SUBMITTER_ROLE_ID)
      if (!_.find(registrants, r => _.toString(r.memberId) === _.toString(_.get(data, 'task.memberId')))) {
        throw new errors.BadRequestError(`Member ${_.get(data, 'task.memberId')} is not a submitter resource of challenge ${challengeId}`)
      }
    }
  }

  logger.debug(`Challenge.update id: ${challengeId} Details:  ${JSON.stringify(updateDetails)}`)
  await models.Challenge.update({ id: challengeId }, updateDetails)

  if (auditLogs.length > 0) {
    await models.AuditLog.batchPut(auditLogs)
  }

  delete data.attachmentIds
  delete data.terms
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

  // Populate challenge.track and challenge.type based on the track/type IDs

  if (track) {
    challenge.track = track.name
  }
  if (type) {
    challenge.type = type.name
  }

  // post bus event
  logger.debug(`Post Bus Event: ${constants.Topics.ChallengeUpdated} ${JSON.stringify(challenge)}`)
  const busEventPayload = { ...challenge }
  if (billingAccountId) {
    busEventPayload.billingAccountId = billingAccountId
  }
  await helper.postBusEvent(constants.Topics.ChallengeUpdated, busEventPayload)

  if (challenge.phases && challenge.phases.length > 0) {
    challenge.currentPhase = challenge.phases.slice().reverse().find(phase => phase.isOpen)
    challenge.endDate = helper.calculateChallengeEndDate(challenge)
  }
  // Update ES
  await esClient.update({
    index: config.get('ES.ES_INDEX'),
    type: config.get('ES.ES_TYPE'),
    refresh: config.get('ES.ES_REFRESH'),
    id: challengeId,
    body: {
      doc: challenge
    }
  })
  return challenge
}

/**
 * Remove unwanted properties from the challenge object
 * @param {Object} challenge the challenge object
 */
function sanitizeChallenge (challenge) {
  const sanitized = _.pick(challenge, [
    'trackId',
    'typeId',
    'name',
    'description',
    'privateDescription',
    'descriptionFormat',
    'timelineTemplateId',
    'tags',
    'projectId',
    'legacyId',
    'startDate',
    'status',
    'task',
    'attachmentIds',
    'groups'
  ])
  if (!_.isUndefined(sanitized.name)) {
    sanitized.name = xss(sanitized.name)
  }
  if (!_.isUndefined(sanitized.description)) {
    sanitized.description = xss(sanitized.description)
  }
  if (challenge.legacy) {
    sanitized.legacy = _.pick(challenge.legacy, [
      'track',
      'subTrack',
      'reviewType',
      'confidentialityType',
      'forumId',
      'directProjectId',
      'screeningScorecardId',
      'reviewScorecardId',
      'isTask'
    ])
  }
  if (challenge.metadata) {
    sanitized.metadata = _.map(challenge.metadata, meta => _.pick(meta, ['name', 'value']))
  }
  if (challenge.phases) {
    sanitized.phases = _.map(challenge.phases, phase => _.pick(phase, ['phaseId', 'duration', 'isOpen']))
  }
  if (challenge.prizeSets) {
    sanitized.prizeSets = _.map(challenge.prizeSets, prizeSet => ({
      ..._.pick(prizeSet, ['type', 'description']),
      prizes: _.map(prizeSet.prizes, prize => _.pick(prize, ['description', 'type', 'value']))
    }))
  }
  if (challenge.events) {
    sanitized.events = _.map(challenge.events, event => _.pick(event, ['id', 'name', 'key']))
  }
  if (challenge.winners) {
    sanitized.winners = _.map(challenge.winners, winner => _.pick(winner, ['userId', 'handle', 'placement']))
  }
  if (challenge.discussions) {
    sanitized.discussions = _.map(challenge.discussions, discussion => _.pick(discussion, ['id', 'provider', 'name', 'type', 'url', 'options']))
  }
  if (challenge.terms) {
    sanitized.terms = _.map(challenge.terms, term => _.pick(term, ['id', 'roleId']))
  }
  return sanitized
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
  return update(currentUser, challengeId, sanitizeChallenge(data), userToken, true)
}

fullyUpdateChallenge.schema = {
  currentUser: Joi.any(),
  challengeId: Joi.id(),
  data: Joi.object().keys({
    legacy: Joi.object().keys({
      track: Joi.string().required(),
      subTrack: Joi.string().required(),
      reviewType: Joi.string().required(),
      confidentialityType: Joi.string().default(config.DEFAULT_CONFIDENTIALITY_TYPE),
      forumId: Joi.number().integer(),
      directProjectId: Joi.number().integer(),
      screeningScorecardId: Joi.number().integer(),
      reviewScorecardId: Joi.number().integer(),
      isTask: Joi.boolean()
    }).unknown(true),
    task: Joi.object().keys({
      isTask: Joi.boolean().default(false),
      isAssigned: Joi.boolean().default(false),
      memberId: Joi.string().allow(null)
    }),
    trackId: Joi.optionalId(),
    typeId: Joi.optionalId(),
    name: Joi.string().required(),
    description: Joi.string(),
    privateDescription: Joi.string(),
    descriptionFormat: Joi.string(),
    metadata: Joi.array().items(Joi.object().keys({
      name: Joi.string().required(),
      value: Joi.required()
    }).unknown(true)).unique((a, b) => a.name === b.name),
    timelineTemplateId: Joi.string(), // Joi.optionalId(),
    phases: Joi.array().items(Joi.object().keys({
      phaseId: Joi.id(),
      duration: Joi.number().positive(),
      isOpen: Joi.boolean()
    }).unknown(true)),
    prizeSets: Joi.array().items(Joi.object().keys({
      type: Joi.string().valid(_.values(constants.prizeSetTypes)).required(),
      description: Joi.string(),
      prizes: Joi.array().items(Joi.object().keys({
        description: Joi.string(),
        type: Joi.string().required(),
        value: Joi.number().min(0).required()
      })).min(1).required()
    }).unknown(true)),
    events: Joi.array().items(Joi.object().keys({
      id: Joi.number().required(),
      name: Joi.string(),
      key: Joi.string()
    }).unknown(true)),
    discussions: Joi.array().items(Joi.object().keys({
      name: Joi.string().required(),
      type: Joi.string().required().valid(_.values(constants.DiscussionTypes)),
      provider: Joi.string().required(),
      url: Joi.string(),
      options: Joi.array().items(Joi.object())
    })),
    tags: Joi.array().items(Joi.string().required()), // tag names
    projectId: Joi.number().integer().positive().required(),
    legacyId: Joi.number().integer().positive(),
    startDate: Joi.date(),
    status: Joi.string().valid(_.values(constants.challengeStatuses)).required(),
    attachmentIds: Joi.array().items(Joi.optionalId()),
    groups: Joi.array().items(Joi.optionalId()),
    // gitRepoURLs: Joi.array().items(Joi.string().uri()),
    winners: Joi.array().items(Joi.object().keys({
      userId: Joi.number().integer().positive().required(),
      handle: Joi.string().required(),
      placement: Joi.number().integer().positive().required()
    }).unknown(true)).min(1),
    terms: Joi.array().items(Joi.object().keys({
      id: Joi.id(),
      roleId: Joi.id()
    }).unknown(true)).optional().allow([])
  }).unknown(true).required(),
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
  return update(currentUser, challengeId, sanitizeChallenge(data), userToken)
}

partiallyUpdateChallenge.schema = {
  currentUser: Joi.any(),
  challengeId: Joi.id(),
  data: Joi.object().keys({
    legacy: Joi.object().keys({
      track: Joi.string(),
      subTrack: Joi.string(),
      reviewType: Joi.string(),
      confidentialityType: Joi.string().default(config.DEFAULT_CONFIDENTIALITY_TYPE),
      directProjectId: Joi.number(),
      forumId: Joi.number().integer().positive(),
      isTask: Joi.boolean()
    }).unknown(true),
    task: Joi.object().keys({
      isTask: Joi.boolean().default(false),
      isAssigned: Joi.boolean().default(false),
      memberId: Joi.string().allow(null)
    }),
    trackId: Joi.optionalId(),
    typeId: Joi.optionalId(),
    name: Joi.string(),
    description: Joi.string(),
    privateDescription: Joi.string(),
    descriptionFormat: Joi.string(),
    metadata: Joi.array().items(Joi.object().keys({
      name: Joi.string().required(),
      value: Joi.required()
    }).unknown(true)).unique((a, b) => a.name === b.name),
    timelineTemplateId: Joi.string(), // changing this to update migrated challenges
    phases: Joi.array().items(Joi.object().keys({
      phaseId: Joi.id(),
      duration: Joi.number().positive(),
      isOpen: Joi.boolean()
    }).unknown(true)).min(1),
    events: Joi.array().items(Joi.object().keys({
      id: Joi.number().required(),
      name: Joi.string(),
      key: Joi.string()
    }).unknown(true)),
    discussions: Joi.array().items(Joi.object().keys({
      name: Joi.string().required(),
      type: Joi.string().required().valid(_.values(constants.DiscussionTypes)),
      provider: Joi.string().required(),
      url: Joi.string(),
      options: Joi.array().items(Joi.object())
    })),
    startDate: Joi.date(),
    prizeSets: Joi.array().items(Joi.object().keys({
      type: Joi.string().valid(_.values(constants.prizeSetTypes)).required(),
      description: Joi.string(),
      prizes: Joi.array().items(Joi.object().keys({
        description: Joi.string(),
        type: Joi.string().required(),
        value: Joi.number().min(0).required()
      })).min(1).required()
    }).unknown(true)).min(1),
    tags: Joi.array().items(Joi.string().required()).min(1), // tag names
    projectId: Joi.number().integer().positive(),
    legacyId: Joi.number().integer().positive(),
    status: Joi.string().valid(_.values(constants.challengeStatuses)),
    attachmentIds: Joi.array().items(Joi.optionalId()),
    groups: Joi.array().items(Joi.id()), // group names
    // gitRepoURLs: Joi.array().items(Joi.string().uri()),
    winners: Joi.array().items(Joi.object().keys({
      userId: Joi.number().integer().positive().required(),
      handle: Joi.string().required(),
      placement: Joi.number().integer().positive().required()
    }).unknown(true)).min(1),
    terms: Joi.array().items(Joi.id().optional()).optional().allow([])
  }).unknown(true).required(),
  userToken: Joi.any()
}

module.exports = {
  searchChallenges,
  createChallenge,
  getChallenge,
  fullyUpdateChallenge,
  partiallyUpdateChallenge
}

// logger.buildService(module.exports)
