/**
 * This service provides operations of challenge.
 */
const _ = require("lodash");
const Joi = require("joi");
const uuid = require("uuid/v4");
const config = require("config");
const xss = require("xss");
const helper = require("../common/helper");
const logger = require("../common/logger");
const errors = require("../common/errors");
const constants = require("../../app-constants");
const ChallengeTimelineTemplateService = require("./ChallengeTimelineTemplateService");
const { BadRequestError } = require("../common/errors");

const phaseHelper = require("../common/phase-helper");
const projectHelper = require("../common/project-helper");
const challengeHelper = require("../common/challenge-helper");

const PhaseAdvancer = require("../phase-management/PhaseAdvancer");

const { hasAdminRole } = require("../common/role-helper");
const {
  enrichChallengeForResponse,
  convertPrizeSetValuesToCents,
  convertPrizeSetValuesToDollars,
  convertToISOString,
} = require("../common/challenge-helper");
const deepEqual = require("deep-equal");
const prismaHelper = require('../common/prisma-helper');

const prisma = require('../common/prisma').getClient()

const phaseAdvancer = new PhaseAdvancer({});

// define return field for challenge model. Used in prisma.
const includeReturnFields = {
  legacyRecord: true,
  billingRecord: true,
  metadata: true,
  phases: {
    // sort by start/end date
    orderBy: [{
      scheduledEndDate: 'asc'
    }, {
      scheduledStartDate: 'asc'
    }],
    include: { constraints: true }
  },
  discussions: {
    include: { options: true }
  },
  events: true,
  prizeSets: {
    include: { prizes: true }
  },
  terms: true,
  skills: true,
  winners: true,
  attachments: true,
  track: true,
  type: true,
}

/**
 * Search challenges by legacyId
 * @param {Object} currentUser the user who perform operation
 * @param {Number} legacyId the legacyId
 * @param {Number} page the page
 * @param {Number} perPage the perPage
 * @returns {Array} the search result
 */
async function searchByLegacyId (currentUser, legacyId, page, perPage) {
  // Do not take nested objects, query will be faster
  const challenges = await prisma.challenge.findMany({
    take: perPage,
    skip: (page - 1) * perPage,
    where: { legacyId },
    include: includeReturnFields
  })

  _.forEach(challenges, c => {
    prismaHelper.convertModelToResponse(c);
    enrichChallengeForResponse(c, c.track, c.type);
  });
  return challenges
}

