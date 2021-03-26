/**
 * This file defines common helper methods used for tests
 */
const _ = require('lodash')
const uuid = require('uuid/v4')
const config = require('config')
const helper = require('../src/common/helper')
const constants = require('../app-constants')

const esClient = helper.getESClient()

let challengeType
let phase
let phase2
let timelineTemplate
let challenge
let completedChallenge

/**
 * function to deeply compare arrays  regardeless of the order
 *
 * @param {Array} arr1 The first array to compare
 * @param {Array} arr2 The second array to compare
 * @returns {Boolean} The flag indicating whether the arrays have the same content regardless of the order
 */
const deepCompareArrays = (arr1, arr2) => {
  return _(arr1).xorWith(arr2, _.isEqual).isEmpty()
}

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
  const nm = `a B c challenge${new Date().getTime()}`
  const challengeData = {
    id: uuid(),
    typeId: challengeType.id,
    name: nm,
    description: 'desc',
    metadata: [{ name: nm, value: 'value' }],
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
    tags: ['tag1'],
    projectId: 111,
    legacy: {
      track: 'track',
      reviewType: 'Virus Scan',
      forumId: 123456
    },
    legacyId: 222,
    startDate: new Date(),
    status: constants.challengeStatuses.Active,
    groups: ['group1'],
    gitRepoURLs: ['https://mozilla.org/?x=%D1%88%D0%B5%D0%BB%D0%BB%D1%8B'],
    created: new Date(),
    createdBy: 'admin'
  }

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

const defaultProjectTerms = [
  {
    id: '0fcb41d1-ec7c-44bb-8f3b-f017a61cd708',
    title: 'Competition Non-Disclosure Agreement',
    url: '',
    text: 'docusign NDA',
    docusignTemplateId: '0c5b7081-1fff-4484-a20f-824c97a03b9b',
    agreeabilityType: 'DocuSignable'
  },
  {
    id: 'be0652ae-8b28-4e91-9b42-8ad00b31e9cb',
    title: 'Subcontractor Services Agreement 2009-09-02',
    url: 'http://www.topcoder.com/i/terms/Subcontractor+Services+Agreement+2009-09-02.pdf',
    text: 'Subcontractor Services Agreement 2009-09-02. This agreement is unavailable in text format.  Please download the PDF to read its contents',
    agreeabilityType: 'Non-electronically-agreeable'
  }
]

const mockTerms = ['8a0207fc-ac9b-47e7-af1b-81d1ccaf0afc', '453c7c5c-c872-4672-9e78-5162d70903d3']

const additionalTerm = {
  id: '28841de8-2f42-486f-beac-21d46a832ab6',
  agreeabilityType: 'Electronically-agreeable',
  title: '2008 TCO Marathon Match Competition Official Rules',
  url: 'http://topcoder.com/mm-terms'
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
  await challengeType.delete()
}

/**
 * Get created test data.
 */
function getData () {
  return {
    challengeType: challengeType.originalItem(),
    phase: phase.originalItem(),
    phase2: phase2.originalItem(),
    timelineTemplate: timelineTemplate.originalItem(),
    challenge: challenge.originalItem(),
    completedChallenge: completedChallenge.originalItem(),
    defaultProjectTerms,
    additionalTerm,
    mockTerms
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
  getDatesDiff,
  deepCompareArrays
}
