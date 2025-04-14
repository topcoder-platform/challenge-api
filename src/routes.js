/**
 * Contains all routes
 */

const constants = require("../app-constants");
const {
  SCOPES: { READ, CREATE, UPDATE, DELETE, ALL },
} = require("config");

module.exports = {
  "/challenges": {
    get: {
      controller: "ChallengeController",
      method: "searchChallenges",
      access: [
        constants.UserRoles.Admin,
        constants.UserRoles.Copilot,
        constants.UserRoles.SelfServiceCustomer,
        constants.UserRoles.Manager,
        constants.UserRoles.User,
      ],
      scopes: [READ, ALL],
    },
    post: {
      controller: "ChallengeController",
      method: "createChallenge",
      auth: "jwt",
      access: [
        constants.UserRoles.Admin,
        constants.UserRoles.SelfServiceCustomer,
        constants.UserRoles.Copilot,
        constants.UserRoles.Manager,
      ],
      scopes: [CREATE, ALL],
    },
  },
  "/challenges/support-requests": {
    post: {
      controller: "SupportController",
      method: "createRequest",
    },
  },
  "/challenges/health": {
    get: {
      controller: "HealthController",
      method: "checkHealth",
    },
  },
  "/challenges/:challengeId": {
    get: {
      controller: "ChallengeController",
      method: "getChallenge",
      scopes: [READ, ALL],
    },
    // @deprecated
    put: {
      controller: "ChallengeController",
      method: "updateChallenge",
      auth: "jwt",
      access: [
        constants.UserRoles.Admin,
        constants.UserRoles.SelfServiceCustomer,
        constants.UserRoles.Copilot,
        constants.UserRoles.Manager,
      ],
      scopes: [UPDATE, ALL],
    },
    patch: {
      controller: "ChallengeController",
      method: "updateChallenge",
      auth: "jwt",
      access: [
        constants.UserRoles.Admin,
        constants.UserRoles.SelfServiceCustomer,
        constants.UserRoles.Copilot,
        constants.UserRoles.Manager,
      ],
      scopes: [UPDATE, ALL],
    },
    delete: {
      controller: "ChallengeController",
      method: "deleteChallenge",
      auth: "jwt",
      access: [
        constants.UserRoles.Admin,
        constants.UserRoles.Copilot,
        constants.UserRoles.SelfServiceCustomer,
        constants.UserRoles.Manager,
      ],
      scopes: [DELETE, ALL],
    },
  },
  "/challenges/:challengeId/advance-phase": {
    post: {
      controller: "ChallengeController",
      method: "advancePhase",
      auth: "jwt",
      access: [constants.UserRoles.Admin],
      scopes: [UPDATE, ALL],
    },
  },
  "/challenges/:challengeId/statistics": {
    get: {
      controller: "ChallengeController",
      method: "getChallengeStatistics",
    },
  },
  "/challenges/:challengeId/notifications": {
    post: {
      controller: "ChallengeController",
      method: "sendNotifications",
      auth: "jwt",
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      scopes: [CREATE, ALL],
    },
  },
  "/challenge-types": {
    get: {
      controller: "ChallengeTypeController",
      method: "searchChallengeTypes",
    },
    post: {
      controller: "ChallengeTypeController",
      method: "createChallengeType",
      auth: "jwt",
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot, constants.UserRoles.Manager],
      scopes: [CREATE, ALL],
    },
  },
  "/challenge-types/:challengeTypeId": {
    get: {
      controller: "ChallengeTypeController",
      method: "getChallengeType",
    },
    put: {
      controller: "ChallengeTypeController",
      method: "fullyUpdateChallengeType",
      auth: "jwt",
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot, constants.UserRoles.Manager],
      scopes: [UPDATE, ALL],
    },
    patch: {
      controller: "ChallengeTypeController",
      method: "partiallyUpdateChallengeType",
      auth: "jwt",
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot, constants.UserRoles.Manager],
      scopes: [UPDATE, ALL],
    },
    delete: {
      controller: "ChallengeTypeController",
      method: "deleteChallengeType",
      auth: "jwt",
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot, constants.UserRoles.Manager],
      scopes: [DELETE, ALL],
    },
  },
  "/challenge-tracks": {
    get: {
      controller: "ChallengeTrackController",
      method: "searchChallengeTracks",
    },
    post: {
      controller: "ChallengeTrackController",
      method: "createChallengeTrack",
      auth: "jwt",
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot, constants.UserRoles.Manager],
      scopes: [CREATE, ALL],
    },
  },
  "/challenge-tracks/:challengeTrackId": {
    get: {
      controller: "ChallengeTrackController",
      method: "getChallengeTrack",
    },
    put: {
      controller: "ChallengeTrackController",
      method: "fullyUpdateChallengeTrack",
      auth: "jwt",
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot, constants.UserRoles.Manager],
      scopes: [UPDATE, ALL],
    },
    patch: {
      controller: "ChallengeTrackController",
      method: "partiallyUpdateChallengeTrack",
      auth: "jwt",
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot, constants.UserRoles.Manager],
      scopes: [UPDATE, ALL],
    },
    delete: {
      controller: "ChallengeTrackController",
      method: "deleteChallengeTrack",
      auth: "jwt",
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot, constants.UserRoles.Manager],
      scopes: [DELETE, ALL],
    },
  },
  "/challenge-timelines": {
    get: {
      controller: "ChallengeTimelineTemplateController",
      method: "searchChallengeTimelineTemplates",
      // auth: 'jwt',
      // access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      // scopes: [READ, ALL]
    },
    post: {
      controller: "ChallengeTimelineTemplateController",
      method: "createChallengeTimelineTemplate",
      auth: "jwt",
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot, constants.UserRoles.Manager],
      scopes: [CREATE, ALL],
    },
  },
  "/challenge-timelines/:challengeTimelineTemplateId": {
    get: {
      controller: "ChallengeTimelineTemplateController",
      method: "getChallengeTimelineTemplate",
      // auth: 'jwt',
      // access: [constants.UserRoles.Admin, constants.UserRoles.Copilot],
      // scopes: [READ, ALL]
    },
    put: {
      controller: "ChallengeTimelineTemplateController",
      method: "fullyUpdateChallengeTimelineTemplate",
      auth: "jwt",
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot, constants.UserRoles.Manager],
      scopes: [UPDATE, ALL],
    },
    delete: {
      controller: "ChallengeTimelineTemplateController",
      method: "deleteChallengeTimelineTemplate",
      auth: "jwt",
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot, constants.UserRoles.Manager],
      scopes: [DELETE, ALL],
    },
  },
  "/challenge-audit-logs": {
    get: {
      controller: "AuditLogController",
      method: "searchAuditLogs",
      auth: "jwt",
      access: [constants.UserRoles.Admin],
      scopes: [READ],
    },
  },
  "/challenge-phases": {
    get: {
      controller: "ChallengePhaseController",
      method: "searchPhases",
      scopes: [READ, ALL],
    },
    post: {
      controller: "ChallengePhaseController",
      method: "createPhase",
      auth: "jwt",
      access: [constants.UserRoles.Admin],
      scopes: [CREATE, ALL],
    },
  },
  "/challenge-phases/:challengePhaseId": {
    get: {
      controller: "ChallengePhaseController",
      method: "getPhase",
      auth: "jwt",
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot, constants.UserRoles.Manager],
      scopes: [READ, ALL],
    },
    put: {
      controller: "ChallengePhaseController",
      method: "fullyUpdatePhase",
      auth: "jwt",
      access: [constants.UserRoles.Admin],
      scopes: [UPDATE, ALL],
    },
    patch: {
      controller: "ChallengePhaseController",
      method: "partiallyUpdatePhase",
      auth: "jwt",
      access: [constants.UserRoles.Admin],
      scopes: [UPDATE, ALL],
    },
    delete: {
      controller: "ChallengePhaseController",
      method: "deletePhase",
      auth: "jwt",
      access: [constants.UserRoles.Admin],
      scopes: [DELETE, ALL],
    },
  },
  "/timeline-templates": {
    get: {
      controller: "TimelineTemplateController",
      method: "searchTimelineTemplates",
      scopes: [READ, ALL],
    },
    post: {
      controller: "TimelineTemplateController",
      method: "createTimelineTemplate",
      auth: "jwt",
      access: [constants.UserRoles.Admin],
      scopes: [CREATE, ALL],
    },
  },
  "/timeline-templates/:timelineTemplateId": {
    get: {
      controller: "TimelineTemplateController",
      method: "getTimelineTemplate",
      auth: "jwt",
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot, constants.UserRoles.Manager],
      scopes: [READ, ALL],
    },
    put: {
      controller: "TimelineTemplateController",
      method: "fullyUpdateTimelineTemplate",
      auth: "jwt",
      access: [constants.UserRoles.Admin],
      scopes: [UPDATE, ALL],
    },
    patch: {
      controller: "TimelineTemplateController",
      method: "partiallyUpdateTimelineTemplate",
      auth: "jwt",
      access: [constants.UserRoles.Admin],
      scopes: [UPDATE, ALL],
    },
    delete: {
      controller: "TimelineTemplateController",
      method: "deleteTimelineTemplate",
      auth: "jwt",
      access: [constants.UserRoles.Admin],
      scopes: [DELETE, ALL],
    },
  },
  "/challenges/:challengeId/attachments": {
    post: {
      controller: "AttachmentController",
      method: "createAttachment",
      auth: "jwt",
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot, constants.UserRoles.Manager],
      scopes: [CREATE, ALL],
    },
  },
  "/challenges/:challengeId/attachments/:attachmentId": {
    get: {
      controller: "AttachmentController",
      method: "getAttachment",
      auth: "jwt", // any authenticated role is allowed
      scopes: [READ, ALL],
    },
    put: {
      controller: "AttachmentController",
      method: "updateAttachment",
      auth: "jwt",
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot, constants.UserRoles.Manager],
      scopes: [UPDATE, ALL],
    },
    patch: {
      controller: "AttachmentController",
      method: "partiallyUpdateAttachment",
      auth: "jwt",
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot, constants.UserRoles.Manager],
      scopes: [UPDATE, ALL],
    },
    delete: {
      controller: "AttachmentController",
      method: "deleteAttachment",
      auth: "jwt",
      access: [constants.UserRoles.Admin, constants.UserRoles.Copilot, constants.UserRoles.Manager],
      scopes: [DELETE, ALL],
    },
  },
  "/challenges/:challengeId/attachments/:attachmentId/download": {
    get: {
      controller: "AttachmentController",
      method: "downloadAttachment",
      auth: "jwt", // any authenticated role is allowed
      scopes: [READ, ALL],
    },
  },
};