/**
 * Search challenges
 * @param {Object} currentUser the user who perform operation
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function searchChallenges (currentUser, criteria) {
  const page = criteria.page || 1;
  const perPage = criteria.perPage || 20;
  if (!_.isUndefined(criteria.legacyId)) {
    const result = await searchByLegacyId(currentUser, criteria.legacyId, page, perPage);
    return { total: result.length, page, perPage, result };
  }

  const prismaFilter = {
    where: {
      AND: []
    }
  }

  const matchPhraseKeys = [
    "id",
    "timelineTemplateId",
    "projectId",
    "legacyId",
    "createdBy",
    "updatedBy",
  ];

  const _hasAdminRole = hasAdminRole(currentUser);

  let includedTrackIds = _.isArray(criteria.trackIds) ? criteria.trackIds : [];
  let includedTypeIds = _.isArray(criteria.typeIds) ? criteria.typeIds : [];

  if (criteria.type) {
    const typeSearchRes = await prisma.challengeType.findFirst({
      where: {abbreviation: criteria.type}
    });
    if (typeSearchRes && _.get(typeSearchRes, "id")) {
      criteria.typeId = _.get(typeSearchRes, "id");
    }
  }
  if (criteria.track) {
    const trackSearchRes = await prisma.challengeTrack.findFirst({
      where: { abbreviation: criteria.track }
    })
    if (trackSearchRes && _.get(trackSearchRes, "id")) {
      criteria.trackId = _.get(trackSearchRes, "id");
    }
  }
  if (criteria.types) {
    const typeIds = await prisma.challengeType.findMany({
      where: { abbreviation: { in: criteria.types } },
      select: { id: true }
    });
    if (typeIds.length > 0) {
      includedTypeIds = _.concat(includedTypeIds, typeIds.map(t => t.id));
    }
  }
  if (criteria.tracks) {
    const trackIds = await prisma.challengeTrack.findMany({
      select: { id: true },
      where: { abbreviation: { in: criteria.tracks } }
    });
    if (trackIds.length > 0) {
      includedTrackIds = _.concat(includedTrackIds, trackIds.map(t => t.id));
    }
  }
  if (criteria.typeId) {
    includedTypeIds.push(criteria.typeId);
  }
  if (criteria.trackId) {
    includedTrackIds.push(criteria.trackId);
  }

  _.forIn(_.pick(criteria, matchPhraseKeys), (value, key) => {
    if (!_.isUndefined(value)) {
      const f = {};
      f[key] = value;
      prismaFilter.where.AND.push(f);
    }
  })

  // handle status
  if (!_.isNil(criteria.status)) {
    prismaFilter.where.AND.push({
      status: criteria.status.toUpperCase()
    })
  }

  _.forEach(_.keys(criteria), (key) => {
    if (_.toString(key).indexOf('meta.') > -1) {
      // Parse and use metadata key
      if (!_.isUndefined(criteria[key])) {
        const metaKey = key.split('meta.')[1];
        prismaFilter.where.AND.push({
          metadata: {
            some: {
              name: { contains: metaKey },
              value: { contains: _.toString(criteria[key]) }
            }
          }
        })
      }
    }
  })

  if (includedTypeIds.length > 0) {
    prismaFilter.where.AND.push({
      typeId: { in: includedTypeIds }
    })
  }

  if (includedTrackIds.length > 0) {
    prismaFilter.where.AND.push({
      trackId: { in: includedTrackIds }
    })
  }

  if (criteria.search) {
    prismaFilter.where.AND.push({
      OR: [{
        name: { contains: criteria.search }
      }, {
        description: { contains: criteria.search }
      // TODO: Skills doesn't have name field in db.
      /*
      }, {
        skills: { some: { name: { contains: criteria.search } } }
      */
      }, {
        tags: { has: criteria.search }
      }]
    })
  } else {
    if (criteria.name) {
      prismaFilter.where.AND.push({
        name: { contains: criteria.name }
      })
    }

    if (criteria.description) {
      prismaFilter.where.AND.push({
        description: { contains: criteria.description }
      })
    }
  }

  if (criteria.tag) {
    prismaFilter.where.AND.push({
      tags: {
        has: criteria.tag
      }
    })
  }

  if (criteria.tags) {
    if (criteria.includeAllTags) {
      prismaFilter.where.AND.push({
        tags: { hasEvery: criteria.tags }
      })
    } else {
      prismaFilter.where.AND.push({
        tags: { hasSome: criteria.tags }
      })
    }
  }

  if (criteria.totalPrizesFrom || criteria.totalPrizesTo) {
    if (criteria.totalPrizesFrom) {
      prismaFilter.where.AND.push({
        overviewTotalPrizes: { gte: criteria.totalPrizesFrom }
      })
    }
    if (criteria.totalPrizesTo) {
      prismaFilter.where.AND.push({
        overviewTotalPrizes: { lte: criteria.totalPrizesTo }
      })
    }
  }
  if (criteria.selfService) {
    prismaFilter.where.AND.push({
      legacyRecord: {
        is: { selfService: criteria.selfService }
      }
    })
  }
  if (criteria.selfServiceCopilot) {
    prismaFilter.where.AND.push({
      legacyRecord: {
        is: { selfServiceCopilot: criteria.selfServiceCopilot }
      }
    })
  }
  if (criteria.forumId) {
    prismaFilter.where.AND.push({
      legacyRecord: {
        is: { forumId: criteria.forumId }
      }
    })
  }
  if (criteria.reviewType) {
    prismaFilter.where.AND.push({
      legacyRecord: {
        is: { reviewType: criteria.reviewType.toUpperCase() }
      }
    })
  }
  if (criteria.confidentialityType) {
    prismaFilter.where.AND.push({
      legacyRecord: {
        is: { confidentialityType: criteria.confidentialityType }
      }
    })
  }
  if (criteria.directProjectId) {
    prismaFilter.where.AND.push({
      legacyRecord: {
        is: { directProjectId: criteria.directProjectId }
      }
    })
  }
  if (criteria.currentPhaseName) {
    if (criteria.currentPhaseName === 'Registration') {
      prismaFilter.where.AND.push({
        currentPhaseNames: { hasSome: ['Registration', 'Open'] }
      })
    } else {
      prismaFilter.where.AND.push({
        currentPhaseNames: { has: criteria.currentPhaseName }
      })
    }
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
  if (criteria.registrationStartDateStart) {
    prismaFilter.where.AND.push({
      registrationStartDate: { gte: criteria.registrationStartDateStart }
    })
  }
  if (criteria.registrationStartDateEnd) {
    prismaFilter.where.AND.push({
      registrationStartDate: { lte: criteria.registrationStartDateEnd }
    })
  }
  if (criteria.registrationEndDateStart) {
    prismaFilter.where.AND.push({
      registrationEndDate: { gte: criteria.registrationEndDateStart }
    })
  }
  if (criteria.registrationEndDateEnd) {
    prismaFilter.where.AND.push({
      registrationEndDate: { lte: criteria.registrationEndDateEnd }
    })
  }
  if (criteria.submissionStartDateStart) {
    prismaFilter.where.AND.push({
      submissionStartDate: { gte: criteria.submissionStartDateStart }
    })
  }
  if (criteria.submissionStartDateEnd) {
    prismaFilter.where.AND.push({
      submissionStartDate: { lte: criteria.submissionStartDateEnd }
    })
  }
  if (criteria.submissionEndDateStart) {
    prismaFilter.where.AND.push({
      submissionEndDate: { gte: criteria.submissionEndDateStart }
    })
  }
  if (criteria.submissionEndDateEnd) {
    prismaFilter.where.AND.push({
      submissionEndDate: { lte: criteria.submissionEndDateEnd }
    })
  }
  if (criteria.updatedDateStart) {
    prismaFilter.where.AND.push({
      updatedAt: { gte: criteria.updatedDateStart }
    })
  }
  if (criteria.updatedDateEnd) {
    prismaFilter.where.AND.push({
      updatedAt: { lte: criteria.updatedDateEnd }
    })
  }
  if (criteria.startDateStart) {
    prismaFilter.where.AND.push({
      startDate: { gte: criteria.startDateStart }
    })
  }
  if (criteria.startDateEnd) {
    prismaFilter.where.AND.push({
      startDate: { lte: criteria.startDateEnd }
    })
  }
  if (criteria.endDateStart) {
    prismaFilter.where.AND.push({
      endDate: { gte: criteria.endDateStart }
    })
  }
  if (criteria.endDateEnd) {
    prismaFilter.where.AND.push({
      endDate: { lte: criteria.endDateEnd }
    })
  }

  const sortByProp = criteria.sortBy ? criteria.sortBy : 'createdAt'

  const sortOrderProp = criteria.sortOrder ? criteria.sortOrder : 'desc'

  if (criteria.tco) {
    prismaFilter.where.AND.push({
      events: {
        some: { key: { contains: 'tco' }}
      }
    })
  }

  if (criteria.events) {
    const eventQuery = _.map(criteria.events, e => ({
      events: {
        some: { key: { contains: e } }
      }
    }))
    if (criteria.includeAllEvents) {
      prismaFilter.where.AND = _.concat(prismaFilter.where.AND, eventQuery)
    } else {
      prismaFilter.where.AND.push({
        OR: eventQuery
      })
    }
  }

  let groupsToFilter = [];
  let accessibleGroups = [];

  if (currentUser && !currentUser.isMachine && !_hasAdminRole) {
    accessibleGroups = await helper.getCompleteUserGroupTreeIds(currentUser.userId);
  }

  // Filter all groups from the criteria to make sure the user can access those
  if (!_.isUndefined(criteria.group) || !_.isUndefined(criteria.groups)) {
    // check group access
    if (_.isUndefined(currentUser)) {
      if (criteria.group) {
        const group = await helper.getGroupById(criteria.group);
        if (group && !group.privateGroup) {
          groupsToFilter.push(criteria.group);
        }
      }
      if (criteria.groups && criteria.groups.length > 0) {
        const promises = [];
        _.each(criteria.groups, (g) => {
          promises.push(
            (async () => {
              const group = await helper.getGroupById(g);
              if (group && !group.privateGroup) {
                groupsToFilter.push(g);
              }
            })()
          );
        });
        await Promise.all(promises);
      }
    } else if (!currentUser.isMachine && !_hasAdminRole) {
      if (accessibleGroups.includes(criteria.group)) {
        groupsToFilter.push(criteria.group);
      }
      if (criteria.groups && criteria.groups.length > 0) {
        _.each(criteria.groups, (g) => {
          if (accessibleGroups.includes(g)) {
            groupsToFilter.push(g);
          }
        });
      }
    } else {
      groupsToFilter = [...(criteria.groups ? criteria.groups : [])];
      if (criteria.group) {
        groupsToFilter.push(criteria.group);
      }
    }
    groupsToFilter = _.uniq(groupsToFilter);

    if (groupsToFilter.length === 0) {
      // User can't access any of the groups from the filters
      // We return an empty array as the result
      return { total: 0, page, perPage, result: [] };
    }
  }

  if (groupsToFilter.length === 0) {
    // Return public challenges + challenges from groups that the user has access to
    if (_.isUndefined(currentUser)) {
      // If the user is not authenticated, only query challenges that don't have a group
      prismaFilter.where.AND.push({
        groups: { isEmpty: true }
      })
    } else if (!currentUser.isMachine && !_hasAdminRole) {
      prismaFilter.where.AND.push({
        OR: [{
          // include public challenges
          groups: { isEmpty: true }
        }, {
          // If the user is not M2M and is not an admin, return public + challenges from groups the user can access
          groups: { hasSome: accessibleGroups }
        }]
      })
    }
  } else {
    prismaFilter.where.AND.push({
      groups: { hasSome: groupsToFilter }
    })
  }

  if (criteria.ids) {
    prismaFilter.where.AND.push({
      id: { in: criteria.ids }
    })
  }

  let memberChallengeIds

  // FIXME: This is wrong!
  // if (!_.isUndefined(currentUser) && currentUser.handle) {
  //   accessQuery.push({ match_phrase: { createdBy: currentUser.handle } })
  // }

  if (criteria.memberId) {
    // logger.error(`memberId ${criteria.memberId}`)
    memberChallengeIds = await helper.listChallengesByMember(criteria.memberId)
    // logger.error(`response ${JSON.stringify(ids)}`)
    prismaFilter.where.AND.push({
      id: { in: memberChallengeIds }
    })
  } else if (currentUser && !_hasAdminRole && !_.get(currentUser, 'isMachine', false)) {
    memberChallengeIds = await helper.listChallengesByMember(currentUser.userId)
  }

  // FIXME: Tech Debt
  let excludeTasks = true
  // if you're an admin or m2m, security rules wont be applied
  if (currentUser && (_hasAdminRole || _.get(currentUser, 'isMachine', false))) {
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
  if (currentUser && (_hasAdminRole || _.get(currentUser, 'isMachine', false))) {
    // For admins/m2m, allow filtering based on task properties
    if (!_.isNil(criteria.isTask)) {
      prismaFilter.where.AND.push({
        taskIsTask: criteria.isTask
      })
    }
    if (!_.isNil(criteria.taskIsAssigned)) {
      prismaFilter.where.AND.push({
        taskIsAssigned: criteria.taskIsAssigned
      })
    }
    if (!_.isNil(criteria.taskMemberId)) {
      prismaFilter.where.AND.push({
        taskMemberId: criteria.taskMemberId
      })
    }
  } else if (excludeTasks) {
    const taskFilter = []
    if (_.get(memberChallengeIds, "length", 0) > 0) {
      taskFilter.push({
        id: { in: memberChallengeIds }
      })
    }
    taskFilter.push({
      taskIsTask: false
    })
    taskFilter.push({
      taskIsTask: true,
      taskIsAssigned: false
    })
    if (currentUser && !_hasAdminRole && !_.get(currentUser, 'isMachine', false)) {
      taskFilter.push({
        taskMemberId: currentUser.userId
      })
    }
    prismaFilter.where.AND.push({
      OR: taskFilter
    })
  }

  const sortFilter = {}
  sortFilter[sortByProp] = sortOrderProp

  const prismaQuery = {
    ...prismaFilter,
    take: criteria.perPage,
    skip: (criteria.page - 1) * criteria.perPage,
    orderBy: [sortFilter],
    include: includeReturnFields
  }

  let challenges = []
  let total = 0
  try {
    total = await prisma.challenge.count({ ...prismaFilter })
    challenges = await prisma.challenge.findMany(prismaQuery)
    _.forEach(challenges, c => {
      prismaHelper.convertModelToResponse(c);
      enrichChallengeForResponse(c, c.track, c.type);
    });
  } catch (e) {
    // logger.error(JSON.stringify(e));
    console.log(e)
  }

  let result = challenges

  // Hide privateDescription for non-register challenges
  if (currentUser) {
    if (!currentUser.isMachine && !_hasAdminRole) {
      result = _.each(result, (val) => _.unset(val, "billing"));
      const ids = await helper.listChallengesByMember(currentUser.userId);
      result = _.each(result, (val) => {
        if (!_.includes(ids, val.id)) {
          _.unset(val, "privateDescription");
        }
      });
    }
  } else {
    result = _.each(result, (val) => {
      _.unset(val, "billing");
      _.unset(val, "privateDescription");
      return val;
    });
  }

  if (criteria.isLightweight === "true") {
    result = _.each(result, (val) => {
      // _.unset(val, 'terms')
      _.unset(val, "description");
      _.unset(val, "privateDescription");
      return val;
    });
  }

  _.each(result, async (element) => {
    if (element.status !== constants.challengeStatuses.Completed) {
      _.unset(element, "winners");
    }
    // TODO: in the long run we wanna do a finer grained filtering of the payments
    if (!_hasAdminRole && !_.get(currentUser, "isMachine", false)) {
      _.unset(element, "payments");
    }
  });

  return { total, page, perPage, result };
}
searchChallenges.schema = {
  currentUser: Joi.any(),
  criteria: Joi.object()
    .keys({
      page: Joi.page(),
      perPage: Joi.perPage(),
      id: Joi.optionalId(),
      selfService: Joi.boolean(),
      selfServiceCopilot: Joi.string(),
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
      forumId: Joi.number().integer(),
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
      sortOrder: Joi.string().valid(["asc", "desc"]),
      groups: Joi.array().items(Joi.optionalId()).unique().min(1),
      ids: Joi.array().items(Joi.optionalId()).unique().min(1),
      isTask: Joi.boolean(),
      taskIsAssigned: Joi.boolean(),
      taskMemberId: Joi.string(),
      events: Joi.array().items(Joi.string()),
      includeAllEvents: Joi.boolean().default(true),
      useSchedulingAPI: Joi.boolean(),
      totalPrizesFrom: Joi.number().min(0),
      totalPrizesTo: Joi.number().min(0),
      tco: Joi.boolean().default(false),
    })
    .unknown(true),
};

/**
 * Create challenge.
 * @param {Object} currentUser the user who perform operation
 * @param {Object} challenge the challenge to created
 * @param {String} userToken the user token
 * @returns {Object} the created challenge
 */
async function createChallenge(currentUser, challenge, userToken) {
  await challengeHelper.validateCreateChallengeRequest(currentUser, challenge);
  const prizeTypeTmp = challengeHelper.validatePrizeSetsAndGetPrizeType(challenge.prizeSets)

  console.log("TYPE", prizeTypeTmp);
  if (challenge.legacy.selfService) {
    // if self-service, create a new project (what about if projectId is provided in the payload? confirm with business!)
    if (!challenge.projectId && challengeHelper.isProjectIdRequired(challenge.timelineTemplateId)) {
      const selfServiceProjectName = `Self service - ${currentUser.handle} - ${challenge.name}`;
      challenge.projectId = await helper.createSelfServiceProject(
        selfServiceProjectName,
        "N/A",
        config.NEW_SELF_SERVICE_PROJECT_TYPE,
        userToken
      );
    }

    if (challenge.metadata && challenge.metadata.length > 0) {
      for (const entry of challenge.metadata) {
        if (challenge.description.includes(`{{${entry.name}}}`)) {
          challenge.description = challenge.description
            .split(`{{${entry.name}}}`)
            .join(entry.value);
        }
      }
    }
  }

  /** Ensure project exists, and set direct project id, billing account id & markup */
  if (challengeHelper.isProjectIdRequired(challenge.timelineTemplateId) || challenge.projectId) {
    const { projectId } = challenge;

    const { directProjectId } = await projectHelper.getProject(projectId, currentUser);
    const { billingAccountId, markup } = await projectHelper.getProjectBillingInformation(
      projectId
    );

    _.set(challenge, "legacy.directProjectId", directProjectId);
    _.set(challenge, "billing.billingAccountId", billingAccountId);
    _.set(challenge, "billing.markup", markup || 0);
  }

  if (!_.isUndefined(_.get(challenge, "legacy.reviewType"))) {
    _.set(challenge, "legacy.reviewType", _.toUpper(_.get(challenge, "legacy.reviewType")));
  }

  if (!challenge.status) {
    challenge.status = constants.challengeStatuses.New;
  }

  if (!challenge.startDate) {
    challenge.startDate = new Date().toISOString();
  } else {
    challenge.startDate = convertToISOString(challenge.startDate);
  }

  const { track, type } = await challengeHelper.validateAndGetChallengeTypeAndTrack(challenge);

  if (_.get(type, "isTask")) {
    _.set(challenge, "task.isTask", true);
    // this is only applicable for WorkType: Gig, i.e., Tasks created from Salesforce
    if (challenge.billing != null && challenge.billing.clientBillingRate != null) {
      _.set(challenge, "billing.clientBillingRate", challenge.billing.clientBillingRate);
    }

    if (_.isUndefined(_.get(challenge, "task.isAssigned"))) {
      _.set(challenge, "task.isAssigned", false);
    }
    if (_.isUndefined(_.get(challenge, "task.memberId"))) {
      _.set(challenge, "task.memberId", null);
    } else {
      throw new errors.BadRequestError(`Cannot assign a member before the challenge gets created.`);
    }
  }

  if (challenge.phases && challenge.phases.length > 0) {
    await phaseHelper.validatePhases(challenge.phases);
  }

  // populate phases
  if (!challenge.timelineTemplateId) {
    if (challenge.typeId && challenge.trackId) {
      const supportedTemplates =
        await ChallengeTimelineTemplateService.searchChallengeTimelineTemplates({
          typeId: challenge.typeId,
          trackId: challenge.trackId,
          isDefault: true,
        });
      const challengeTimelineTemplate = supportedTemplates.result[0];
      if (!challengeTimelineTemplate) {
        throw new errors.BadRequestError(
          `The selected trackId ${challenge.trackId} and typeId: ${challenge.typeId} does not have a default timeline template. Please provide a timelineTemplateId`
        );
      }
      challenge.timelineTemplateId = challengeTimelineTemplate.timelineTemplateId;
    } else {
      throw new errors.BadRequestError(`trackId and typeId are required to create a challenge`);
    }
  }
  challenge.phases = await phaseHelper.populatePhasesForChallengeCreation(
    challenge.phases,
    challenge.startDate,
    challenge.timelineTemplateId
  );

  // populate challenge terms
  // const projectTerms = await helper.getProjectDefaultTerms(challenge.projectId)
  // challenge.terms = await helper.validateChallengeTerms(_.union(projectTerms, challenge.terms))
  // TODO - challenge terms returned from projects api don't have a role associated
  // this will need to be updated to associate project terms with a roleId
  challenge.terms = await helper.validateChallengeTerms(challenge.terms || []);

  // default the descriptionFormat
  if (!challenge.descriptionFormat) {
    challenge.descriptionFormat = "markdown";
  }

  if (challenge.phases && challenge.phases.length > 0) {
    challenge.endDate = helper.calculateChallengeEndDate(challenge);
  }

  if (challenge.events == null) challenge.events = [];
  if (challenge.attachments == null) challenge.attachments = [];
  if (challenge.prizeSets == null) challenge.prizeSets = [];
  if (challenge.metadata == null) challenge.metadata = [];
  if (challenge.groups == null) challenge.groups = [];
  if (challenge.tags == null) challenge.tags = [];
  if (challenge.startDate != null) challenge.startDate = challenge.startDate;
  if (challenge.endDate != null) challenge.endDate = challenge.endDate;
  if (challenge.discussions == null) challenge.discussions = [];
  if (challenge.skills == null) challenge.skills = [];

  challenge.metadata = challenge.metadata.map((m) => ({
    name: m.name,
    value: typeof m.value === "string" ? m.value : JSON.stringify(m.value),
  }));

  const prizeType = challengeHelper.validatePrizeSetsAndGetPrizeType(challenge.prizeSets);

  if (prizeType === constants.prizeTypes.USD) {
    convertPrizeSetValuesToCents(challenge.prizeSets);
  }

  const prismaModel = prismaHelper.convertChallengeSchemaToPrisma(currentUser, challenge)
  const ret = await prisma.challenge.create({
    data: prismaModel,
    include: includeReturnFields
  })

  ret.overview = { totalPrizesInCents: ret.overviewTotalPrizes }
  if (prizeType === constants.prizeTypes.USD) {
    convertPrizeSetValuesToDollars(ret.prizeSets, ret.overview)
  }

  prismaHelper.convertModelToResponse(ret)
  enrichChallengeForResponse(ret, track, type)

  // If the challenge is self-service, add the creating user as the "client manager", *not* the manager
  // This is necessary for proper handling of the vanilla embed on the self-service work item dashboard

  if (challenge.legacy.selfService) {
    if (currentUser.handle) {
      await helper.createResource(ret.id, ret.createdBy, config.CLIENT_MANAGER_ROLE_ID);
    }
  } else {
    if (currentUser.handle) {
      await helper.createResource(ret.id, ret.createdBy, config.MANAGER_ROLE_ID);
    }
  }

  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengeCreated, ret);

  return ret;
}
createChallenge.schema = {
  currentUser: Joi.any(),
  challenge: Joi.object()
    .keys({
      typeId: Joi.id(),
      trackId: Joi.id(),
      legacy: Joi.object().keys({
        reviewType: Joi.string()
          .valid(_.values(constants.reviewTypes))
          .insensitive()
          .default(constants.reviewTypes.Internal),
        confidentialityType: Joi.string().default(config.DEFAULT_CONFIDENTIALITY_TYPE),
        forumId: Joi.number().integer(),
        directProjectId: Joi.number().integer(),
        screeningScorecardId: Joi.number().integer(),
        reviewScorecardId: Joi.number().integer(),
        isTask: Joi.boolean(),
        useSchedulingAPI: Joi.boolean(),
        pureV5Task: Joi.boolean(),
        pureV5: Joi.boolean(),
        selfService: Joi.boolean(),
        selfServiceCopilot: Joi.string(),
      }),
      billing: Joi.object()
        .keys({
          billingAccountId: Joi.string(),
          markup: Joi.number().min(0).max(100),
          clientBillingRate: Joi.number().min(0).max(100),
        })
        .unknown(true),
      task: Joi.object().keys({
        isTask: Joi.boolean().default(false),
        isAssigned: Joi.boolean().default(false),
        memberId: Joi.string().allow(null),
      }),
      name: Joi.string().required(),
      description: Joi.string(),
      privateDescription: Joi.string(),
      descriptionFormat: Joi.string(),
      metadata: Joi.array()
        .items(
          Joi.object().keys({
            name: Joi.string().required(),
            value: Joi.required(),
          })
        )
        .unique((a, b) => a.name === b.name),
      timelineTemplateId: Joi.string(), // Joi.optionalId(),
      phases: Joi.array().items(
        Joi.object().keys({
          phaseId: Joi.id(),
          duration: Joi.number().integer().min(0),
          constraints: Joi.array()
            .items(
              Joi.object()
                .keys({
                  name: Joi.string(),
                  value: Joi.number().integer().min(0),
                })
                .optional()
            )
            .optional(),
        })
      ),
      events: Joi.array().items(
        Joi.object().keys({
          id: Joi.number().required(),
          name: Joi.string(),
          key: Joi.string(),
        })
      ),
      discussions: Joi.array().items(
        Joi.object().keys({
          id: Joi.optionalId(),
          name: Joi.string().required(),
          type: Joi.string().required().valid(_.values(constants.DiscussionTypes)),
          provider: Joi.string().required(),
          url: Joi.string(),
          options: Joi.array().items(Joi.object()),
        })
      ),
      prizeSets: Joi.array().items(
        Joi.object().keys({
          type: Joi.string().valid(_.values(constants.prizeSetTypes)).required(),
          description: Joi.string(),
          prizes: Joi.array()
            .items(
              Joi.object().keys({
                description: Joi.string(),
                type: Joi.string().required(),
                value: Joi.number().min(0).required(),
              })
            )
            .min(1)
            .required(),
        })
      ),
      tags: Joi.array().items(Joi.string()), // tag names
      projectId: Joi.number().integer().positive(),
      legacyId: Joi.number().integer().positive(),
      constraints: Joi.object()
        .keys({
          allowedRegistrants: Joi.array().items(Joi.string().trim().lowercase()).optional(),
        })
        .optional(),
      startDate: Joi.date().iso(),
      status: Joi.string().valid([
        constants.challengeStatuses.Active,
        constants.challengeStatuses.New,
        constants.challengeStatuses.Draft,
        constants.challengeStatuses.Approved,
      ]),
      groups: Joi.array().items(Joi.optionalId()).unique(),
      // gitRepoURLs: Joi.array().items(Joi.string().uri()),
      terms: Joi.array().items(
        Joi.object().keys({
          id: Joi.id(),
          roleId: Joi.id(),
        })
      ),
      skills: Joi.array()
        .items(
          Joi.object()
            .keys({
              id: Joi.id(),
            })
            .unknown(true)
        )
        .optional(),
    })
    .required(),
  userToken: Joi.string().required(),
};

