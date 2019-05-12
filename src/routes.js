/**
 * Contains all routes
 */

const constants = require('../app-constants')

module.exports = {
  '/challenges': {
    get: {
      controller: 'ChallengeController',
      method: 'searchChallenges'
    },
    post: {
      controller: 'ChallengeController',
      method: 'createChallenge',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot]
    }
  },
  '/challenges/:challengeId': {
    get: {
      controller: 'ChallengeController',
      method: 'getChallenge'
    },
    put: {
      controller: 'ChallengeController',
      method: 'fullyUpdateChallenge',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot]
    },
    patch: {
      controller: 'ChallengeController',
      method: 'partiallyUpdateChallenge',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot]
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
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot]
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
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot]
    },
    patch: {
      controller: 'ChallengeTypeController',
      method: 'partiallyUpdateChallengeType',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot]
    }
  },
  '/challengeSettings': {
    get: {
      controller: 'ChallengeSettingController',
      method: 'searchChallengeSettings',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot]
    },
    post: {
      controller: 'ChallengeSettingController',
      method: 'createChallengeSetting',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot]
    }
  },
  '/challengeSettings/:challengeSettingId': {
    get: {
      controller: 'ChallengeSettingController',
      method: 'getChallengeSetting',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot]
    },
    put: {
      controller: 'ChallengeSettingController',
      method: 'updateChallengeSetting',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot]
    }
  },
  '/challengeAuditLogs': {
    get: {
      controller: 'AuditLogController',
      method: 'searchAuditLogs',
      auth: 'jwt',
      access: [constants.UserRoles.Admin]
    }
  },
  '/challengePhases': {
    get: {
      controller: 'ChallengePhaseController',
      method: 'searchPhases',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot]
    },
    post: {
      controller: 'ChallengePhaseController',
      method: 'createPhase',
      auth: 'jwt',
      access: [constants.UserRoles.Admin]
    }
  },
  '/challengePhases/:challengePhaseId': {
    get: {
      controller: 'ChallengePhaseController',
      method: 'getPhase',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot]
    },
    put: {
      controller: 'ChallengePhaseController',
      method: 'fullyUpdatePhase',
      auth: 'jwt',
      access: [constants.UserRoles.Admin]
    },
    patch: {
      controller: 'ChallengePhaseController',
      method: 'partiallyUpdatePhase',
      auth: 'jwt',
      access: [constants.UserRoles.Admin]
    },
    delete: {
      controller: 'ChallengePhaseController',
      method: 'deletePhase',
      auth: 'jwt',
      access: [constants.UserRoles.Admin]
    }
  },
  '/timelineTemplates': {
    get: {
      controller: 'TimelineTemplateController',
      method: 'searchTimelineTemplates',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot]
    },
    post: {
      controller: 'TimelineTemplateController',
      method: 'createTimelineTemplate',
      auth: 'jwt',
      access: [constants.UserRoles.Admin]
    }
  },
  '/timelineTemplates/:timelineTemplateId': {
    get: {
      controller: 'TimelineTemplateController',
      method: 'getTimelineTemplate',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot]
    },
    put: {
      controller: 'TimelineTemplateController',
      method: 'fullyUpdateTimelineTemplate',
      auth: 'jwt',
      access: [constants.UserRoles.Admin]
    },
    patch: {
      controller: 'TimelineTemplateController',
      method: 'partiallyUpdateTimelineTemplate',
      auth: 'jwt',
      access: [constants.UserRoles.Admin]
    },
    delete: {
      controller: 'TimelineTemplateController',
      method: 'deleteTimelineTemplate',
      auth: 'jwt',
      access: [constants.UserRoles.Admin]
    }
  },
  '/challenges/:challengeId/attachments': {
    post: {
      controller: 'AttachmentController',
      method: 'uploadAttachment',
      auth: 'jwt',
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot]
    }
  },
  '/challenges/:challengeId/attachments/:attachmentId': {
    get: {
      controller: 'AttachmentController',
      method: 'downloadAttachment',
      auth: 'jwt'
      // any authenticated role is allowed
    }
  },
  '/health': {
    get: {
      controller: 'HealthController',
      method: 'checkHealth'
    }
  }
}
