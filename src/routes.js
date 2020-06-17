/**
 * Contains all routes
 */

const constants = require('../app-constants')
const { SCOPES: {
  READ,
  CREATE,
  UPDATE,
  DELETE,
  ALL
} } = require('config')

module.exports = {
  '/challenges': {
    get: {
      controller: 'ChallengeController',
      method: 'searchChallenges',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot, constants.UserRoles.User],
      scopes: [READ, ALL]
    },
    post: {
      controller: 'ChallengeController',
      method: 'createChallenge',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [CREATE, ALL]
    }
  },
  '/challenges/health': {
    get: {
      controller: 'HealthController',
      method: 'checkHealth'
    }
  },
  '/challenges/:challengeId': {
    get: {
      controller: 'ChallengeController',
      method: 'getChallenge',
      scopes: [READ, ALL]
    },
    put: {
      controller: 'ChallengeController',
      method: 'fullyUpdateChallenge',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [UPDATE, ALL]
    },
    patch: {
      controller: 'ChallengeController',
      method: 'partiallyUpdateChallenge',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [UPDATE, ALL]
    }
  },
  '/challenge-types': {
    get: {
      controller: 'ChallengeTypeController',
      method: 'searchChallengeTypes'
    },
    post: {
      controller: 'ChallengeTypeController',
      method: 'createChallengeType',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [CREATE, ALL]
    }
  },
  '/challenge-types/:challengeTypeId': {
    get: {
      controller: 'ChallengeTypeController',
      method: 'getChallengeType'
    },
    put: {
      controller: 'ChallengeTypeController',
      method: 'fullyUpdateChallengeType',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [UPDATE, ALL]
    },
    patch: {
      controller: 'ChallengeTypeController',
      method: 'partiallyUpdateChallengeType',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [UPDATE, ALL]
    }
  },
  '/challenge-timelines': {
    get: {
      controller: 'ChallengeTypeTimelineTemplateController',
      method: 'searchChallengeTypeTimelineTemplates'
      // auth: 'jwt',
      // access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      // scopes: [READ, ALL]
    },
    post: {
      controller: 'ChallengeTypeTimelineTemplateController',
      method: 'createChallengeTypeTimelineTemplate',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [CREATE, ALL]
    }
  },
  '/challenge-timelines/:challengeTypeTimelineTemplateId': {
    get: {
      controller: 'ChallengeTypeTimelineTemplateController',
      method: 'getChallengeTypeTimelineTemplate'
      // auth: 'jwt',
      // access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      // scopes: [READ, ALL]
    },
    put: {
      controller: 'ChallengeTypeTimelineTemplateController',
      method: 'fullyUpdateChallengeTypeTimelineTemplate',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [UPDATE, ALL]
    },
    delete: {
      controller: 'ChallengeTypeTimelineTemplateController',
      method: 'deleteChallengeTypeTimelineTemplate',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [DELETE, ALL]
    }
  },
  '/challenge-audit-logs': {
    get: {
      controller: 'AuditLogController',
      method: 'searchAuditLogs',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [READ]
    }
  },
  '/challenge-phases': {
    get: {
      controller: 'ChallengePhaseController',
      method: 'searchPhases',
      scopes: [READ, ALL]
    },
    post: {
      controller: 'ChallengePhaseController',
      method: 'createPhase',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [CREATE, ALL]
    }
  },
  '/challenge-phases/:challengePhaseId': {
    get: {
      controller: 'ChallengePhaseController',
      method: 'getPhase',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [READ, ALL]
    },
    put: {
      controller: 'ChallengePhaseController',
      method: 'fullyUpdatePhase',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [UPDATE, ALL]
    },
    patch: {
      controller: 'ChallengePhaseController',
      method: 'partiallyUpdatePhase',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [UPDATE, ALL]
    },
    delete: {
      controller: 'ChallengePhaseController',
      method: 'deletePhase',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [DELETE, ALL]
    }
  },
  '/timeline-templates': {
    get: {
      controller: 'TimelineTemplateController',
      method: 'searchTimelineTemplates',
      scopes: [READ, ALL]
    },
    post: {
      controller: 'TimelineTemplateController',
      method: 'createTimelineTemplate',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [CREATE, ALL]
    }
  },
  '/timeline-templates/:timelineTemplateId': {
    get: {
      controller: 'TimelineTemplateController',
      method: 'getTimelineTemplate',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [READ, ALL]
    },
    put: {
      controller: 'TimelineTemplateController',
      method: 'fullyUpdateTimelineTemplate',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [UPDATE, ALL]
    },
    patch: {
      controller: 'TimelineTemplateController',
      method: 'partiallyUpdateTimelineTemplate',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [UPDATE, ALL]
    },
    delete: {
      controller: 'TimelineTemplateController',
      method: 'deleteTimelineTemplate',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [DELETE, ALL]
    }
  },
  '/challenges/:challengeId/attachments': {
    post: {
      controller: 'AttachmentController',
      method: 'uploadAttachment',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [CREATE, ALL]
    }
  },
  '/challenges/:challengeId/attachments/:attachmentId': {
    get: {
      controller: 'AttachmentController',
      method: 'downloadAttachment',
      auth: 'jwt', // any authenticated role is allowed
      scopes: [READ, ALL]
    }
  }
}