/**
 * Get challenge.
 * @param {Object} currentUser the user who perform operation
 * @param {String} id the challenge id
 * @param {Boolean} checkIfExists flag to check if challenge exists
 * @returns {Object} the challenge with given id
 */
async function getChallenge (currentUser, id, checkIfExists) {
  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: includeReturnFields
  })
  if (_.isNil(challenge) || _.isNil(challenge.id)) {
    throw new errors.NotFoundError(`Challenge of id ${id} is not found.`);
  }
  if (checkIfExists) {
    return _.pick(challenge, ["id", "legacyId"]);
  }
  await helper.ensureUserCanViewChallenge(currentUser, challenge);

  // Remove privateDescription for unregistered users
  if (currentUser) {
    if (!currentUser.isMachine && !hasAdminRole(currentUser)) {
      _.unset(challenge, "billing");
      if (_.isEmpty(challenge.privateDescription)) {
        _.unset(challenge, "privateDescription");
      } else if (
        !_.get(challenge, "task.isTask", false) ||
        !_.get(challenge, "task.isAssigned", false)
      ) {
        const memberResources = await helper.listResourcesByMemberAndChallenge(
          currentUser.userId,
          challenge.id
        );
        if (_.isEmpty(memberResources)) {
          _.unset(challenge, "privateDescription");
        }
      }
    }
  } else {
    _.unset(challenge, "billing");
    _.unset(challenge, "privateDescription");
  }

  if (challenge.status !== constants.challengeStatuses.Completed) {
    _.unset(challenge, "winners");
  }

  // TODO: in the long run we wanna do a finer grained filtering of the payments
  if (!hasAdminRole(currentUser) && !_.get(currentUser, "isMachine", false)) {
    _.unset(challenge, "payments");
  }

  prismaHelper.convertModelToResponse(challenge);
  enrichChallengeForResponse(challenge, challenge.track, challenge.type);

  return challenge
}
getChallenge.schema = {
  currentUser: Joi.any(),
  id: Joi.id(),
  checkIfExists: Joi.boolean(),
};

