/**
 * Contains all routes
 */

const constants = require('../app-constants')
const { SCOPES: {
  CHALLENGES,
  CHALLENGE_TYPES,
  CHALLENGE_TYPE_TIMELINE_TEMPLATES,
  CHALLENGE_SETTINGS,
  CHALLENGE_AUDIT_LOGS,
  CHALLENGE_PHASES,
  TIMELINE_TEMPLATES,
  CHALLENGE_ATTACHMENTS
} } = require('config')

module.exports = {
  '/challenges': {
    get: {
      controller: 'ChallengeController',
      method: 'searchChallenges',
      scopes: [CHALLENGES.READ, CHALLENGES.ALL]
    },
    post: {
      controller: 'ChallengeController',
      method: 'createChallenge',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [CHALLENGES.CREATE, CHALLENGES.ALL]
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
      scopes: [CHALLENGES.READ, CHALLENGES.ALL]
    },
    put: {
      controller: 'ChallengeController',
      method: 'fullyUpdateChallenge',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [CHALLENGES.UPDATE, CHALLENGES.ALL]
    },
    patch: {
      controller: 'ChallengeController',
      method: 'partiallyUpdateChallenge',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [CHALLENGES.UPDATE, CHALLENGES.ALL]
    }
  },
  '/challengeTypes': {
    get: {
      controller: 'ChallengeTypeController',
      method: 'searchChallengeTypes'
    },
    post: {
      controller: 'ChallengeTypeController',
      method: 'createChallengeType',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [CHALLENGE_TYPES.CREATE, CHALLENGE_TYPES.ALL]
    }
  },
  '/challengeTypes/:challengeTypeId': {
    get: {
      controller: 'ChallengeTypeController',
      method: 'getChallengeType'
    },
    put: {
      controller: 'ChallengeTypeController',
      method: 'fullyUpdateChallengeType',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [CHALLENGE_TYPES.UPDATE, CHALLENGE_TYPES.ALL]
    },
    patch: {
      controller: 'ChallengeTypeController',
      method: 'partiallyUpdateChallengeType',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [CHALLENGE_TYPES.UPDATE, CHALLENGE_TYPES.ALL]
    }
  },
  '/challengeTimelines': {
    get: {
      controller: 'ChallengeTypeTimelineTemplateController',
      method: 'searchChallengeTypeTimelineTemplates',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [CHALLENGE_TYPE_TIMELINE_TEMPLATES.READ, CHALLENGE_TYPE_TIMELINE_TEMPLATES.ALL]
    },
    post: {
      controller: 'ChallengeTypeTimelineTemplateController',
      method: 'createChallengeTypeTimelineTemplate',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [CHALLENGE_TYPE_TIMELINE_TEMPLATES.CREATE, CHALLENGE_TYPE_TIMELINE_TEMPLATES.ALL]
    }
  },
  '/challengeTimelines/:challengeTypeTimelineTemplateId': {
    get: {
      controller: 'ChallengeTypeTimelineTemplateController',
      method: 'getChallengeTypeTimelineTemplate',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [CHALLENGE_TYPE_TIMELINE_TEMPLATES.READ, CHALLENGE_TYPE_TIMELINE_TEMPLATES.ALL]
    },
    put: {
      controller: 'ChallengeTypeTimelineTemplateController',
      method: 'fullyUpdateChallengeTypeTimelineTemplate',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [CHALLENGE_TYPE_TIMELINE_TEMPLATES.UPDATE, CHALLENGE_TYPE_TIMELINE_TEMPLATES.ALL]
    },
    delete: {
      controller: 'ChallengeTypeTimelineTemplateController',
      method: 'deleteChallengeTypeTimelineTemplate',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [CHALLENGE_TYPE_TIMELINE_TEMPLATES.DELETE, CHALLENGE_TYPE_TIMELINE_TEMPLATES.ALL]
    }
  },
  '/challengeSettings': {
    get: {
      controller: 'ChallengeSettingController',
      method: 'searchChallengeSettings',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [CHALLENGE_SETTINGS.READ, CHALLENGE_SETTINGS.ALL]
    },
    post: {
      controller: 'ChallengeSettingController',
      method: 'createChallengeSetting',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [CHALLENGE_SETTINGS.CREATE, CHALLENGE_SETTINGS.ALL]
    }
  },
  '/challengeSettings/:challengeSettingId': {
    get: {
      controller: 'ChallengeSettingController',
      method: 'getChallengeSetting',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [CHALLENGE_SETTINGS.READ, CHALLENGE_SETTINGS.ALL]
    },
    put: {
      controller: 'ChallengeSettingController',
      method: 'updateChallengeSetting',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [CHALLENGE_SETTINGS.UPDATE, CHALLENGE_SETTINGS.ALL]
    }
  },
  '/challengeAuditLogs': {
    get: {
      controller: 'AuditLogController',
      method: 'searchAuditLogs',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [CHALLENGE_AUDIT_LOGS.READ]
    }
  },
  '/challengePhases': {
    get: {
      controller: 'ChallengePhaseController',
      method: 'searchPhases',
      scopes: [CHALLENGE_PHASES.READ, CHALLENGE_PHASES.ALL]
    },
    post: {
      controller: 'ChallengePhaseController',
      method: 'createPhase',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [CHALLENGE_PHASES.CREATE, CHALLENGE_PHASES.ALL]
    }
  },
  '/challengePhases/:challengePhaseId': {
    get: {
      controller: 'ChallengePhaseController',
      method: 'getPhase',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [CHALLENGE_PHASES.READ, CHALLENGE_PHASES.ALL]
    },
    put: {
      controller: 'ChallengePhaseController',
      method: 'fullyUpdatePhase',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [CHALLENGE_PHASES.UPDATE, CHALLENGE_PHASES.ALL]
    },
    patch: {
      controller: 'ChallengePhaseController',
      method: 'partiallyUpdatePhase',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [CHALLENGE_PHASES.UPDATE, CHALLENGE_PHASES.ALL]
    },
    delete: {
      controller: 'ChallengePhaseController',
      method: 'deletePhase',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [CHALLENGE_PHASES.DELETE, CHALLENGE_PHASES.ALL]
    }
  },
  '/timelineTemplates': {
    get: {
      controller: 'TimelineTemplateController',
      method: 'searchTimelineTemplates',
      scopes: [TIMELINE_TEMPLATES.READ, TIMELINE_TEMPLATES.ALL]
    },
    post: {
      controller: 'TimelineTemplateController',
      method: 'createTimelineTemplate',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [TIMELINE_TEMPLATES.CREATE, TIMELINE_TEMPLATES.ALL]
    }
  },
  '/timelineTemplates/:timelineTemplateId': {
    get: {
      controller: 'TimelineTemplateController',
      method: 'getTimelineTemplate',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [TIMELINE_TEMPLATES.READ, TIMELINE_TEMPLATES.ALL]
    },
    put: {
      controller: 'TimelineTemplateController',
      method: 'fullyUpdateTimelineTemplate',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [TIMELINE_TEMPLATES.UPDATE, TIMELINE_TEMPLATES.ALL]
    },
    patch: {
      controller: 'TimelineTemplateController',
      method: 'partiallyUpdateTimelineTemplate',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [TIMELINE_TEMPLATES.UPDATE, TIMELINE_TEMPLATES.ALL]
    },
    delete: {
      controller: 'TimelineTemplateController',
      method: 'deleteTimelineTemplate',
      auth: 'jwt',
      access: [constants.UserRoles.Admin],
      scopes: [TIMELINE_TEMPLATES.DELETE, TIMELINE_TEMPLATES.ALL]
    }
  },
  '/challenges/:challengeId/attachments': {
    post: {
      controller: 'AttachmentController',
      method: 'uploadAttachment',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [CHALLENGE_ATTACHMENTS.CREATE, CHALLENGE_ATTACHMENTS.ALL]
    }
  },
  '/challenges/:challengeId/attachments/:attachmentId': {
    get: {
      controller: 'AttachmentController',
      method: 'downloadAttachment',
      auth: 'jwt', // any authenticated role is allowed
      scopes: [CHALLENGE_ATTACHMENTS.READ, CHALLENGE_ATTACHMENTS.ALL]
    }
  }
}
