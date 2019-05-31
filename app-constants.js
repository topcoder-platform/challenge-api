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

module.exports = {
  UserRoles,
  prizeSetTypes,
  challengeStatuses
}