/**
 * Get challenge statistics
 * @param {Object} currentUser the user who perform operation
 * @param {String} id the challenge id
 * @returns {Object} the challenge with given id
 */
async function getChallengeStatistics(currentUser, id) {
  const challenge = await getChallenge(currentUser, id);
  // get submissions
  const submissions = await helper.getChallengeSubmissions(challenge.id);
  // for each submission, load member profile
  const map = {};
  for (const submission of submissions) {
    if (!map[submission.memberId]) {
      // Load member profile and cache
      const member = await helper.getMemberById(submission.memberId);
      map[submission.memberId] = {
        photoUrl: member.photoURL,
        rating: _.get(member, "maxRating.rating", 0),
        ratingColor: _.get(member, "maxRating.ratingColor", "#9D9FA0"),
        homeCountryCode: member.homeCountryCode,
        handle: member.handle,
        submissions: [],
      };
    }
    // add submission
    map[submission.memberId].submissions.push({
      created: submission.created,
      score: _.get(
        _.find(submission.review || [], (r) => r.metadata),
        "score",
        0
      ),
    });
  }
  return _.map(_.keys(map), (userId) => map[userId]);
}
getChallengeStatistics.schema = {
  currentUser: Joi.any(),
  id: Joi.id(),
};

/**
 * Check whether given two PrizeSet Array are different.
 * @param {Array} prizeSets the first PrizeSet Array
 * @param {Array} otherPrizeSets the second PrizeSet Array
 * @returns {Boolean} true if different, false otherwise
 */
function isDifferentPrizeSets(prizeSets = [], otherPrizeSets = []) {
  return !_.isEqual(_.sortBy(prizeSets, "type"), _.sortBy(otherPrizeSets, "type"));
}

/**
 * Validate the winners array.
 * @param {Array} winners the Winner Array
 * @param {Array} challengeResources the challenge resources
 */
async function validateWinners(winners, challengeResources) {
  const registrants = _.filter(challengeResources, (r) => r.roleId === config.SUBMITTER_ROLE_ID);
  for (const prizeType of _.values(constants.prizeSetTypes)) {
    const filteredWinners = _.filter(winners, (w) => w.type === prizeType);
    for (const winner of filteredWinners) {
      if (!_.find(registrants, (r) => _.toString(r.memberId) === _.toString(winner.userId))) {
        throw new errors.BadRequestError(
          `Member with userId: ${winner.userId} is not registered on the challenge`
        );
      }
      const diffWinners = _.differenceWith(filteredWinners, [winner], _.isEqual);
      if (diffWinners.length + 1 !== filteredWinners.length) {
        throw new errors.BadRequestError(
          `Duplicate member with placement: ${helper.toString(winner)}`
        );
      }

      // find another member with the placement
      const placementExists = _.find(diffWinners, function (w) {
        return w.placement === winner.placement;
      });
      if (
        placementExists &&
        (placementExists.userId !== winner.userId || placementExists.handle !== winner.handle)
      ) {
        throw new errors.BadRequestError(
          `Only one member can have a placement: ${winner.placement}`
        );
      }

      // find another placement for a member
      const memberExists = _.find(diffWinners, function (w) {
        return w.userId === winner.userId && w.type === winner.type;
      });
      if (memberExists && memberExists.placement !== winner.placement) {
        throw new errors.BadRequestError(
          `The same member ${winner.userId} cannot have multiple placements`
        );
      }
    }
  }
}

