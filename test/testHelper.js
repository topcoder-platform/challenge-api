/**
 * This file defines common helper methods used for tests
 */
const _ = require('lodash')
const uuid = require('uuid/v4')
const config = require('config')
const moment = require('moment')
const helper = require('../src/common/helper')
const constants = require('../app-constants')

const esClient = helper.getESClient()

let challengeType
let challengeSetting
let phase
let phase2
let timelineTemplate
let challenge
let completedChallenge

/**
 * Create test data
 */
async function createData () {
  challengeType = await helper.create('ChallengeType', {
    id: uuid(),
    name: `type-${new Date().getTime()}`,
    description: 'desc',
    isActive: true,
    abbreviation: 'abbr',
    legacyId: 123
  })
  challengeSetting = await helper.create('ChallengeSetting', {
    id: uuid(),
    name: `setting-${new Date().getTime()}`
  })
  phase = await helper.create('Phase', {
    id: uuid(),
    name: `phase-${new Date().getTime()}`,
    description: 'desc',
    isOpen: true,
    duration: 123
  })
  phase2 = await helper.create('Phase', {
    id: uuid(),
    name: `phase2-${new Date().getTime()}`,
    description: 'desc',
    isOpen: true,
    duration: 432
  })
  timelineTemplate = await helper.create('TimelineTemplate', {
    id: uuid(),
    name: `tt-${new Date().getTime()}`,
    description: 'desc',
    isActive: true,
    phases: [{
      phaseId: phase.id,
      defaultDuration: 10000
    }, {
      phaseId: phase2.id,
      predecessor: phase.id,
      defaultDuration: 20000
    }]
  })

  const challengeData = {
    id: uuid(),
    typeId: challengeType.id,
    track: 'track',
    name: `a B c challenge${new Date().getTime()}`,
    description: 'desc',
    challengeSettings: [{ type: challengeSetting.id, value: 'value' }],
    timelineTemplateId: timelineTemplate.id,
    phases: [phase],
    prizeSets: [{
      type: constants.prizeSetTypes.ChallengePrizes,
      description: 'ddd',
      prizes: [{
        description: 'some prize',
        type: 'type',
        value: 800
      }]
    }],
    reviewType: 'review type',
    tags: ['tag1'],
    projectId: 111,
    legacyId: 222,
    forumId: 333,
    startDate: new Date(),
    status: constants.challengeStatuses.Active,
    groups: ['group1'],
    gitRepoURLs: ['https://mozilla.org/?x=%D1%88%D0%B5%D0%BB%D0%BB%D1%8B'],
    created: new Date(),
    createdBy: 'admin'
  }

  challengeData.endDate = moment(challengeData.startDate).add(phase.duration, 'seconds')
  challenge = await helper.create('Challenge', challengeData)
  completedChallenge = await helper.create('Challenge', _.assign(challengeData, { id: uuid(), status: constants.challengeStatuses.Completed }))

  // create challenge in Elasticsearch
  await esClient.create({
    index: config.ES.ES_INDEX,
    type: config.ES.ES_TYPE,
    id: challenge.id,
    body: _.assignIn({ numOfSubmissions: 0, numOfRegistrants: 0 }, challenge.originalItem()),
    refresh: 'true' // refresh ES so that it is visible for read operations instantly
  })

  // create completedChallenge in Elasticsearch
  await esClient.create({
    index: config.ES.ES_INDEX,
    type: config.ES.ES_TYPE,
    id: completedChallenge.id,
    body: _.assignIn({ numOfSubmissions: 0, numOfRegistrants: 0 }, completedChallenge.originalItem()),
    refresh: 'true' // refresh ES so that it is visible for read operations instantly
  })
}

/**
 * Clear test data
 */
async function clearData () {
  // remove challenge in Elasticsearch
  await esClient.delete({
    index: config.ES.ES_INDEX,
    type: config.ES.ES_TYPE,
    id: challenge.id,
    refresh: 'true' // refresh ES so that it is effective for read operations instantly
  })

  // remove completedChallenge in Elasticsearch
  await esClient.delete({
    index: config.ES.ES_INDEX,
    type: config.ES.ES_TYPE,
    id: completedChallenge.id,
    refresh: 'true' // refresh ES so that it is effective for read operations instantly
  })

  await challenge.delete()
  await completedChallenge.delete()
  await timelineTemplate.delete()
  await phase.delete()
  await phase2.delete()
  await challengeSetting.delete()
  await challengeType.delete()
}

/**
 * Get created test data.
 */
function getData () {
  return {
    challengeType: challengeType.originalItem(),
    challengeSetting: challengeSetting.originalItem(),
    phase: phase.originalItem(),
    phase2: phase2.originalItem(),
    timelineTemplate: timelineTemplate.originalItem(),
    challenge: challenge.originalItem(),
    completedChallenge: completedChallenge.originalItem()
  }
}

/**
 * Get dates difference in milliseconds
 */
function getDatesDiff (d1, d2) {
  return new Date(d1).getTime() - new Date(d2).getTime()
}

module.exports = {
  createData,
  clearData,
  getData,
  getDatesDiff
}
