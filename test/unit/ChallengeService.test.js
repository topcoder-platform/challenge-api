/*
 * Unit tests of challenge service
 */

require('../../app-bootstrap')
const _ = require('lodash')
const config = require('config')
const uuid = require('uuid/v4')
const chai = require('chai')
const fs = require('fs')
const path = require('path')
const constants = require('../../app-constants')
const service = require('../../src/services/ChallengeService')
const AttachmentService = require('../../src/services/AttachmentService')
const testHelper = require('../testHelper')

const should = chai.should()

const attachmentContent = fs.readFileSync(path.join(__dirname, '../attachment.txt'))

describe('challenge service unit tests', () => {
  // created entity id
  let id
  let id2
  let attachment
  const winners = [
    {
      userId: 12345678,
      handle: 'thomaskranitsas',
      placement: 1
    },
    {
      userId: 3456789,
      handle: 'tonyj',
      placement: 2
    }
  ]
  // generated data
  let data
  let testChallengeData
  let testCompletedChallengeData
  const notFoundId = uuid()

  before(async () => {
    await testHelper.createData()
    data = testHelper.getData()
    // create an attachment for test
    attachment = await AttachmentService.uploadAttachment({
      isMachine: true
    }, data.challenge.id, {
      attachment: {
        data: attachmentContent,
        mimetype: 'plain/text',
        name: 'attachment.txt',
        size: attachmentContent.length
      }
    })

    testChallengeData = _.omit(data.challenge, ['id', 'created', 'createdBy'])
    testChallengeData.phases = [{
      phaseId: data.phase.id,
      duration: 100
    }, {
      phaseId: data.phase2.id,
      duration: 200
    }]

    testCompletedChallengeData = _.omit(data.completedChallenge, ['id', 'created', 'createdBy'])
    testCompletedChallengeData.phases = [{
      phaseId: data.phase.id,
      duration: 100
    }, {
      phaseId: data.phase2.id,
      duration: 200
    }]
  })

  after(async () => {
    await testHelper.clearData()
  })

  describe('create challenge tests', () => {
    it('create challenge successfully', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      const result = await service.createChallenge({ isMachine: true, sub: 'sub' }, challengeData)
      should.exist(result.id)
      id = result.id
      should.equal(result.typeId, data.challenge.typeId)
      should.equal(result.track, data.challenge.track)
      should.equal(result.name, data.challenge.name)
      should.equal(result.description, data.challenge.description)
      should.equal(result.timelineTemplateId, data.challenge.timelineTemplateId)
      should.equal(result.phases.length, 2)
      should.exist(result.phases[0].id)
      should.equal(result.phases[0].phaseId, data.phase.id)
      should.equal(result.phases[0].duration, challengeData.phases[0].duration)
      should.equal(testHelper.getDatesDiff(result.phases[0].scheduledStartDate, challengeData.startDate), 0)
      should.equal(testHelper.getDatesDiff(result.phases[0].scheduledEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[0].actualStartDate, challengeData.startDate), 0)
      should.equal(testHelper.getDatesDiff(result.phases[0].actualEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.exist(result.phases[1].id)
      should.equal(result.phases[1].phaseId, data.phase2.id)
      should.equal(result.phases[1].predecessor, result.phases[0].id)
      should.equal(result.phases[1].duration, challengeData.phases[1].duration)
      should.equal(testHelper.getDatesDiff(result.phases[1].scheduledStartDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[1].scheduledEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000 + challengeData.phases[1].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[1].actualStartDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[1].actualEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000 + challengeData.phases[1].duration * 1000)
      should.equal(result.prizeSets.length, 1)
      should.equal(result.prizeSets[0].type, data.challenge.prizeSets[0].type)
      should.equal(result.prizeSets[0].description, data.challenge.prizeSets[0].description)
      should.equal(result.prizeSets[0].prizes.length, 1)
      should.equal(result.prizeSets[0].prizes[0].description, data.challenge.prizeSets[0].prizes[0].description)
      should.equal(result.prizeSets[0].prizes[0].type, data.challenge.prizeSets[0].prizes[0].type)
      should.equal(result.prizeSets[0].prizes[0].value, data.challenge.prizeSets[0].prizes[0].value)
      should.equal(result.reviewType, data.challenge.reviewType)
      should.equal(result.tags.length, 1)
      should.equal(result.tags[0], data.challenge.tags[0])
      should.equal(result.projectId, data.challenge.projectId)
      should.equal(result.legacyId, data.challenge.legacyId)
      should.equal(result.forumId, data.challenge.forumId)
      should.equal(result.status, data.challenge.status)
      should.equal(result.groups.length, 1)
      should.equal(result.groups[0], data.challenge.groups[0])
      should.equal(result.gitRepoURLs.length, 1)
      should.equal(result.gitRepoURLs[0], data.challenge.gitRepoURLs[0])
      should.equal(result.createdBy, 'sub')
      should.exist(result.startDate)
      should.exist(result.created)
      should.equal(result.numOfSubmissions, 0)
      should.equal(result.numOfRegistrants, 0)
      should.equal(result.terms.length, 2)
      should.equal(testHelper.deepCompareArrays(result.terms, _.map(data.defaultProjectTerms, t => t.id)), true)
    })

    it('create challenge successfully with completed status', async () => {
      const challengeData = testCompletedChallengeData
      const result = await service.createChallenge({ isMachine: true, sub: 'sub' }, challengeData)
      should.exist(result.id)
      id2 = result.id
      should.equal(result.typeId, data.completedChallenge.typeId)
      should.equal(result.track, data.completedChallenge.track)
      should.equal(result.name, data.completedChallenge.name)
      should.equal(result.description, data.completedChallenge.description)
      should.equal(result.timelineTemplateId, data.completedChallenge.timelineTemplateId)
      should.equal(result.phases.length, 2)
      should.exist(result.phases[0].id)
      should.equal(result.phases[0].phaseId, data.phase.id)
      should.equal(result.phases[0].duration, challengeData.phases[0].duration)
      should.equal(testHelper.getDatesDiff(result.phases[0].scheduledStartDate, challengeData.startDate), 0)
      should.equal(testHelper.getDatesDiff(result.phases[0].scheduledEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[0].actualStartDate, challengeData.startDate), 0)
      should.equal(testHelper.getDatesDiff(result.phases[0].actualEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.exist(result.phases[1].id)
      should.equal(result.phases[1].phaseId, data.phase2.id)
      should.equal(result.phases[1].predecessor, result.phases[0].id)
      should.equal(result.phases[1].duration, challengeData.phases[1].duration)
      should.equal(testHelper.getDatesDiff(result.phases[1].scheduledStartDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[1].scheduledEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000 + challengeData.phases[1].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[1].actualStartDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[1].actualEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000 + challengeData.phases[1].duration * 1000)
      should.equal(result.prizeSets.length, 1)
      should.equal(result.prizeSets[0].type, data.completedChallenge.prizeSets[0].type)
      should.equal(result.prizeSets[0].description, data.completedChallenge.prizeSets[0].description)
      should.equal(result.prizeSets[0].prizes.length, 1)
      should.equal(result.prizeSets[0].prizes[0].description, data.completedChallenge.prizeSets[0].prizes[0].description)
      should.equal(result.prizeSets[0].prizes[0].type, data.completedChallenge.prizeSets[0].prizes[0].type)
      should.equal(result.prizeSets[0].prizes[0].value, data.completedChallenge.prizeSets[0].prizes[0].value)
      should.equal(result.reviewType, data.completedChallenge.reviewType)
      should.equal(result.tags.length, 1)
      should.equal(result.tags[0], data.completedChallenge.tags[0])
      should.equal(result.projectId, data.completedChallenge.projectId)
      should.equal(result.legacyId, data.completedChallenge.legacyId)
      should.equal(result.forumId, data.completedChallenge.forumId)
      should.equal(result.status, data.completedChallenge.status)
      should.equal(result.groups.length, 1)
      should.equal(result.groups[0], data.completedChallenge.groups[0])
      should.equal(result.gitRepoURLs.length, 1)
      should.equal(result.gitRepoURLs[0], data.completedChallenge.gitRepoURLs[0])
      should.equal(result.createdBy, 'sub')
      should.exist(result.startDate)
      should.exist(result.created)
      should.equal(result.numOfSubmissions, 0)
      should.equal(result.numOfRegistrants, 0)
      should.equal(result.terms.length, 2)
      should.equal(testHelper.deepCompareArrays(result.terms, _.map(data.defaultProjectTerms, t => t.id)), true)
    })

    it('create challenge - type not found', async () => {
      const challengeData = _.clone(testChallengeData)
      challengeData.typeId = notFoundId
      try {
        await service.createChallenge({ isMachine: true, sub: 'sub' }, challengeData)
      } catch (e) {
        should.equal(e.message, `No challenge type found with id: ${notFoundId}.`)
        return
      }
      throw new Error('should not reach here')
    })

    it(`create challenge - user doesn't have permission to create challenge under specific project`, async () => {
      const challengeData = _.clone(testChallengeData)
      challengeData.projectId = 200
      try {
        await service.createChallenge({ userId: '16096823' }, challengeData, config.COPILOT_TOKEN)
      } catch (e) {
        should.equal(e.response.data.result.content.message, 'You do not have permissions to perform this action')
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge - project not found', async () => {
      const challengeData = _.clone(testChallengeData)
      challengeData.projectId = 100000
      try {
        await service.createChallenge({ isMachine: true, sub: 'sub' }, challengeData)
      } catch (e) {
        should.equal(e.message, `Project with id: ${challengeData.projectId} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge - invalid projectId', async () => {
      const challengeData = _.clone(testChallengeData)
      challengeData.projectId = -1
      try {
        await service.createChallenge({ isMachine: true, sub: 'sub' }, challengeData)
      } catch (e) {
        should.equal(e.message.indexOf('"projectId" must be a positive number') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge - missing name', async () => {
      const challengeData = _.clone(testChallengeData)
      delete challengeData.name
      try {
        await service.createChallenge({ isMachine: true, sub: 'sub' }, challengeData)
      } catch (e) {
        should.equal(e.message.indexOf('"name" is required') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge - invalid date', async () => {
      const challengeData = _.clone(testChallengeData)
      challengeData.startDate = 'abc'
      try {
        await service.createChallenge({ isMachine: true, sub: 'sub' }, challengeData)
      } catch (e) {
        should.equal(e.message.indexOf('"startDate" must be a number of milliseconds or valid date string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge - invalid status', async () => {
      const challengeData = _.clone(testChallengeData)
      challengeData.status = ['Active']
      try {
        await service.createChallenge({ isMachine: true, sub: 'sub' }, challengeData)
      } catch (e) {
        should.equal(e.message.indexOf('"status" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('create challenge - unexpected field', async () => {
      const challengeData = _.clone(testChallengeData)
      challengeData.other = 123
      try {
        await service.createChallenge({ isMachine: true, sub: 'sub' }, challengeData)
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('get challenge tests', () => {
    it('get challenge successfully', async () => {
      const result = await service.getChallenge({ isMachine: true }, data.challenge.id)
      should.equal(result.id, data.challenge.id)
      should.equal(result.typeId, data.challenge.typeId)
      should.equal(result.track, data.challenge.track)
      should.equal(result.name, data.challenge.name)
      should.equal(result.description, data.challenge.description)
      should.equal(result.timelineTemplateId, data.challenge.timelineTemplateId)
      should.equal(result.phases.length, 1)
      should.equal(result.phases[0].id, data.challenge.phases[0].id)
      should.equal(result.phases[0].name, data.challenge.phases[0].name)
      should.equal(result.phases[0].description, data.challenge.phases[0].description)
      should.equal(result.phases[0].isOpen, data.challenge.phases[0].isOpen)
      should.equal(result.phases[0].duration, data.challenge.phases[0].duration)
      should.equal(result.prizeSets.length, 1)
      should.equal(result.prizeSets[0].type, data.challenge.prizeSets[0].type)
      should.equal(result.prizeSets[0].description, data.challenge.prizeSets[0].description)
      should.equal(result.prizeSets[0].prizes.length, 1)
      should.equal(result.prizeSets[0].prizes[0].description, data.challenge.prizeSets[0].prizes[0].description)
      should.equal(result.prizeSets[0].prizes[0].type, data.challenge.prizeSets[0].prizes[0].type)
      should.equal(result.prizeSets[0].prizes[0].value, data.challenge.prizeSets[0].prizes[0].value)
      should.equal(result.reviewType, data.challenge.reviewType)
      should.equal(result.tags.length, 1)
      should.equal(result.tags[0], data.challenge.tags[0])
      should.equal(result.projectId, data.challenge.projectId)
      should.equal(result.legacyId, data.challenge.legacyId)
      should.equal(result.forumId, data.challenge.forumId)
      should.equal(result.status, data.challenge.status)
      should.equal(result.groups.length, 1)
      should.equal(result.groups[0], data.challenge.groups[0])
      should.equal(result.gitRepoURLs.length, 1)
      should.equal(result.gitRepoURLs[0], data.challenge.gitRepoURLs[0])
      should.equal(result.createdBy, 'admin')
      should.exist(result.startDate)
      should.exist(result.created)
      should.equal(result.numOfSubmissions, 0)
      should.equal(result.numOfRegistrants, 0)
    })

    it('get challenge successfully with terms', async () => {
      const result = await service.getChallenge({ isMachine: true }, id)
      const challengeData = _.cloneDeep(testChallengeData)
      should.equal(result.typeId, data.challenge.typeId)
      should.equal(result.track, data.challenge.track)
      should.equal(result.name, data.challenge.name)
      should.equal(result.description, data.challenge.description)
      should.equal(result.timelineTemplateId, data.challenge.timelineTemplateId)
      should.equal(result.phases.length, 2)
      should.exist(result.phases[0].id)
      should.equal(result.phases[0].phaseId, data.phase.id)
      should.equal(result.phases[0].duration, challengeData.phases[0].duration)
      should.equal(testHelper.getDatesDiff(result.phases[0].scheduledStartDate, challengeData.startDate), 0)
      should.equal(testHelper.getDatesDiff(result.phases[0].scheduledEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[0].actualStartDate, challengeData.startDate), 0)
      should.equal(testHelper.getDatesDiff(result.phases[0].actualEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.exist(result.phases[1].id)
      should.equal(result.phases[1].phaseId, data.phase2.id)
      should.equal(result.phases[1].predecessor, result.phases[0].id)
      should.equal(result.phases[1].duration, challengeData.phases[1].duration)
      should.equal(testHelper.getDatesDiff(result.phases[1].scheduledStartDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[1].scheduledEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000 + challengeData.phases[1].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[1].actualStartDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[1].actualEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000 + challengeData.phases[1].duration * 1000)
      should.equal(result.prizeSets.length, 1)
      should.equal(result.prizeSets[0].type, data.challenge.prizeSets[0].type)
      should.equal(result.prizeSets[0].description, data.challenge.prizeSets[0].description)
      should.equal(result.prizeSets[0].prizes.length, 1)
      should.equal(result.prizeSets[0].prizes[0].description, data.challenge.prizeSets[0].prizes[0].description)
      should.equal(result.prizeSets[0].prizes[0].type, data.challenge.prizeSets[0].prizes[0].type)
      should.equal(result.prizeSets[0].prizes[0].value, data.challenge.prizeSets[0].prizes[0].value)
      should.equal(result.reviewType, data.challenge.reviewType)
      should.equal(result.tags.length, 1)
      should.equal(result.tags[0], data.challenge.tags[0])
      should.equal(result.projectId, data.challenge.projectId)
      should.equal(result.legacyId, data.challenge.legacyId)
      should.equal(result.forumId, data.challenge.forumId)
      should.equal(result.status, data.challenge.status)
      should.equal(result.groups.length, 1)
      should.equal(result.groups[0], data.challenge.groups[0])
      should.equal(result.gitRepoURLs.length, 1)
      should.equal(result.gitRepoURLs[0], data.challenge.gitRepoURLs[0])
      should.equal(result.createdBy, 'sub')
      should.exist(result.startDate)
      should.exist(result.created)
      should.equal(result.numOfSubmissions, 0)
      should.equal(result.numOfRegistrants, 0)
      should.equal(result.terms.length, 2)
      should.equal(testHelper.deepCompareArrays(result.terms, _.map(data.defaultProjectTerms, t => t.id)), true)
    })

    it('get challenge - not found', async () => {
      try {
        await service.getChallenge({ isMachine: true }, notFoundId)
      } catch (e) {
        should.equal(e.message, `Challenge of id ${notFoundId} is not found.`)
        return
      }
      throw new Error('should not reach here')
    })

    it('get challenge - invalid id', async () => {
      try {
        await service.getChallenge({ isMachine: true }, 'invalid')
      } catch (e) {
        should.equal(e.message.indexOf('"id" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('search challenges tests', () => {
    it('search challenges successfully 1', async () => {
      const res = await service.searchChallenges({ isMachine: true }, {
        page: 1,
        perPage: 10,
        id: data.challenge.id,
        typeId: data.challenge.typeId,
        name: data.challenge.name.substring(2).trim().toUpperCase(),
        description: data.challenge.description,
        timelineTemplateId: data.challenge.timelineTemplateId,
        tag: data.challenge.tags[0],
        projectId: data.challenge.projectId,
        legacyId: data.challenge.legacyId,
        status: data.challenge.status,
        group: data.challenge.groups[0],
        gitRepoURL: data.challenge.gitRepoURLs[0],
        createdDateStart: '1992-01-02',
        createdDateEnd: '2022-01-02',
        createdBy: data.challenge.createdBy
      })
      should.equal(res.total, 1)
      should.equal(res.page, 1)
      should.equal(res.perPage, 10)
      should.equal(res.result.length, 1)
      const result = res.result[0]
      should.equal(result.id, data.challenge.id)
      should.equal(result.type, data.challengeType.name)
      should.equal(result.track, data.challenge.track)
      should.equal(result.name, data.challenge.name)
      should.equal(result.description, data.challenge.description)
      should.equal(result.timelineTemplateId, data.challenge.timelineTemplateId)
      should.equal(result.phases.length, 1)
      should.equal(result.phases[0].id, data.challenge.phases[0].id)
      should.equal(result.phases[0].name, data.challenge.phases[0].name)
      should.equal(result.phases[0].description, data.challenge.phases[0].description)
      should.equal(result.phases[0].isOpen, data.challenge.phases[0].isOpen)
      should.equal(result.phases[0].duration, data.challenge.phases[0].duration)
      should.equal(result.prizeSets.length, 1)
      should.equal(result.prizeSets[0].type, data.challenge.prizeSets[0].type)
      should.equal(result.prizeSets[0].description, data.challenge.prizeSets[0].description)
      should.equal(result.prizeSets[0].prizes.length, 1)
      should.equal(result.prizeSets[0].prizes[0].description, data.challenge.prizeSets[0].prizes[0].description)
      should.equal(result.prizeSets[0].prizes[0].type, data.challenge.prizeSets[0].prizes[0].type)
      should.equal(result.prizeSets[0].prizes[0].value, data.challenge.prizeSets[0].prizes[0].value)
      should.equal(result.reviewType, data.challenge.reviewType)
      should.equal(result.tags.length, 1)
      should.equal(result.tags[0], data.challenge.tags[0])
      should.equal(result.projectId, data.challenge.projectId)
      should.equal(result.legacyId, data.challenge.legacyId)
      should.equal(result.forumId, data.challenge.forumId)
      should.equal(result.status, data.challenge.status)
      should.equal(result.groups.length, 1)
      should.equal(result.groups[0], data.challenge.groups[0])
      should.equal(result.gitRepoURLs.length, 1)
      should.equal(result.gitRepoURLs[0], data.challenge.gitRepoURLs[0])
      should.equal(result.createdBy, 'admin')
      should.exist(result.startDate)
      should.exist(result.created)
      should.equal(result.numOfSubmissions, 0)
      should.equal(result.numOfRegistrants, 0)
    })

    it('search challenges successfully 2', async () => {
      const result = await service.searchChallenges({ isMachine: true }, { name: 'aaa bbb ccc' })
      should.equal(result.total, 0)
      should.equal(result.page, 1)
      should.equal(result.perPage, 20)
      should.equal(result.result.length, 0)
    })

    it('search challenges successfully 3', async () => {
      const res = await service.searchChallenges({ isMachine: true }, {
        page: 1,
        perPage: 10,
        id: data.challenge.id,
        typeId: data.challenge.typeId,
        track: data.challenge.track,
        name: data.challenge.name.substring(2).trim().toUpperCase(),
        description: data.challenge.description,
        timelineTemplateId: data.challenge.timelineTemplateId,
        reviewType: data.challenge.reviewType,
        tag: data.challenge.tags[0],
        projectId: data.challenge.projectId,
        forumId: data.challenge.forumId,
        legacyId: data.challenge.legacyId,
        status: data.challenge.status,
        group: data.challenge.groups[0],
        gitRepoURL: data.challenge.gitRepoURLs[0],
        createdDateStart: '1992-01-02',
        createdDateEnd: '2022-01-02',
        createdBy: data.challenge.createdBy,
        memberId: 23124329
      })
      should.equal(res.total, 0)
      should.equal(res.page, 1)
      should.equal(res.perPage, 10)
      should.equal(res.result.length, 0)
    })

    it('search challenges successfully 4 - with terms', async () => {
      const res = await service.searchChallenges({ isMachine: true }, {
        page: 1,
        perPage: 10,
        id: id
      })
      const challengeData = _.cloneDeep(testChallengeData)
      should.equal(res.total, 1)
      should.equal(res.page, 1)
      should.equal(res.perPage, 10)
      should.equal(res.result.length, 1)
      const result = res.result[0]

      should.equal(result.type, data.challengeType.name)
      should.equal(result.track, challengeData.track)
      should.equal(result.name, challengeData.name)
      should.equal(result.description, challengeData.description)
      should.equal(result.timelineTemplateId, challengeData.timelineTemplateId)
      should.equal(result.phases.length, 2)
      should.exist(result.phases[0].id)
      should.equal(result.phases[0].phaseId, data.phase.id)
      should.equal(result.phases[0].duration, challengeData.phases[0].duration)
      should.equal(testHelper.getDatesDiff(result.phases[0].scheduledStartDate, challengeData.startDate), 0)
      should.equal(testHelper.getDatesDiff(result.phases[0].scheduledEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[0].actualStartDate, challengeData.startDate), 0)
      should.equal(testHelper.getDatesDiff(result.phases[0].actualEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.exist(result.phases[1].id)
      should.equal(result.phases[1].phaseId, data.phase2.id)
      should.equal(result.phases[1].predecessor, result.phases[0].id)
      should.equal(result.phases[1].duration, challengeData.phases[1].duration)
      should.equal(testHelper.getDatesDiff(result.phases[1].scheduledStartDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[1].scheduledEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000 + challengeData.phases[1].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[1].actualStartDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[1].actualEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000 + challengeData.phases[1].duration * 1000)
      should.equal(result.prizeSets.length, 1)
      should.equal(result.prizeSets[0].type, data.challenge.prizeSets[0].type)
      should.equal(result.prizeSets[0].description, data.challenge.prizeSets[0].description)
      should.equal(result.prizeSets[0].prizes.length, 1)
      should.equal(result.prizeSets[0].prizes[0].description, data.challenge.prizeSets[0].prizes[0].description)
      should.equal(result.prizeSets[0].prizes[0].type, data.challenge.prizeSets[0].prizes[0].type)
      should.equal(result.prizeSets[0].prizes[0].value, data.challenge.prizeSets[0].prizes[0].value)
      should.equal(result.reviewType, data.challenge.reviewType)
      should.equal(result.tags.length, 1)
      should.equal(result.tags[0], data.challenge.tags[0])
      should.equal(result.projectId, data.challenge.projectId)
      should.equal(result.legacyId, data.challenge.legacyId)
      should.equal(result.forumId, data.challenge.forumId)
      should.equal(result.status, data.challenge.status)
      should.equal(result.groups.length, 1)
      should.equal(result.groups[0], data.challenge.groups[0])
      should.equal(result.gitRepoURLs.length, 1)
      should.equal(result.gitRepoURLs[0], data.challenge.gitRepoURLs[0])
      should.equal(result.createdBy, 'sub')
      should.exist(result.startDate)
      should.exist(result.created)
      should.equal(result.numOfSubmissions, 0)
      should.equal(result.numOfRegistrants, 0)
      should.equal(result.terms.length, 2)
      should.equal(testHelper.deepCompareArrays(result.terms, _.map(data.defaultProjectTerms, t => t.id)), true)
    })

    it('search challenges - invalid name', async () => {
      try {
        await service.searchChallenges({ isMachine: true }, { name: ['invalid'] })
      } catch (e) {
        should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search challenges - invalid memberId', async () => {
      try {
        await service.searchChallenges({ isMachine: true }, { memberId: 'abcde' })
      } catch (e) {
        should.equal(e.message.indexOf('"memberId" must be a number') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search challenges - invalid forumId', async () => {
      try {
        await service.searchChallenges({ isMachine: true }, { forumId: -1 })
      } catch (e) {
        should.equal(e.message.indexOf('"forumId" must be a positive number') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search challenges - invalid page', async () => {
      try {
        await service.searchChallenges({ isMachine: true }, { page: -1 })
      } catch (e) {
        should.equal(e.message.indexOf('"page" must be larger than or equal to 1') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search challenges - invalid perPage', async () => {
      try {
        await service.searchChallenges({ isMachine: true }, { perPage: -1 })
      } catch (e) {
        should.equal(e.message.indexOf('"perPage" must be larger than or equal to 1') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search challenges - invalid name', async () => {
      try {
        await service.searchChallenges({ isMachine: true }, { name: ['abc'] })
      } catch (e) {
        should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search challenges - invalid track', async () => {
      try {
        await service.searchChallenges({ isMachine: true }, { track: ['abc'] })
      } catch (e) {
        should.equal(e.message.indexOf('"track" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search challenges - invalid description', async () => {
      try {
        await service.searchChallenges({ isMachine: true }, { description: ['abc'] })
      } catch (e) {
        should.equal(e.message.indexOf('"description" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search challenges - invalid reviewType', async () => {
      try {
        await service.searchChallenges({ isMachine: true }, { reviewType: ['abc'] })
      } catch (e) {
        should.equal(e.message.indexOf('"reviewType" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search challenges - invalid tag', async () => {
      try {
        await service.searchChallenges({ isMachine: true }, { tag: ['abc'] })
      } catch (e) {
        should.equal(e.message.indexOf('"tag" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search challenges - invalid group', async () => {
      try {
        await service.searchChallenges({ isMachine: true }, { group: ['abc'] })
      } catch (e) {
        should.equal(e.message.indexOf('"group" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search challenges - invalid createdBy', async () => {
      try {
        await service.searchChallenges({ isMachine: true }, { createdBy: ['abc'] })
      } catch (e) {
        should.equal(e.message.indexOf('"createdBy" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search challenges - invalid updatedBy', async () => {
      try {
        await service.searchChallenges({ isMachine: true }, { updatedBy: ['abc'] })
      } catch (e) {
        should.equal(e.message.indexOf('"updatedBy" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('search challenges - unexpected field', async () => {
      try {
        await service.searchChallenges({ isMachine: true }, { other: 123 })
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('fully update challenge tests', () => {
    it('fully update challenge successfully', async () => {
      const challengeData = _.clone(testChallengeData)
      challengeData.projectId = 112233
      challengeData.legacyId = 445566
      challengeData.attachmentIds = [attachment.id]
      const result = await service.fullyUpdateChallenge({ isMachine: true, sub: 'sub2' }, id, challengeData)
      should.equal(result.id, id)
      should.equal(result.typeId, data.challenge.typeId)
      should.equal(result.name, data.challenge.name)
      should.equal(result.description, data.challenge.description)
      should.equal(result.timelineTemplateId, data.challenge.timelineTemplateId)
      should.equal(result.phases.length, 2)
      should.exist(result.phases[0].id)
      should.equal(result.phases[0].phaseId, data.phase.id)
      should.equal(result.phases[0].duration, challengeData.phases[0].duration)
      should.equal(testHelper.getDatesDiff(result.phases[0].scheduledStartDate, challengeData.startDate), 0)
      should.equal(testHelper.getDatesDiff(result.phases[0].scheduledEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[0].actualStartDate, challengeData.startDate), 0)
      should.equal(testHelper.getDatesDiff(result.phases[0].actualEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.exist(result.phases[1].id)
      should.equal(result.phases[1].phaseId, data.phase2.id)
      should.equal(result.phases[1].predecessor, result.phases[0].id)
      should.equal(result.phases[1].duration, challengeData.phases[1].duration)
      should.equal(testHelper.getDatesDiff(result.phases[1].scheduledStartDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[1].scheduledEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000 + challengeData.phases[1].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[1].actualStartDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[1].actualEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000 + challengeData.phases[1].duration * 1000)
      should.equal(result.prizeSets.length, 1)
      should.equal(result.prizeSets[0].type, data.challenge.prizeSets[0].type)
      should.equal(result.prizeSets[0].description, data.challenge.prizeSets[0].description)
      should.equal(result.prizeSets[0].prizes.length, 1)
      should.equal(result.prizeSets[0].prizes[0].description, data.challenge.prizeSets[0].prizes[0].description)
      should.equal(result.prizeSets[0].prizes[0].type, data.challenge.prizeSets[0].prizes[0].type)
      should.equal(result.prizeSets[0].prizes[0].value, data.challenge.prizeSets[0].prizes[0].value)
      should.equal(result.reviewType, data.challenge.reviewType)
      should.equal(result.tags.length, 1)
      should.equal(result.tags[0], data.challenge.tags[0])
      should.equal(result.projectId, 112233)
      should.equal(result.legacyId, 445566)
      should.equal(result.forumId, data.challenge.forumId)
      should.equal(result.status, data.challenge.status)
      should.equal(result.groups.length, 1)
      should.equal(result.groups[0], data.challenge.groups[0])
      should.equal(result.gitRepoURLs.length, 1)
      should.equal(result.gitRepoURLs[0], data.challenge.gitRepoURLs[0])
      should.equal(result.attachments.length, 1)
      should.equal(result.attachments[0].id, attachment.id)
      should.equal(result.attachments[0].fileSize, attachment.fileSize)
      should.equal(result.attachments[0].fileName, attachment.fileName)
      should.equal(result.attachments[0].challengeId, attachment.challengeId)
      should.equal(result.createdBy, 'sub')
      should.equal(result.updatedBy, 'sub2')
      should.exist(result.startDate)
      should.exist(result.created)
      should.exist(result.updated)
      should.equal(result.terms.length, 2)
      should.equal(testHelper.deepCompareArrays(result.terms, _.map(data.defaultProjectTerms, t => t.id)), true)
    })

    it('fully update challenge with winners successfully', async () => {
      const challengeData = _.clone(testCompletedChallengeData)
      challengeData.projectId = 112233
      challengeData.legacyId = 445566
      challengeData.attachmentIds = [attachment.id]
      challengeData.winners = winners
      const result = await service.fullyUpdateChallenge({ isMachine: true, sub: 'sub2' }, id2, challengeData)
      should.equal(result.id, id2)
      should.equal(result.typeId, data.completedChallenge.typeId)
      should.equal(result.track, data.completedChallenge.track)
      should.equal(result.name, data.completedChallenge.name)
      should.equal(result.description, data.completedChallenge.description)
      should.equal(result.timelineTemplateId, data.completedChallenge.timelineTemplateId)
      should.equal(result.phases.length, 2)
      should.exist(result.phases[0].id)
      should.equal(result.phases[0].phaseId, data.phase.id)
      should.equal(result.phases[0].duration, challengeData.phases[0].duration)
      should.equal(testHelper.getDatesDiff(result.phases[0].scheduledStartDate, challengeData.startDate), 0)
      should.equal(testHelper.getDatesDiff(result.phases[0].scheduledEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[0].actualStartDate, challengeData.startDate), 0)
      should.equal(testHelper.getDatesDiff(result.phases[0].actualEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.exist(result.phases[1].id)
      should.equal(result.phases[1].phaseId, data.phase2.id)
      should.equal(result.phases[1].predecessor, result.phases[0].id)
      should.equal(result.phases[1].duration, challengeData.phases[1].duration)
      should.equal(testHelper.getDatesDiff(result.phases[1].scheduledStartDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[1].scheduledEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000 + challengeData.phases[1].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[1].actualStartDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[1].actualEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000 + challengeData.phases[1].duration * 1000)
      should.equal(result.prizeSets.length, 1)
      should.equal(result.prizeSets[0].type, data.completedChallenge.prizeSets[0].type)
      should.equal(result.prizeSets[0].description, data.completedChallenge.prizeSets[0].description)
      should.equal(result.prizeSets[0].prizes.length, 1)
      should.equal(result.prizeSets[0].prizes[0].description, data.completedChallenge.prizeSets[0].prizes[0].description)
      should.equal(result.prizeSets[0].prizes[0].type, data.completedChallenge.prizeSets[0].prizes[0].type)
      should.equal(result.prizeSets[0].prizes[0].value, data.completedChallenge.prizeSets[0].prizes[0].value)
      should.equal(result.reviewType, data.completedChallenge.reviewType)
      should.equal(result.tags.length, 1)
      should.equal(result.tags[0], data.completedChallenge.tags[0])
      should.equal(result.projectId, 112233)
      should.equal(result.legacyId, 445566)
      should.equal(result.forumId, data.completedChallenge.forumId)
      should.equal(result.status, data.completedChallenge.status)
      should.equal(result.groups.length, 1)
      should.equal(result.groups[0], data.completedChallenge.groups[0])
      should.equal(result.gitRepoURLs.length, 1)
      should.equal(result.gitRepoURLs[0], data.completedChallenge.gitRepoURLs[0])
      should.equal(result.attachments.length, 1)
      should.equal(result.attachments[0].id, attachment.id)
      should.equal(result.attachments[0].fileSize, attachment.fileSize)
      should.equal(result.attachments[0].fileName, attachment.fileName)
      should.equal(result.attachments[0].challengeId, attachment.challengeId)
      should.equal(result.winners.length, 2)
      should.equal(result.winners[0].userId, winners[0].userId)
      should.equal(result.winners[0].handle, winners[0].handle)
      should.equal(result.winners[0].placement, winners[0].placement)
      should.equal(result.winners[1].userId, winners[1].userId)
      should.equal(result.winners[1].handle, winners[1].handle)
      should.equal(result.winners[1].placement, winners[1].placement)
      should.equal(result.createdBy, 'sub')
      should.equal(result.updatedBy, 'sub2')
      should.exist(result.startDate)
      should.exist(result.created)
      should.exist(result.updated)
      should.equal(result.terms.length, 2)
      should.equal(testHelper.deepCompareArrays(result.terms, _.map(data.defaultProjectTerms, t => t.id)), true)
    })

    it('fully update challenge - not found', async () => {
      const challengeData = _.clone(testChallengeData)
      challengeData.privateDescription = 'updated-pd'
      try {
        await service.fullyUpdateChallenge({ isMachine: true, sub: 'sub2' }, notFoundId, challengeData)
      } catch (e) {
        should.equal(e.message, `Challenge with id: ${notFoundId} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge - invalid id', async () => {
      const challengeData = _.clone(testChallengeData)
      challengeData.track = 'updated-track'
      challengeData.attachmentIds = [attachment.id]
      try {
        await service.fullyUpdateChallenge({ isMachine: true, sub: 'sub2' }, 'invalid', challengeData)
      } catch (e) {
        should.equal(e.message.indexOf('"challengeId" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it(`fully update challenge - project not found`, async () => {
      const challengeData = _.clone(testChallengeData)
      challengeData.projectId = 100000
      try {
        await service.fullyUpdateChallenge({ userId: '16096823' }, id, challengeData, config.COPILOT_TOKEN)
      } catch (e) {
        should.equal(e.message, `Project with id: 100000 doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it(`fully update challenge - user doesn't have permission to update challenge under specific project`, async () => {
      const challengeData = _.clone(testChallengeData)
      challengeData.projectId = 200
      try {
        await service.fullyUpdateChallenge({ userId: '16096823' }, id, challengeData, config.COPILOT_TOKEN)
      } catch (e) {
        should.equal(e.response.data.result.content.message, 'You do not have permissions to perform this action')
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge - null name', async () => {
      const challengeData = _.clone(testChallengeData)
      try {
        challengeData.name = null
        await service.fullyUpdateChallenge({ isMachine: true, sub: 'sub2' }, id, challengeData)
      } catch (e) {
        should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge - invalid name', async () => {
      const challengeData = _.clone(testChallengeData)
      challengeData.name = ['abc']
      try {
        await service.fullyUpdateChallenge({ isMachine: true, sub: 'sub2' }, id, challengeData)
      } catch (e) {
        should.equal(e.message.indexOf('"name" must be a string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge - invalid status', async () => {
      const challengeData = _.clone(testChallengeData)
      challengeData.status = 'invalid'
      try {
        await service.fullyUpdateChallenge({ isMachine: true, sub: 'sub2' }, id, challengeData)
      } catch (e) {
        should.equal(e.message.indexOf('"status" must be') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge - Completed to Active status', async () => {
      const challengeData = _.clone(testChallengeData)
      challengeData.status = constants.challengeStatuses.Active
      try {
        await service.fullyUpdateChallenge({ isMachine: true, sub: 'sub2' }, id2, challengeData)
      } catch (e) {
        should.equal(e.message.indexOf('Cannot change Completed challenge status to Active status') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge - set winners with non-completed Active status', async () => {
      const challengeData = _.clone(testChallengeData)
      challengeData.winners = winners
      try {
        await service.fullyUpdateChallenge({ isMachine: true, sub: 'sub2' }, id, challengeData)
      } catch (e) {
        should.equal(e.message.indexOf('Cannot set winners for challenge with non-completed Active status') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge - Duplicate member with placement 1', async () => {
      const challengeData = _.clone(testCompletedChallengeData)
      challengeData.winners = [{
        userId: 12345678,
        handle: 'thomaskranitsas',
        placement: 1
      },
      {
        userId: 12345678,
        handle: 'thomaskranitsas',
        placement: 1
      }]
      try {
        await service.fullyUpdateChallenge({ isMachine: true, sub: 'sub2' }, id2, challengeData)
      } catch (e) {
        should.equal(e.message.indexOf('Duplicate member with placement') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge - Only one member can have placement 1', async () => {
      const challengeData = _.clone(testCompletedChallengeData)
      challengeData.winners = [
        {
          userId: 12345678,
          handle: 'thomaskranitsas',
          placement: 1
        },
        {
          userId: 3456789,
          handle: 'tonyj',
          placement: 1
        }
      ]
      try {
        await service.fullyUpdateChallenge({ isMachine: true, sub: 'sub2' }, id2, challengeData)
      } catch (e) {
        should.equal(e.message.indexOf('Only one member can have a placement') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('fully update challenge - The same member 12345678 cannot have multiple placements', async () => {
      const challengeData = _.clone(testCompletedChallengeData)
      challengeData.winners = [
        {
          userId: 12345678,
          handle: 'thomaskranitsas',
          placement: 1
        },
        {
          userId: 12345678,
          handle: 'thomaskranitsas',
          placement: 2
        }
      ]
      try {
        await service.fullyUpdateChallenge({ isMachine: true, sub: 'sub2' }, id2, challengeData)
      } catch (e) {
        should.equal(e.message.indexOf('The same member 12345678 cannot have multiple placements') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('partially update challenge tests', () => {
    it('partially update challenge successfully 1', async () => {
      const challengeData = testChallengeData
      const result = await service.partiallyUpdateChallenge({ isMachine: true, sub: 'sub3' }, id, {
        privateDescription: 'track 333',
        description: 'updated desc',
        attachmentIds: [] // this will delete attachments
      })
      should.equal(result.id, id)
      should.equal(result.typeId, data.challenge.typeId)
      should.equal(result.privateDescription, 'track 333')
      should.equal(result.name, data.challenge.name)
      should.equal(result.description, 'updated desc')
      should.equal(result.timelineTemplateId, data.challenge.timelineTemplateId)
      should.equal(result.phases.length, 2)
      should.exist(result.phases[0].id)
      should.equal(result.phases[0].phaseId, data.phase.id)
      should.equal(result.phases[0].duration, challengeData.phases[0].duration)
      should.equal(testHelper.getDatesDiff(result.phases[0].scheduledStartDate, challengeData.startDate), 0)
      should.equal(testHelper.getDatesDiff(result.phases[0].scheduledEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[0].actualStartDate, challengeData.startDate), 0)
      should.equal(testHelper.getDatesDiff(result.phases[0].actualEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.exist(result.phases[1].id)
      should.equal(result.phases[1].phaseId, data.phase2.id)
      should.equal(result.phases[1].predecessor, result.phases[0].id)
      should.equal(result.phases[1].duration, challengeData.phases[1].duration)
      should.equal(testHelper.getDatesDiff(result.phases[1].scheduledStartDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[1].scheduledEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000 + challengeData.phases[1].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[1].actualStartDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[1].actualEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000 + challengeData.phases[1].duration * 1000)
      should.equal(result.prizeSets.length, 1)
      should.equal(result.prizeSets[0].type, data.challenge.prizeSets[0].type)
      should.equal(result.prizeSets[0].description, data.challenge.prizeSets[0].description)
      should.equal(result.prizeSets[0].prizes.length, 1)
      should.equal(result.prizeSets[0].prizes[0].description, data.challenge.prizeSets[0].prizes[0].description)
      should.equal(result.prizeSets[0].prizes[0].type, data.challenge.prizeSets[0].prizes[0].type)
      should.equal(result.prizeSets[0].prizes[0].value, data.challenge.prizeSets[0].prizes[0].value)
      should.equal(result.reviewType, data.challenge.reviewType)
      should.equal(result.tags.length, 1)
      should.equal(result.tags[0], data.challenge.tags[0])
      should.equal(result.projectId, 112233)
      should.equal(result.legacyId, 445566)
      should.equal(result.forumId, data.challenge.forumId)
      should.equal(result.status, data.challenge.status)
      should.equal(result.groups.length, 1)
      should.equal(result.groups[0], data.challenge.groups[0])
      should.equal(result.gitRepoURLs.length, 1)
      should.equal(result.gitRepoURLs[0], data.challenge.gitRepoURLs[0])
      should.equal(!result.attachments || result.attachments.length === 0, true)
      should.equal(result.createdBy, 'sub')
      should.equal(result.updatedBy, 'sub3')
      should.exist(result.startDate)
      should.exist(result.created)
      should.exist(result.updated)
      should.equal(result.terms.length, 2)
      should.equal(testHelper.deepCompareArrays(result.terms, _.map(data.defaultProjectTerms, t => t.id)), true)
    })

    it('partially update challenge successfully with winners', async () => {
      const challengeData = testChallengeData
      const result = await service.partiallyUpdateChallenge({ isMachine: true, sub: 'sub3' }, id2, {
        winners: [{
          userId: 12345678,
          handle: 'thomaskranitsas',
          placement: 1
        }]
      })
      should.equal(result.id, id2)
      should.equal(result.typeId, data.completedChallenge.typeId)
      should.equal(result.track, data.completedChallenge.track)
      should.equal(result.name, data.completedChallenge.name)
      should.equal(result.description, data.completedChallenge.description)
      should.equal(result.timelineTemplateId, data.completedChallenge.timelineTemplateId)
      should.equal(result.phases.length, 2)
      should.exist(result.phases[0].id)
      should.equal(result.phases[0].phaseId, data.phase.id)
      should.equal(result.phases[0].duration, challengeData.phases[0].duration)
      should.equal(testHelper.getDatesDiff(result.phases[0].scheduledStartDate, challengeData.startDate), 0)
      should.equal(testHelper.getDatesDiff(result.phases[0].scheduledEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[0].actualStartDate, challengeData.startDate), 0)
      should.equal(testHelper.getDatesDiff(result.phases[0].actualEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.exist(result.phases[1].id)
      should.equal(result.phases[1].phaseId, data.phase2.id)
      should.equal(result.phases[1].predecessor, result.phases[0].id)
      should.equal(result.phases[1].duration, challengeData.phases[1].duration)
      should.equal(testHelper.getDatesDiff(result.phases[1].scheduledStartDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[1].scheduledEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000 + challengeData.phases[1].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[1].actualStartDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000)
      should.equal(testHelper.getDatesDiff(result.phases[1].actualEndDate, challengeData.startDate),
        challengeData.phases[0].duration * 1000 + challengeData.phases[1].duration * 1000)
      should.equal(result.prizeSets.length, 1)
      should.equal(result.prizeSets[0].type, data.completedChallenge.prizeSets[0].type)
      should.equal(result.prizeSets[0].description, data.completedChallenge.prizeSets[0].description)
      should.equal(result.prizeSets[0].prizes.length, 1)
      should.equal(result.prizeSets[0].prizes[0].description, data.completedChallenge.prizeSets[0].prizes[0].description)
      should.equal(result.prizeSets[0].prizes[0].type, data.completedChallenge.prizeSets[0].prizes[0].type)
      should.equal(result.prizeSets[0].prizes[0].value, data.completedChallenge.prizeSets[0].prizes[0].value)
      should.equal(result.reviewType, data.completedChallenge.reviewType)
      should.equal(result.tags.length, 1)
      should.equal(result.tags[0], data.completedChallenge.tags[0])
      should.equal(result.projectId, 112233)
      should.equal(result.legacyId, 445566)
      should.equal(result.forumId, data.completedChallenge.forumId)
      should.equal(result.status, data.completedChallenge.status)
      should.equal(result.groups.length, 1)
      should.equal(result.groups[0], data.completedChallenge.groups[0])
      should.equal(result.gitRepoURLs.length, 1)
      should.equal(result.gitRepoURLs[0], data.completedChallenge.gitRepoURLs[0])
      should.equal(result.winners.length, 1)
      should.equal(result.winners[0].userId, winners[0].userId)
      should.equal(result.winners[0].handle, winners[0].handle)
      should.equal(result.winners[0].placement, winners[0].placement)
      should.equal(result.createdBy, 'sub')
      should.equal(result.updatedBy, 'sub3')
      should.exist(result.startDate)
      should.exist(result.created)
      should.exist(result.updated)
      should.equal(result.terms.length, 2)
      should.equal(testHelper.deepCompareArrays(result.terms, _.map(data.defaultProjectTerms, t => t.id)), true)
    })

    it(`partially update challenge - project not found`, async () => {
      try {
        await service.partiallyUpdateChallenge({ userId: '16096823' }, id, { projectId: 100000 }, config.COPILOT_TOKEN)
      } catch (e) {
        should.equal(e.message, `Project with id: 100000 doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it(`partially update challenge - user doesn't have permission to update challenge under specific project`, async () => {
      try {
        await service.partiallyUpdateChallenge({ userId: '16096823' }, id, { projectId: 200 }, config.COPILOT_TOKEN)
      } catch (e) {
        should.equal(e.response.data.result.content.message, 'You do not have permissions to perform this action')
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update challenge - timeline template not found', async () => {
      try {
        await service.partiallyUpdateChallenge({ isMachine: true, sub: 'sub3' }, id, {
          timelineTemplateId: notFoundId
        })
      } catch (e) {
        should.equal(e.message, `TimelineTemplate with id: ${notFoundId} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update challenge - challenge not found', async () => {
      try {
        await service.partiallyUpdateChallenge({ isMachine: true, sub: 'sub3' }, notFoundId, {
          privateDescription: 'track 333'
        })
      } catch (e) {
        should.equal(e.message, `Challenge with id: ${notFoundId} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update challenge - invalid type id', async () => {
      try {
        await service.partiallyUpdateChallenge({ isMachine: true, sub: 'sub3' }, id, {
          typeId: 'invalid'
        })
      } catch (e) {
        should.equal(e.message.indexOf('"typeId" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update challenge - empty tags', async () => {
      try {
        await service.partiallyUpdateChallenge({ isMachine: true, sub: 'sub3' }, id, {
          tags: []
        })
      } catch (e) {
        should.equal(e.message.indexOf('"tags" does not contain 1 required value(s)') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update challenge - invalid start date', async () => {
      try {
        await service.partiallyUpdateChallenge({ isMachine: true, sub: 'sub3' }, id, {
          startDate: 'abc'
        })
      } catch (e) {
        should.equal(e.message.indexOf('"startDate" must be a number of milliseconds or valid date string') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update challenge - empty name', async () => {
      try {
        await service.partiallyUpdateChallenge({ isMachine: true, sub: 'sub3' }, id, {
          name: ''
        })
      } catch (e) {
        should.equal(e.message.indexOf('"name" is not allowed to be empty') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update challenge - unexpected field', async () => {
      try {
        await service.partiallyUpdateChallenge({ isMachine: true, sub: 'sub3' }, id, {
          other: '123'
        })
      } catch (e) {
        should.equal(e.message.indexOf('"other" is not allowed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update challenge - Completed to Active status', async () => {
      try {
        await service.partiallyUpdateChallenge({ isMachine: true, sub: 'sub3' }, id2, {
          status: constants.challengeStatuses.Active
        })
      } catch (e) {
        should.equal(e.message.indexOf('Cannot change Completed challenge status to Active status') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update challenge - set winners with non-completed Active status', async () => {
      try {
        await service.partiallyUpdateChallenge({ isMachine: true, sub: 'sub3' }, id, {
          winners
        })
      } catch (e) {
        should.equal(e.message.indexOf('Cannot set winners for challenge with non-completed Active status') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update challenge - Duplicate member with placement 1', async () => {
      try {
        await service.partiallyUpdateChallenge({ isMachine: true, sub: 'sub3' }, id2, {
          winners: [{
            userId: 12345678,
            handle: 'thomaskranitsas',
            placement: 1
          },
          {
            userId: 12345678,
            handle: 'thomaskranitsas',
            placement: 1
          }]
        })
      } catch (e) {
        should.equal(e.message.indexOf('Duplicate member with placement') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update challenge - Only one member can have placement 1', async () => {
      try {
        await service.partiallyUpdateChallenge({ isMachine: true, sub: 'sub3' }, id2, {
          winners: [
            {
              userId: 12345678,
              handle: 'thomaskranitsas',
              placement: 1
            },
            {
              userId: 3456789,
              handle: 'tonyj',
              placement: 1
            }
          ]
        })
      } catch (e) {
        should.equal(e.message.indexOf('Only one member can have a placement') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('partially update challenge - The same member 12345678 cannot have multiple placements', async () => {
      try {
        await service.partiallyUpdateChallenge({ isMachine: true, sub: 'sub3' }, id2, {
          winners: [
            {
              userId: 12345678,
              handle: 'thomaskranitsas',
              placement: 1
            },
            {
              userId: 12345678,
              handle: 'thomaskranitsas',
              placement: 2
            }
          ]
        })
      } catch (e) {
        should.equal(e.message.indexOf('The same member 12345678 cannot have multiple placements') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })
})