/**
 * Task shouldn't be launched/completed when it is assigned to the current user self.
 * E.g: stop copilots from paying themselves, thus copilots will need to contact manager to launch/complete the task.
 * @param {Object} currentUser the user who perform operation
 * @param {Object} challenge the existing challenge
 * @param {Object} data the new input challenge data
 * @param {Array} challengeResources the challenge resources
 */
function validateTask(currentUser, challenge, data, challengeResources) {
  if (!_.get(challenge, "legacy.pureV5Task")) {
    // Not a Task
    return;
  }

  // Status changed to Active, indicating launch a Task
  const isLaunchTask =
    data.status === constants.challengeStatuses.Active &&
    challenge.status !== constants.challengeStatuses.Active;

  // Status changed to Completed, indicating complete a Task
  const isCompleteTask =
    data.status === constants.challengeStatuses.Completed &&
    challenge.status !== constants.challengeStatuses.Completed;

  // When complete a Task, input data should have winners
  if (isCompleteTask && (!data.winners || !data.winners.length)) {
    throw new errors.BadRequestError("The winners is required to complete a Task");
  }

  if (!currentUser.isMachine && (isLaunchTask || isCompleteTask)) {
    // Whether task is assigned to current user
    const assignedToCurrentUser =
      _.filter(
        challengeResources,
        (r) =>
          r.roleId === config.SUBMITTER_ROLE_ID &&
          _.toString(r.memberId) === _.toString(currentUser.userId)
      ).length > 0;

    if (assignedToCurrentUser) {
      throw new errors.ForbiddenError(
        `You are not allowed to ${
          data.status === constants.challengeStatuses.Active ? "lanuch" : "complete"
        } task assigned to yourself. Please contact manager to operate.`
      );
    }
  }
}

/**
 * Update challenge.
 * @param {Object} currentUser the user who perform operation
 * @param {String} challengeId the challenge id
 * @param {Object} data the challenge data to be updated
 * @returns {Object} the updated challenge
 */
