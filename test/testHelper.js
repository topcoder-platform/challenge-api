/**
 * This file defines common helper methods used for tests
 */
const _ = require('lodash')
const uuid = require('uuid/v4')
const constants = require('../app-constants')
const prisma = require('../src/common/prisma').getClient()

let challengeTrack
let challengeType
let phase
let phase2
let timelineTemplate
let challenge
let taskChallenge

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

const challengeTrackId = uuid()
const challengeTypeId = uuid()
const phase1Id = uuid()
const phase2Id = uuid()
const timelineTemplateId = uuid()
const challengeId = uuid()
const taskChallengeId = uuid()

/**
 * Create test data
 */
async function createData () {
  const testUserId = 'testuser'
  challengeTrack = await prisma.challengeTrack.create({
    data: {
      id: challengeTrackId,
      name: `type-${new Date().getTime()}`,
      description: 'desc',
      isActive: true,
      track: 'DEVELOP',
      abbreviation: 'abbr',
      createdBy: testUserId,
      updatedBy: testUserId
    }
  })
  challengeType = await prisma.challengeType.create({
    data: {
      id: challengeTypeId,
      name: `type-${new Date().getTime()}`,
      description: 'desc',
      isActive: true,
      abbreviation: 'abbr',
      createdBy: testUserId,
      updatedBy: testUserId
    }
  })
  phase = await prisma.phase.create({
    data: {
      id: phase1Id,
      name: `phase-${new Date().getTime()}`,
      description: 'desc',
      isOpen: true,
      duration: 123,
      createdBy: testUserId,
      updatedBy: testUserId
    }
  })
  phase2 = await prisma.phase.create({
    data: {
      id: phase2Id,
      name: `phase2-${new Date().getTime()}`,
      description: 'desc',
      isOpen: true,
      duration: 432,
      createdBy: testUserId,
      updatedBy: testUserId
    }
  })
  timelineTemplate = {
    id: timelineTemplateId,
    name: `tt-${new Date().getTime()}`,
    description: 'desc',
    isActive: true,
    createdBy: testUserId,
    updatedBy: testUserId,
    phases: [
      {
        phaseId: phase.id,
        defaultDuration: 10000,
        createdBy: testUserId,
        updatedBy: testUserId
      },
      {
        phaseId: phase2.id,
        predecessor: phase.id,
        defaultDuration: 20000,
        createdBy: testUserId,
        updatedBy: testUserId
      }
    ]
  }
  const templateModel = timelineTemplate
  templateModel.phases = { create: templateModel.phases }
  await prisma.timelineTemplate.create({
    data: templateModel
  })
  const nm = `a B c challenge${new Date().getTime()}`
  const challengeData = {
    id: challengeId,
    name: nm,
    description: 'desc',
    privateDescription: 'private description',
    descriptionFormat: 'html',
    timelineTemplate: { connect: { id: timelineTemplate.id } },
    type: { connect: { id: challengeTypeId } },
    track: { connect: { id: challengeTrackId } },
    tags: ['tag1'],
    projectId: 111,
    legacyId: 222,
    startDate: new Date(),
    status: constants.challengeStatuses.Completed.toUpperCase(),
    createdAt: new Date(),
    createdBy: 'admin',
    updatedBy: 'admin'
  }
  challenge = await prisma.challenge.create({ data: challengeData })

  taskChallenge = await prisma.challenge.create({ data: {
    id: taskChallengeId,
    taskIsTask: true,
    taskIsAssigned: true,
    name: 'Task',
    description: 'desc',
    privateDescription: 'private description',
    descriptionFormat: 'html',
    timelineTemplate: { connect: { id: timelineTemplate.id } },
    type: { connect: { id: challengeTypeId } },
    track: { connect: { id: challengeTrackId } },
    tags: ['tag1'],
    projectId: 111,
    legacyId: 222,
    startDate: new Date(),
    status: constants.challengeStatuses.Completed.toUpperCase(),
    createdAt: new Date(),
    createdBy: 'admin',
    updatedBy: 'admin'
  }})
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
  await prisma.challenge.deleteMany({
    where: { id: { in: [challengeId, taskChallengeId] } }
  })
  await prisma.timelineTemplate.deleteMany({ where: { id: timelineTemplateId } })
  await prisma.phase.deleteMany({ where: { id: { in: [phase1Id, phase2Id] } } })
  await prisma.challengeType.deleteMany({ where: { id: challengeTypeId } })
  await prisma.challengeTrack.deleteMany({ where: { id: challengeTrackId } })
}

/**
 * Get created test data.
 */
function getData () {
  return {
    challengeTrack,
    challengeType,
    phase,
    phase2,
    timelineTemplate,
    challenge,
    taskChallenge,
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
