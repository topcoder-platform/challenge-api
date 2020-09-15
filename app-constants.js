/**
 * App constants
 */
const UserRoles = {
  Admin: 'administrator',
  Copilot: 'copilot',
  Manager: 'Connect Manager',
  User: 'Topcoder User'
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
  CancelledZeroRegistrations: 'Cancelled - Zero Registrations'
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
  TypeId: 'typeId'
}

const EVENT_ORIGINATOR = 'topcoder-challenges-api'

const EVENT_MIME_TYPE = 'application/json'

// using a testing topc, should be changed to use real topics in comments when they are created
const Topics = {
  ChallengeCreated: 'challenge.notification.create',
  ChallengeUpdated: 'challenge.notification.update',
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
  ChallengeTypeTimelineTemplateDeleted: 'test.new.bus.events' // 'challenge.action.type.timeline.template.deleted'
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

module.exports = {
  UserRoles,
  prizeSetTypes,
  challengeStatuses,
  validChallengeParams,
  EVENT_ORIGINATOR,
  EVENT_MIME_TYPE,
  Topics,
  challengeTracks,
  challengeTextSortField
}