async function updateChallenge(currentUser, challengeId, data) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: includeReturnFields
  })
  if (!challenge || !challenge.id) {
    throw new errors.NotFoundError(`Challenge with id: ${challengeId} doesn't exist`)
  }
  enrichChallengeForResponse(challenge)
  prismaHelper.convertModelToResponse(challenge)
  const existingPrizeType = challengeHelper.validatePrizeSetsAndGetPrizeType(challenge.prizeSets);

  if (existingPrizeType === constants.prizeTypes.USD) {
    convertPrizeSetValuesToDollars(challenge.prizeSets, challenge.overview);
  }

  let projectId, billingAccountId, markup;
  if (challengeHelper.isProjectIdRequired(challenge.timelineTemplateId)) {
    projectId = _.get(challenge, "projectId");

    ({ billingAccountId, markup } = await projectHelper.getProjectBillingInformation(projectId));

    if (billingAccountId && _.isUndefined(_.get(challenge, "billing.billingAccountId"))) {
      _.set(data, "billing.billingAccountId", billingAccountId);
      _.set(data, "billing.markup", markup || 0);
    }

    // Make sure the user cannot change the direct project ID
    if (data.legacy) {
      data.legacy = _.assign({}, challenge.legacy, data.legacy);
      _.set(data, "legacy.directProjectId", challenge.legacy.directProjectId);
    }
  }

  // Remove fields from data that are not allowed to be updated and that match the existing challenge
  data = sanitizeData(sanitizeChallenge(data), challenge);
  logger.debug(`Sanitized Data: ${JSON.stringify(data)}`);

  const challengeResources = await helper.getChallengeResources(challengeId);

  await challengeHelper.validateChallengeUpdateRequest(
    currentUser,
    challenge,
    data,
    challengeResources
  );
  validateTask(currentUser, challenge, data, challengeResources);

  let sendActivationEmail = false;
  let sendSubmittedEmail = false;
  let sendCompletedEmail = false;
  let sendRejectedEmail = false;

  /* BEGIN self-service stuffs */

  // TODO: At some point in the future this should be moved to a Self-Service Challenge Helper

  if (challenge.legacy.selfService) {
    // prettier-ignore
    sendSubmittedEmail = data.status === constants.challengeStatuses.Draft && challenge.status !== constants.challengeStatuses.Draft;

    if (data.metadata && data.metadata.length > 0) {
      let dynamicDescription = _.cloneDeep(data.description || challenge.description);
      for (const entry of data.metadata) {
        const regexp = new RegExp(`{{${entry.name}}}`, "g");
        dynamicDescription = dynamicDescription.replace(regexp, entry.value);
      }
      data.description = dynamicDescription;
    }

    // check if it's a self service challenge and project needs to be activated first
    if (
      (data.status === constants.challengeStatuses.Approved ||
        data.status === constants.challengeStatuses.Active) &&
      challenge.status !== constants.challengeStatuses.Active &&
      challengeHelper.isProjectIdRequired(challenge.timelineTemplateId)
    ) {
      try {
        const selfServiceProjectName = `Self service - ${challenge.createdBy} - ${challenge.name}`;
        const workItemSummary = _.get(
          _.find(_.get(challenge, "metadata", []), (m) => m.name === "websitePurpose.description"),
          "value",
          "N/A"
        );
        await helper.activateProject(
          projectId,
          currentUser,
          selfServiceProjectName,
          workItemSummary
        );

        sendActivationEmail = data.status === constants.challengeStatuses.Active;
      } catch (e) {
        await updateChallenge(
          currentUser,
          challengeId,
          {
            ...data,
            status: constants.challengeStatuses.CancelledPaymentFailed,
            cancelReason: `Failed to activate project. Error: ${e.message}. JSON: ${JSON.stringify(
              e
            )}`,
          },
          false
        );
        throw new errors.BadRequestError(
          "Failed to activate the challenge! The challenge has been canceled!"
        );
      }
    }

    if (
      data.status === constants.challengeStatuses.Draft &&
      challengeHelper.isProjectIdRequired(challenge.timelineTemplateId)
    ) {
      try {
        await helper.updateSelfServiceProjectInfo(
          projectId,
          data.endDate || challenge.endDate,
          currentUser
        );
      } catch (e) {
        logger.debug(`There was an error trying to update the project: ${e.message}`);
      }
    }

    if (
      (data.status === constants.challengeStatuses.CancelledRequirementsInfeasible ||
        data.status === constants.challengeStatuses.CancelledPaymentFailed) &&
      challengeHelper.isProjectIdRequired(challenge.timelineTemplateId)
    ) {
      try {
        await helper.cancelProject(challenge.projectId, data.cancelReason, currentUser);
      } catch (e) {
        logger.debug(`There was an error trying to cancel the project: ${e.message}`);
      }
      sendRejectedEmail = true;
    }
  }

  /* END self-service stuffs */

  let isChallengeBeingActivated = false;
  let isChallengeBeingCancelled = false;
  if (data.status) {
    if (data.status === constants.challengeStatuses.Active) {
      // if activating a challenge, the challenge must have a billing account id
      if (
        (!billingAccountId || billingAccountId === null) &&
        challenge.status === constants.challengeStatuses.Draft &&
        challengeHelper.isProjectIdRequired(challenge.timelineTemplateId)
      ) {
        throw new errors.BadRequestError(
          "Cannot Activate this project, it has no active billing account."
        );
      }
      if (challenge.status === constants.challengeStatuses.Draft) {
        isChallengeBeingActivated = true;
      }
    }

    if (
      _.includes(
        [
          constants.challengeStatuses.Cancelled,
          constants.challengeStatuses.CancelledRequirementsInfeasible,
          constants.challengeStatuses.CancelledPaymentFailed,
          constants.challengeStatuses.CancelledFailedReview,
          constants.challengeStatuses.CancelledFailedScreening,
          constants.challengeStatuses.CancelledZeroSubmissions,
          constants.challengeStatuses.CancelledWinnerUnresponsive,
          constants.challengeStatuses.CancelledClientRequest,
          constants.challengeStatuses.CancelledZeroRegistrations,
        ],
        data.status
      )
    ) {
      isChallengeBeingCancelled = true;
    }

    if (data.status === constants.challengeStatuses.Completed) {
      if (
        !_.get(challenge, "legacy.pureV5Task") &&
        !_.get(challenge, "legacy.pureV5") &&
        challenge.status !== constants.challengeStatuses.Active
      ) {
        throw new errors.BadRequestError("You cannot mark a Draft challenge as Completed");
      }
      sendCompletedEmail = true;
    }
  }

  // Only M2M can update url and options of discussions
  if (data.discussions && data.discussions.length > 0) {
    if (challenge.discussions && challenge.discussions.length > 0) {
      for (let i = 0; i < data.discussions.length; i += 1) {
        if (_.isUndefined(data.discussions[i].id)) {
          data.discussions[i].id = uuid();
          if (!currentUser.isMachine) {
            _.unset(data.discussions, "url");
            _.unset(data.discussions, "options");
          }
        } else if (!currentUser.isMachine) {
          const existingDiscussion = _.find(
            _.get(challenge, "discussions", []),
            (d) => d.id === data.discussions[i].id
          );
          if (existingDiscussion) {
            _.assign(data.discussions[i], _.pick(existingDiscussion, ["url", "options"]));
          } else {
            _.unset(data.discussions, "url");
            _.unset(data.discussions, "options");
          }
        }
      }
    } else {
      for (let i = 0; i < data.discussions.length; i += 1) {
        data.discussions[i].id = uuid();
        data.discussions[i].name = data.discussions[i].name.substring(
          0,
          config.FORUM_TITLE_LENGTH_LIMIT
        );
      }
    }
  }

  // TODO: Fix this Tech Debt once legacy is turned off
  const finalStatus = data.status || challenge.status;
  const finalTimelineTemplateId = data.timelineTemplateId || challenge.timelineTemplateId;
  let timelineTemplateChanged = false;
  if (
    !currentUser.isMachine &&
    !hasAdminRole(currentUser) &&
    !_.get(data, "legacy.pureV5") &&
    !_.get(challenge, "legacy.pureV5")
  ) {
    if (
      finalStatus !== constants.challengeStatuses.New &&
      finalTimelineTemplateId !== challenge.timelineTemplateId
    ) {
      throw new errors.BadRequestError(
        `Cannot change the timelineTemplateId for challenges with status: ${finalStatus}`
      );
    }
  } else if (finalTimelineTemplateId !== challenge.timelineTemplateId) {
    // make sure there are no previous phases if the timeline template has changed
    challenge.phases = [];
    timelineTemplateChanged = true;
  }

  if (data.prizeSets) {
    if (
      isDifferentPrizeSets(data.prizeSets, challenge.prizeSets) &&
      finalStatus === constants.challengeStatuses.Completed
    ) {
      // Allow only M2M to update prizeSets for completed challenges
      if (!currentUser.isMachine || (challenge.task != null && challenge.task.isTask !== true)) {
        throw new errors.BadRequestError(
          `Cannot update prizeSets for challenges with status: ${finalStatus}!`
        );
      }
    }

    const prizeSetsGroup = _.groupBy(data.prizeSets, "type");
    if (prizeSetsGroup[constants.prizeSetTypes.ChallengePrizes]) {
      const totalPrizes = helper.sumOfPrizes(
        prizeSetsGroup[constants.prizeSetTypes.ChallengePrizes][0].prizes
      );
      _.assign(data, { overview: { totalPrizes } });
    }
  }

  let phasesUpdated = false;
  if (
    ((data.phases && data.phases.length > 0) ||
      isChallengeBeingActivated ||
      timelineTemplateChanged) &&
    !isChallengeBeingCancelled
  ) {
    if (
      challenge.status === constants.challengeStatuses.Completed ||
      challenge.status.indexOf(constants.challengeStatuses.Cancelled) > -1
    ) {
      throw new BadRequestError(
        `Challenge phase/start date can not be modified for Completed or Cancelled challenges.`
      );
    }
    const newStartDate = data.startDate || challenge.startDate;
    let newPhases;
    if (timelineTemplateChanged) {
      newPhases = await phaseHelper.populatePhasesForChallengeCreation(
        data.phases,
        newStartDate,
        finalTimelineTemplateId
      );
    } else {
      newPhases = await phaseHelper.populatePhasesForChallengeUpdate(
        challenge.phases,
        data.phases,
        challenge.timelineTemplateId,
        isChallengeBeingActivated
      );
    }
    phasesUpdated = true;
    data.phases = newPhases;
  }
  if (isChallengeBeingCancelled && challenge.phases && challenge.phases.length > 0) {
    data.phases = phaseHelper.handlePhasesAfterCancelling(challenge.phases);
    phasesUpdated = true;
  }
  if (phasesUpdated || data.startDate) {
    data.startDate = convertToISOString(_.min(_.map(data.phases, "scheduledStartDate")));
  }
  if (phasesUpdated || data.endDate) {
    data.endDate = convertToISOString(_.max(_.map(data.phases, "scheduledEndDate")));
  }

  if (data.winners && data.winners.length && data.winners.length > 0) {
    await validateWinners(data.winners, challengeResources);
    if (_.get(challenge, "legacy.pureV5Task", false)) {
      _.each(data.winners, (w) => {
        w.type = constants.prizeSetTypes.ChallengePrizes;
      });
    }
  }

  // Only m2m tokens are allowed to modify the `task.*` information on a challenge
  if (!_.isUndefined(_.get(data, "task")) && !currentUser.isMachine) {
    if (!_.isUndefined(_.get(challenge, "task"))) {
      logger.info(
        `User ${
          currentUser.handle || currentUser.sub
        } is not allowed to modify the task information on challenge ${challengeId}`
      );
      data.task = challenge.task;
      logger.info(
        `Task information on challenge ${challengeId} is reset to ${JSON.stringify(
          challenge.task
        )}. Original data: ${JSON.stringify(data.task)}`
      );
    } else {
      delete data.task;
    }
  }

  // task.memberId goes out of sync due to another processor setting "task.memberId" but subsequent immediate update to the task
  // will not have the memberId set. So we need to set it using winners to ensure it is always in sync. The proper fix is to correct
  // the sync issue in the processor. However this is quick fix that works since winner.userId is task.memberId.
  if (_.get(challenge, "legacy.pureV5Task") && !_.isUndefined(data.winners)) {
    const winnerMemberId = _.get(data.winners, "[0].userId");
    logger.info(
      `Setting task.memberId to ${winnerMemberId} for challenge ${challengeId}. Task ${_.get(
        data,
        "task"
      )} - ${_.get(challenge, "task")}`
    );

    if (winnerMemberId != null && _.get(data, "task.memberId") !== winnerMemberId) {
      logger.info(`Task ${challengeId} has a winner ${winnerMemberId}`);
      data.task = {
        isTask: true,
        isAssigned: true,
        memberId: winnerMemberId,
      };
      logger.warn(
        `task.memberId mismatched with winner memberId. task.memberId is updated to ${winnerMemberId}`
      );
    } else {
      logger.info(`task ${challengeId} has no winner set yet.`);
    }
  } else {
    logger.info(`${challengeId} is not a pureV5 challenge or has no winners set yet.`);
  }

  const { track, type } = await challengeHelper.validateAndGetChallengeTypeAndTrack({
    typeId: challenge.typeId,
    trackId: challenge.trackId,
    timelineTemplateId: timelineTemplateChanged
      ? finalTimelineTemplateId
      : challenge.timelineTemplateId,
  });

  if (_.get(type, "isTask")) {
    if (!_.isEmpty(_.get(data, "task.memberId"))) {
      const registrants = _.filter(
        challengeResources,
        (r) => r.roleId === config.SUBMITTER_ROLE_ID
      );
      if (
        !_.find(
          registrants,
          (r) => _.toString(r.memberId) === _.toString(_.get(data, "task.memberId"))
        )
      ) {
        throw new errors.BadRequestError(
          `Member ${_.get(
            data,
            "task.memberId"
          )} is not a submitter resource of challenge ${challengeId}`
        );
      }
    }
  }

  if (!_.isUndefined(data.terms)) {
    await helper.validateChallengeTerms(data.terms);
  }

  if (data.phases && data.phases.length > 0) {
    if (deepEqual(data.phases, challenge.phases)) {
      delete data.phases;
    }
  }

  // convert data to prisma models
  const updateData = prismaHelper.convertChallengeSchemaToPrisma(currentUser, _.omit(data, ['cancelReason']))
  updateData.updatedBy = _.toString(currentUser.userId)
  // reset createdBy
  delete updateData.createdBy

  const newPrizeType = challengeHelper.validatePrizeSetsAndGetPrizeType(updateData.prizeSets);
  if (newPrizeType != null && existingPrizeType != null && newPrizeType !== existingPrizeType) {
    throw new errors.BadRequestError(
      `Cannot change prize type from ${existingPrizeType} to ${newPrizeType}`
    );
  }
  const updatedChallenge = await prisma.$transaction(async (tx) => {
    // drop nested data if updated
    if (!_.isNil(updateData.legacyRecord)) {
      await tx.challengeLegacy.deleteMany({ where: { challengeId } })
    }
    if (!_.isNil(updateData.billingRecord)) {
      await tx.challengeBilling.deleteMany({ where: { challengeId } })
    }
    if (!_.isNil(updateData.constraintRecord)) {
      await tx.challengeConstraint.deleteMany({ where: { challengeId } })
    }
    if (!_.isNil(updateData.events)) {
      await tx.challengeEvent.deleteMany({ where: { challengeId } })
    }
    if (!_.isNil(updateData.discussions)) {
      await tx.challengeDiscussion.deleteMany({ where: { challengeId } })
    }
    if (!_.isNil(updateData.metadata)) {
      await tx.challengeMetadata.deleteMany({ where: { challengeId } })
    }
    if (!_.isNil(updateData.phases)) {
      await tx.challengePhase.deleteMany({ where: { challengeId } })
    }
    if (!_.isNil(updateData.prizeSets)) {
      await tx.challengePrizeSet.deleteMany({ where: { challengeId } })
    }
    if (_.isNil(updateData.winners)) {
      await tx.challengeWinner.deleteMany({ where: { challengeId } })
    }
    if (_.isNil(updateData.attachment)) {
      await tx.attachment.deleteMany({ where: { challengeId } })
    }
    if (_.isNil(updateData.terms)) {
      await tx.challengeTerm.deleteMany({ where: { challengeId } })
    }
    if (_.isNil(updateData.skills)) {
      await tx.challengeSkill.deleteMany({ where: { challengeId } })
    }

    return await tx.challenge.update({
      data: updateData,
      where: { id: challengeId },
      include: includeReturnFields
    })
  })
  await indexChallengeAndPostToKafka(updatedChallenge, track, type)

  if (updatedChallenge.legacy.selfService) {
    const creator = await helper.getMemberByHandle(updatedChallenge.createdBy);
    if (sendSubmittedEmail) {
      await helper.sendSelfServiceNotification(
        constants.SelfServiceNotificationTypes.WORK_REQUEST_SUBMITTED,
        [{ email: creator.email }],
        {
          handle: creator.handle,
          workItemName: updatedChallenge.name,
        }
      );
    }
    if (sendActivationEmail) {
      await helper.sendSelfServiceNotification(
        constants.SelfServiceNotificationTypes.WORK_REQUEST_STARTED,
        [{ email: creator.email }],
        {
          handle: creator.handle,
          workItemName: updatedChallenge.name,
          workItemUrl: `${config.SELF_SERVICE_APP_URL}/work-items/${updatedChallenge.id}`,
        }
      );
    }
    if (sendCompletedEmail) {
      await helper.sendSelfServiceNotification(
        constants.SelfServiceNotificationTypes.WORK_COMPLETED,
        [{ email: creator.email }],
        {
          handle: creator.handle,
          workItemName: updatedChallenge.name,
          workItemUrl: `${config.SELF_SERVICE_APP_URL}/work-items/${updatedChallenge.id}?tab=solutions`,
        }
      );
    }
    if (sendRejectedEmail || data.cancelReason) {
      logger.debug("Should send redirected email");
      await helper.sendSelfServiceNotification(
        constants.SelfServiceNotificationTypes.WORK_REQUEST_REDIRECTED,
        [{ email: creator.email }],
        {
          handle: creator.handle,
          workItemName: updatedChallenge.name,
        }
      );
    }
  }

  return updatedChallenge;
}

