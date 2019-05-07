/**
 * App constants
 */
const UserRoles = {
  Admin: 'Administrator',
  Copilot: 'Copilot'
}

const prizeSetTypes = {
  Code: 'Code',
  F2F: 'First to Finish',
  CheckPoint: 'Check Point',
  MM: 'Marathon'
}

const prizeTypes = {
  First: 'first place',
  Second: 'second place',
  Third: 'third place',
  Fouth: 'fourth place',
  Fifth: 'fifth place'
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
  prizeTypes,
  challengeStatuses
}
