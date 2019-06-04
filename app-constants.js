/**
 * App constants
 */
const UserRoles = {
  Admin: 'Administrator',
  Copilot: 'Copilot'
}

const prizeSetTypes = {
  ChallengePrizes: 'Challenge prizes',
  CopilotPayment: 'Copilot payment',
  ReviewerPayment: 'Reviewer payment'
}

const challengeStatuses = {
  Draft: 'Draft',
  Canceled: 'Canceled',
  Active: 'Active',
  Completed: 'Completed'
}

const EVENT_ORIGINATOR = 'topcoder-challenges-api'

const EVENT_MIME_TYPE = 'application/json'

// using a testing topc, should be changed to use real topics in comments when they are created
const Topics = {
  ChallengeCreated: 'challenge.action.created',
  ChallengeUpdated: 'challenge.action.updated',
  ChallengeTypeCreated: 'test.new.bus.events', // 'challenge.action.type.created',
  ChallengeTypeUpdated: 'test.new.bus.events', // 'challenge.action.type.updated',
  ChallengeSettingCreated: 'test.new.bus.events', // 'challenge.action.setting.created',
  ChallengeSettingUpdated: 'test.new.bus.events', // 'challenge.action.setting.updated',
  ChallengePhaseCreated: 'test.new.bus.events', // 'challenge.action.phase.created',
  ChallengePhaseUpdated: 'test.new.bus.events', // 'challenge.action.phase.updated',
  ChallengePhaseDeleted: 'test.new.bus.events', // 'challenge.action.phase.deleted',
  TimelineTemplateCreated: 'test.new.bus.events', // 'challenge.action.timeline.template.created',
  TimelineTemplateUpdated: 'test.new.bus.events', // 'challenge.action.timeline.template.updated',
  TimelineTemplateDeleted: 'test.new.bus.events' // 'challenge.action.timeline.template.deleted'
}

module.exports = {
  UserRoles,
  prizeSetTypes,
  challengeStatuses,
  EVENT_ORIGINATOR,
  EVENT_MIME_TYPE,
  Topics
}
