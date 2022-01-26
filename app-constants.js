const config = require('config')

/**
 * App constants
 */
const UserRoles = {
  Admin: 'administrator',
  Copilot: 'copilot',
  Manager: 'Connect Manager',
  User: 'Topcoder User',
  SelfServiceCustomer: 'Self-Service Customer'
}

const prizeSetTypes = {
  ChallengePrizes: 'placement',
  CopilotPayment: 'copilot',
  ReviewerPayment: 'reviewer',
  CheckpointPrizes: 'checkpoint'
}

const challengeStatuses = {
  New: 'New',
  Draft: 'Draft',
  Approved: 'Approved',
  Cancelled: 'Cancelled',
  Active: 'Active',
  Completed: 'Completed',
  Deleted: 'Deleted',
  CancelledFailedReview: 'Cancelled - Failed Review',
  CancelledFailedScreening: 'Cancelled - Failed Screening',
  CancelledZeroSubmissions: 'Cancelled - Zero Submissions',
  CancelledWinnerUnresponsive: 'Cancelled - Winner Unresponsive',
  CancelledClientRequest: 'Cancelled - Client Request',
  CancelledRequirementsInfeasible: 'Cancelled - Requirements Infeasible',
  CancelledZeroRegistrations: 'Cancelled - Zero Registrations',
  CancelledPaymentFailed: 'Cancelled - Payment Failed'
}

const validChallengeParams = {
  UpdatedBy: 'updatedBy',
  Updated: 'updated',
  CreatedBy: 'createdBy',
  Created: 'created',
  EndDate: 'endDate',
  StartDate: 'startDate',
  ProjectId: 'projectId',
  Name: 'name',
  TypeId: 'typeId',
  Prizes: 'overview.totalPrizes'
}

const EVENT_ORIGINATOR = 'topcoder-challenges-api'

const EVENT_MIME_TYPE = 'application/json'

const DiscussionTypes = {
  Challenge: 'challenge'
}

// using a testing topc, should be changed to use real topics in comments when they are created
const Topics = {
  ChallengeCreated: 'challenge.notification.create',
  ChallengeUpdated: 'challenge.notification.update',
  ChallengeDeleted: 'challenge.notification.delete',
  ChallengeTypeCreated: 'test.new.bus.events', // 'challenge.action.type.created',
  ChallengeTypeUpdated: 'test.new.bus.events', // 'challenge.action.type.updated',
  ChallengePhaseCreated: 'test.new.bus.events', // 'challenge.action.phase.created',
  ChallengePhaseUpdated: 'test.new.bus.events', // 'challenge.action.phase.updated',
  ChallengePhaseDeleted: 'test.new.bus.events', // 'challenge.action.phase.deleted',
  TimelineTemplateCreated: 'test.new.bus.events', // 'challenge.action.timeline.template.created',
  TimelineTemplateUpdated: 'test.new.bus.events', // 'challenge.action.timeline.template.updated',
  TimelineTemplateDeleted: 'test.new.bus.events', // 'challenge.action.timeline.template.deleted',
  ChallengeTypeTimelineTemplateCreated: 'test.new.bus.events', // 'challenge.action.type.timeline.template.created',
  ChallengeTypeTimelineTemplateUpdated: 'test.new.bus.events', // 'challenge.action.type.timeline.template.updated',
  ChallengeTypeTimelineTemplateDeleted: 'test.new.bus.events', // 'challenge.action.type.timeline.template.deleted'
  ChallengeAttachmentCreated: 'test.new.bus.events', // 'challenge.action.attachment.created',
  ChallengeAttachmentUpdated: 'test.new.bus.events', // 'challenge.action.attachment.updated',
  ChallengeAttachmentDeleted: 'test.new.bus.events', // 'challenge.action.attachment.deleted',
  // Self Service topics
  Notifications: 'notifications.action.create'
}

const challengeTracks = {
  DEVELOP: 'DEVELOP',
  DESIGN: 'DESIGN',
  DATA_SCIENCE: 'DATA_SCIENCE',
  QA: 'QA'
}

const challengeTextSortField = {
  Name: 'name',
  TypeId: 'typeId'
}

const reviewTypes = {
  Community: 'COMMUNITY',
  Internal: 'INTERNAL'
}

const SelfServiceNotificationTypes = {
  WORK_REQUEST_SUBMITTED: 'self-service.notifications.work-request-submitted',
  WORK_REQUEST_STARTED: 'self-service.notifications.work-request-started',
  WORK_REQUEST_REDIRECTED: 'self-service.notifications.work-request-redirected',
  WORK_COMPLETED: 'self-service.notifications.work-completed'
}

const SelfServiceNotificationSettings = {
  [SelfServiceNotificationTypes.WORK_REQUEST_SUBMITTED]: {
    sendgridTemplateId: config.SENDGRID_TEMPLATES.WORK_REQUEST_SUBMITTED,
    cc: []
  },
  [SelfServiceNotificationTypes.WORK_REQUEST_STARTED]: {
    sendgridTemplateId: config.SENDGRID_TEMPLATES.WORK_REQUEST_STARTED,
    cc: []
  },
  [SelfServiceNotificationTypes.WORK_REQUEST_REDIRECTED]: {
    sendgridTemplateId: config.SENDGRID_TEMPLATES.WORK_REQUEST_REDIRECTED,
    cc: [...config.SELF_SERVICE_EMAIL_CC_ACCOUNTS]
  },
  [SelfServiceNotificationTypes.WORK_COMPLETED]: {
    sendgridTemplateId: config.SENDGRID_TEMPLATES.WORK_COMPLETED,
    cc: []
  }
}

module.exports = {
  UserRoles,
  prizeSetTypes,
  challengeStatuses,
  validChallengeParams,
  EVENT_ORIGINATOR,
  EVENT_MIME_TYPE,
  Topics,
  challengeTracks,
  challengeTextSortField,
  DiscussionTypes,
  reviewTypes,
  SelfServiceNotificationTypes,
  SelfServiceNotificationSettings
}