updateChallenge.schema = {
  currentUser: Joi.any(),
  challengeId: Joi.id(),
  data: Joi.object()
    .keys({
      legacy: Joi.object()
        .keys({
          track: Joi.string(),
          subTrack: Joi.string(),
          reviewType: Joi.string()
            .valid(_.values(constants.reviewTypes))
            .insensitive()
            .default(constants.reviewTypes.Internal),
          confidentialityType: Joi.string()
            .allow(null, "")
            .empty(null, "")
            .default(config.DEFAULT_CONFIDENTIALITY_TYPE),
          directProjectId: Joi.number(),
          forumId: Joi.number().integer(),
          isTask: Joi.boolean(),
          useSchedulingAPI: Joi.boolean(),
          pureV5Task: Joi.boolean(),
          pureV5: Joi.boolean(),
          selfService: Joi.boolean(),
          selfServiceCopilot: Joi.string().allow(null),
        })
        .unknown(true),
      cancelReason: Joi.string().optional(),
      task: Joi.object()
        .keys({
          isTask: Joi.boolean().default(false),
          isAssigned: Joi.boolean().default(false),
          memberId: Joi.alternatives().try(Joi.string().allow(null), Joi.number().allow(null)),
        })
        .optional(),
      billing: Joi.object()
        .keys({
          billingAccountId: Joi.string(),
          markup: Joi.number().min(0).max(100),
        })
        .unknown(true),
      trackId: Joi.optionalId(),
      typeId: Joi.optionalId(),
      name: Joi.string().optional(),
      description: Joi.string().optional(),
      privateDescription: Joi.string().allow("").optional(),
      descriptionFormat: Joi.string().optional(),
      metadata: Joi.array()
        .items(
          Joi.object()
            .keys({
              name: Joi.string().required(),
              value: Joi.required(),
            })
            .unknown(true)
        )
        .unique((a, b) => a.name === b.name),
      timelineTemplateId: Joi.string().optional(), // changing this to update migrated challenges
      phases: Joi.array()
        .items(
          Joi.object()
            .keys({
              phaseId: Joi.id(),
              duration: Joi.number().integer().min(0),
              isOpen: Joi.boolean(),
              actualEndDate: Joi.date().allow(null),
              scheduledStartDate: Joi.date().allow(null),
              constraints: Joi.array()
                .items(
                  Joi.object()
                    .keys({
                      name: Joi.string(),
                      value: Joi.number().integer().min(0),
                    })
                    .optional()
                )
                .optional(),
            })
            .unknown(true)
        )
        .min(1)
        .optional(),
      events: Joi.array().items(
        Joi.object()
          .keys({
            id: Joi.number().required(),
            name: Joi.string(),
            key: Joi.string(),
          })
          .unknown(true)
          .optional()
      ),
      discussions: Joi.array()
        .items(
          Joi.object().keys({
            id: Joi.optionalId(),
            name: Joi.string().required(),
            type: Joi.string().required().valid(_.values(constants.DiscussionTypes)),
            provider: Joi.string().required(),
            url: Joi.string(),
            options: Joi.array().items(Joi.object()),
          })
        )
        .optional(),
      startDate: Joi.date().iso(),
      prizeSets: Joi.array()
        .items(
          Joi.object()
            .keys({
              type: Joi.string().valid(_.values(constants.prizeSetTypes)).required(),
              description: Joi.string(),
              prizes: Joi.array()
                .items(
                  Joi.object().keys({
                    description: Joi.string(),
                    type: Joi.string().required(),
                    value: Joi.number().min(0).required(),
                  })
                )
                .min(1)
                .required(),
            })
            .unknown(true)
        )
        .min(1),
      tags: Joi.array().items(Joi.string()), // tag names
      projectId: Joi.number().integer().positive(),
      legacyId: Joi.number().integer().positive(),
      constraints: Joi.object()
        .keys({
          allowedRegistrants: Joi.array().items(Joi.string().trim().lowercase()).optional(),
        })
        .optional(),
      status: Joi.string().valid(_.values(constants.challengeStatuses)),
      attachments: Joi.array().items(
        Joi.object().keys({
          id: Joi.id(),
          challengeId: Joi.id(),
          name: Joi.string().required(),
          url: Joi.string().uri().required(),
          fileSize: Joi.fileSize(),
          description: Joi.string(),
        })
      ),
      groups: Joi.array().items(Joi.optionalId()).unique(),
      // gitRepoURLs: Joi.array().items(Joi.string().uri()),
      winners: Joi.array()
        .items(
          Joi.object()
            .keys({
              userId: Joi.number().integer().positive().required(),
              handle: Joi.string().required(),
              placement: Joi.number().integer().positive().required(),
              type: Joi.string().valid(_.values(constants.prizeSetTypes)),
            })
            .unknown(true)
        )
        .optional(),
      terms: Joi.array().items(
        Joi.object().keys({
          id: Joi.id(),
          roleId: Joi.id(),
        })
      ),
      skills: Joi.array()
        .items(
          Joi.object()
            .keys({
              id: Joi.id(),
            })
            .unknown(true)
        )
        .optional(),
      overview: Joi.any().forbidden()      
    })
    .unknown(true)
    .required(),
};

/**
 * Send notifications
 * @param {Object} currentUser the current use
 * @param {String} challengeId the challenge id
 */
async function sendNotifications(currentUser, challengeId) {
  const challenge = await getChallenge(currentUser, challengeId);
  const creator = await helper.getMemberByHandle(challenge.createdBy);
  if (challenge.status === constants.challengeStatuses.Completed) {
    await helper.sendSelfServiceNotification(
      constants.SelfServiceNotificationTypes.WORK_COMPLETED,
      [{ email: creator.email }],
      {
        handle: creator.handle,
        workItemName: challenge.name,
        workItemUrl: `${config.SELF_SERVICE_APP_URL}/work-items/${challenge.id}?tab=solutions`,
      }
    );
    return { type: constants.SelfServiceNotificationTypes.WORK_COMPLETED };
  }
}

sendNotifications.schema = {
  currentUser: Joi.any(),
  challengeId: Joi.id(),
};

/**
 * Remove unwanted properties from the challenge object
 * @param {Object} challenge the challenge object
 */
