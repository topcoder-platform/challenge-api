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
  }
}