function sanitizeChallenge(challenge) {
  const sanitized = _.pick(challenge, [
    "trackId",
    "typeId",
    "name",
    "description",
    "privateDescription",
    "descriptionFormat",
    "timelineTemplateId",
    "tags",
    "projectId",
    "legacyId",
    "startDate",
    "status",
    "task",
    "groups",
    "cancelReason",
    "constraints",
    "skills",
  ]);
  if (!_.isUndefined(sanitized.name)) {
    sanitized.name = xss(sanitized.name);
  }
  // Only Sanitize description if it is in HTML format
  // Otherwise, it is in Markdown format and we don't want to sanitize it - a future enhancement can be
  // using a markdown sanitizer
  if (challenge.descriptionFormat === "html" && !_.isUndefined(sanitized.description)) {
    sanitized.description = xss(sanitized.description);
  }
  if (challenge.legacy) {
    sanitized.legacy = _.pick(challenge.legacy, [
      "track",
      "subTrack",
      "reviewType",
      "confidentialityType",
      "forumId",
      "directProjectId",
      "screeningScorecardId",
      "reviewScorecardId",
      "isTask",
      "useSchedulingAPI",
      "pureV5Task",
      "pureV5",
      "selfService",
      "selfServiceCopilot",
    ]);
  }
  if (challenge.billing) {
    sanitized.billing = _.pick(challenge.billing, ["billingAccountId", "markup"]);
  }
  if (challenge.metadata) {
    sanitized.metadata = _.map(challenge.metadata, (meta) => _.pick(meta, ["name", "value"]));
  }
  if (challenge.phases) {
    sanitized.phases = _.map(challenge.phases, (phase) =>
      _.pick(phase, ["phaseId", "duration", "scheduledStartDate", "constraints"])
    );
  }
  if (challenge.prizeSets) {
    sanitized.prizeSets = _.map(challenge.prizeSets, (prizeSet) => ({
      ..._.pick(prizeSet, ["type", "description"]),
      prizes: _.map(prizeSet.prizes, (prize) => _.pick(prize, ["description", "type", "value"])),
    }));
  }
  if (challenge.events) {
    sanitized.events = _.map(challenge.events, (event) => _.pick(event, ["id", "name", "key"]));
  }
  if (challenge.winners) {
    sanitized.winners = _.map(challenge.winners, (winner) =>
      _.pick(winner, ["userId", "handle", "placement", "type"])
    );
  }
  if (challenge.discussions) {
    sanitized.discussions = _.map(challenge.discussions, (discussion) => ({
      ..._.pick(discussion, ["id", "provider", "name", "type", "url", "options"]),
      name: _.get(discussion, "name", "").substring(0, config.FORUM_TITLE_LENGTH_LIMIT),
    }));
  }
  if (challenge.terms) {
    sanitized.terms = _.map(challenge.terms, (term) => _.pick(term, ["id", "roleId"]));
  }
  if (challenge.attachments) {
    sanitized.attachments = _.map(challenge.attachments, (attachment) =>
      _.pick(attachment, ["id", "name", "url", "fileSize", "description", "challengeId"])
    );
  }

  return sanitized;
}

function sanitizeData(data, challenge) {
  for (const key in data) {
    if (key === "phases") continue;

    if (challenge.hasOwnProperty(key)) {
      if (key === "skills" && deepEqual(_.map(data.skills, "id"), _.map(challenge.skills, "id"))) {
        delete data[key];
        continue;
      }

      if (
        (typeof data[key] === "object" || Array.isArray(data[key])) &&
        deepEqual(data[key], challenge[key])
      ) {
        delete data[key];
      } else if (
        typeof data[key] !== "object" &&
        !Array.isArray(data[key]) &&
        data[key] === challenge[key]
      ) {
        delete data[key];
      }
    }
  }
  return data;
}

/**
 * Delete challenge.
 * @param {Object} currentUser the user who perform operation
 * @param {String} challengeId the challenge id
 * @returns {Object} the deleted challenge
 */
async function deleteChallenge (currentUser, challengeId) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId, status: constants.challengeStatuses.New.toUpperCase() }
  })
  if (_.isNil(challenge) || _.isNil(challenge.id)) {
    throw new errors.NotFoundError(
      `Challenge with id: ${challengeId} doesn't exist or is not in New status`
    );
  }
  // ensure user can modify challenge
  await helper.ensureUserCanModifyChallenge(currentUser, challenge);
  // delete DB record
  await prisma.challenge.delete({ where: { id: challengeId } })

  await helper.postBusEvent(constants.Topics.ChallengeDeleted, {
    id: challengeId,
  });
  prismaHelper.convertModelToResponse(challenge);
  return challenge;
}

deleteChallenge.schema = {
  currentUser: Joi.any(),
  challengeId: Joi.id(),
};

async function advancePhase(currentUser, challengeId, data) {
  logger.info(`Advance Phase Request - ${challengeId} - ${JSON.stringify(data)}`);
  const machineOrAdmin = currentUser && (currentUser.isMachine || hasAdminRole(currentUser))
  if (!machineOrAdmin) {
    throw new errors.ForbiddenError(
      `Admin role or an M2M token is required to advance the challenge phase.`
    );
  }
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId }, include: includeReturnFields })

  if (!_.isNil(challenge) || _.isNil(challenge.id)) {
    throw new errors.NotFoundError(`Challenge with id: ${challengeId} doesn't exist.`);
  }
  if (challenge.status !== constants.challengeStatuses.Active) {
    throw new errors.BadRequestError(
      `Challenge with id: ${challengeId} is not in Active status.`
    );
  }

  const phaseAdvancerResult = await phaseAdvancer.advancePhase(
    challenge.id,
    challenge.legacyId,
    challenge.phases,
    data.operation,
    data.phase
  );

  const auditFields = {
    createdBy: _.toString(currentUser.userId),
    updatedBy: _.toString(currentUser.userId)
  }
  if (!phaseAdvancerResult.success) {
    return phaseAdvancerResult
  }
  // update phase if result is successful
  const challengeData = {}
  const updatedPhaseData = {
    phases: phaseAdvancerResult.updatedPhases
  }
  prismaHelper.convertChallengePhaseSchema(updatedPhaseData, challengeData, auditFields)
  // Perform partially update for now
  const newPhases = challengeData.phases
  const newChallengeData = _.pick(challengeData, ['currentPhaseNames',
    'registrationStartDate', 'registrationEndDate', 'submissionStartDate', 'submissionEndDate'])

  // TODO: This is a temporary solution to update the challenge status to Completed; We currently do not have a way to get winner list using v5 data
  // TODO: With the implementation of v5 review API we'll develop a mechanism to maintain the winner list in v5 data that challenge-api can use to create the winners list
  if (phaseAdvancerResult.hasWinningSubmission === true) {
    newChallengeData.status = constants.challengeStatuses.Completed.toUpperCase()
  }
  await prisma.$transaction(async (tx) => {
    // upsert phases one by one
    for (let newPhase of newPhases) {
      await tx.challengePhase.upsert({
        where: {
          challengeId,
          phaseId: newPhase.phaseId
        },
        create: { ...newPhase, challengeId },
        update: newPhase
      })
    }
    await tx.challenge.update({
      where: { id: challengeId },
      data: newChallengeData
    })
  })
  const updatedChallenge = await tx.challenge.findUnique({ where: { id: challengeId } })
  await indexChallengeAndPostToKafka(updatedChallenge)

  return {
    success: true,
    message: phaseAdvancerResult.message,
    next: phaseAdvancerResult.next
  }
  // Indexing in Kafka is not necessary here since domain-challenge will do it
}

advancePhase.schema = {
  currentUser: Joi.any(),
  challengeId: Joi.id(),
  data: Joi.object()
    .keys({
      phase: Joi.string().required(),
      operation: Joi.string().lowercase().valid("open", "close").required(),
    })
    .required(),
};

async function indexChallengeAndPostToKafka(updatedChallenge, track, type) {
  const prizeType = challengeHelper.validatePrizeSetsAndGetPrizeType(updatedChallenge.prizeSets);

  if (prizeType === constants.prizeTypes.USD) {
    convertPrizeSetValuesToDollars(updatedChallenge.prizeSets, updatedChallenge.overview);
  }

  if (track == null || type == null) {
    const trackAndTypeData = await challengeHelper.validateAndGetChallengeTypeAndTrack({
      typeId: updatedChallenge.typeId,
      trackId: updatedChallenge.trackId,
      timelineTemplateId: updatedChallenge.timelineTemplateId,
    });

    if (trackAndTypeData != null) {
      track = trackAndTypeData.track;
      type = trackAndTypeData.type;
    }
  }

  // post bus event
  logger.debug(
    `Post Bus Event: ${constants.Topics.ChallengeUpdated} ${JSON.stringify(updatedChallenge)}`
  );

  prismaHelper.convertModelToResponse(updatedChallenge);
  enrichChallengeForResponse(updatedChallenge, track, type);

  await helper.postBusEvent(constants.Topics.ChallengeUpdated, updatedChallenge, {
    key:
      updatedChallenge.status === "Completed"
        ? `${updatedChallenge.id}:${updatedChallenge.status}`
        : undefined,
  });
}

module.exports = {
  searchChallenges,
  createChallenge,
  getChallenge,
  updateChallenge,
  deleteChallenge,
  getChallengeStatistics,
  sendNotifications,
  advancePhase,
};

logger.buildService(module.exports);
