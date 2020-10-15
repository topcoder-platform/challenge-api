/*
 * E2E tests of challenge API
 */

require('../../app-bootstrap')
const _ = require('lodash')
const config = require('config')
const uuid = require('uuid/v4')
const fs = require('fs')
const path = require('path')
const chai = require('chai')
const chaiHttp = require('chai-http')
const app = require('../../app')
const constants = require('../../app-constants')
const AttachmentService = require('../../src/services/AttachmentService')
const testHelper = require('../testHelper')

const should = chai.should()
chai.use(chaiHttp)

const basePath = `/${config.API_VERSION}/challenges`

const attachmentContent = fs.readFileSync(path.join(__dirname, '../attachment.txt'))

describe('challenge API E2E tests', () => {
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

  describe('create challenge API tests', () => {
    it('create challenge successfully 1', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.terms = [] // to check if default project terms are added
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 201)
      const result = response.body
      should.exist(result.id)
      id = result.id
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
      should.equal(result.tags.length, 1)
      should.equal(result.tags[0], data.challenge.tags[0])
      should.equal(result.projectId, data.challenge.projectId)
      should.equal(result.legacy.track, data.challenge.legacy.track)
      should.equal(result.legacy.reviewType, data.challenge.legacy.reviewType)
      should.equal(result.legacy.forumId, data.challenge.legacy.forumId)
      should.equal(result.legacyId, data.challenge.legacyId)
      should.equal(result.status, data.challenge.status)
      should.equal(result.groups.length, 1)
      should.equal(result.groups[0], data.challenge.groups[0])
      should.exist(result.startDate)
      should.exist(result.created)
      should.exist(result.createdBy)
      should.equal(result.numOfSubmissions, 0)
      should.equal(result.numOfRegistrants, 0)
      should.equal(result.terms.length, 2)
      should.equal(testHelper.deepCompareArrays(result.terms, _.map(data.defaultProjectTerms, t => t.id)), true)
    })

    it('create challenge successfully with completed status', async () => {
      const challengeData = testCompletedChallengeData
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 201)
      const result = response.body
      should.exist(result.id)
      id2 = result.id
      should.equal(result.typeId, data.completedChallenge.typeId)
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
      should.equal(result.tags.length, 1)
      should.equal(result.tags[0], data.completedChallenge.tags[0])
      should.equal(result.projectId, data.completedChallenge.projectId)
      should.equal(result.legacy.track, data.completedChallenge.legacy.track)
      should.equal(result.legacy.reviewType, data.completedChallenge.legacy.reviewType)
      should.equal(result.legacy.forumId, data.completedChallenge.legacy.forumId)
      should.equal(result.legacyId, data.completedChallenge.legacyId)
      should.equal(result.status, data.completedChallenge.status)
      should.equal(result.groups.length, 1)
      should.equal(result.groups[0], data.completedChallenge.groups[0])
      should.exist(result.startDate)
      should.exist(result.created)
      should.exist(result.createdBy)
      should.equal(result.numOfSubmissions, 0)
      should.equal(result.numOfRegistrants, 0)
      should.equal(result.terms.length, 2)
      should.equal(testHelper.deepCompareArrays(result.terms, _.map(data.defaultProjectTerms, t => t.id)), true)
    })

    it('create challenge successfully 1', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.terms = [data.additionalTerm.id]
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 201)
      const result = response.body
      should.exist(result.id)
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
      should.equal(result.tags.length, 1)
      should.equal(result.tags[0], data.challenge.tags[0])
      should.equal(result.projectId, data.challenge.projectId)
      should.equal(result.legacy.track, data.challenge.legacy.track)
      should.equal(result.legacy.reviewType, data.challenge.legacy.reviewType)
      should.equal(result.legacy.forumId, data.challenge.legacy.forumId)
      should.equal(result.legacyId, data.challenge.legacyId)
      should.equal(result.status, data.challenge.status)
      should.equal(result.groups.length, 1)
      should.equal(result.groups[0], data.challenge.groups[0])
      should.exist(result.startDate)
      should.exist(result.created)
      should.exist(result.createdBy)
      should.equal(result.numOfSubmissions, 0)
      should.equal(result.numOfRegistrants, 0)
      should.equal(result.terms.length, 3)
      should.equal(
        testHelper.deepCompareArrays(
          result.terms,
          _.union(_.map(data.defaultProjectTerms, t => t.id), [data.additionalTerm.id])
        ),
        true
      )
    })

    it('should not create challenge with duplicate terms', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.terms = [data.mockTerms[0], data.mockTerms[0]]

      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, `There are duplicate elements (${data.mockTerms[0]}) for terms.`)
    })

    it('should not create challenge with non existing terms', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.terms = [data.mockTerms[0], data.mockTerms[1].replace('c', 'a')]

      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, `Terms of use identified by the id ${data.mockTerms[1].replace('c', 'a')} does not exist`)
    })

    it('should not create challenge with invalid terms ids data type', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.terms = ['20653']

      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message.indexOf('"0" must be a valid GUID') >= 0, true)
    })

    it('create challenge - missing token', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .send(testChallengeData)
      should.equal(response.status, 401)
      should.equal(response.body.message, 'No token provided.')
    })

    it('create challenge - invalid bearer format', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', 'invalid format')
        .send(testChallengeData)
      should.equal(response.status, 401)
      should.equal(response.body.message, 'No token provided.')
    })

    it('create challenge - invalid token', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.INVALID_TOKEN}`)
        .send(testChallengeData)
      should.equal(response.status, 401)
      should.equal(response.body.message, 'Failed to authenticate token.')
    })

    it('create challenge - expired token', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.EXPIRED_TOKEN}`)
        .send(testChallengeData)
      should.equal(response.status, 401)
      should.equal(response.body.message, 'Failed to authenticate token.')
    })

    it('create challenge - forbidden', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
        .send(testChallengeData)
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('create challenge - type not found', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.typeId = notFoundId
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, `No challenge type found with id: ${notFoundId}.`)
    })

    it(`create challenge - user doesn't have permission to create challenge under specific project`, async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.projectId = 200
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.COPILOT_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You do not have permissions to perform this action')
    })

    it(`create challenge - project not found`, async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.projectId = 100000
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.COPILOT_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, `Project with id: ${challengeData.projectId} doesn't exist`)
    })

    it('create challenge - invalid track', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.legacy.track = [1, 2]
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"track" must be a string')
    })

    it('create challenge - invalid description', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.description = [1, 2]
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"description" must be a string')
    })

    it('create challenge - invalid projectId', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.projectId = -1
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"projectId" must be a positive number')
    })

    it('create challenge - invalid forumId', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.legacy.forumId = -1
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"forumId" must be a positive number')
    })

    it('create challenge - invalid legacyId', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.legacyId = -1
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"legacyId" must be a positive number')
    })

    it('create challenge - missing name', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      delete challengeData.name
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" is required')
    })

    it('create challenge - invalid start date', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.startDate = 'abc'
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"startDate" must be a number of milliseconds or valid date string')
    })

    it('create challenge - invalid status', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.status = 'invalid'
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"status" must be one of [New, Draft, Cancelled, Active, Completed]')
    })

    it('create challenge - unexpected field', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.other = 'invalid'
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"other" is not allowed')
    })
  })

  describe('get challenge API tests', () => {
    it('get challenge successfully', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${data.challenge.id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.id, data.challenge.id)
      should.equal(result.typeId, data.challenge.typeId)
      should.equal(result.name, data.challenge.name)
      should.equal(result.description, data.challenge.description)
      should.equal(result.timelineTemplateId, data.challenge.timelineTemplateId)
      should.equal(result.phases.length, 1)
      should.equal(result.phases[0].id, data.challenge.phases[0].id)
      should.equal(result.phases[0].name, data.challenge.phases[0].name)
      should.equal(result.phases[0].description, data.challenge.phases[0].description)
      should.equal(result.phases[0].isActive, data.challenge.phases[0].isActive)
      should.equal(result.phases[0].duration, data.challenge.phases[0].duration)
      should.equal(result.prizeSets.length, 1)
      should.equal(result.prizeSets[0].type, data.challenge.prizeSets[0].type)
      should.equal(result.prizeSets[0].description, data.challenge.prizeSets[0].description)
      should.equal(result.prizeSets[0].prizes.length, 1)
      should.equal(result.prizeSets[0].prizes[0].description, data.challenge.prizeSets[0].prizes[0].description)
      should.equal(result.prizeSets[0].prizes[0].type, data.challenge.prizeSets[0].prizes[0].type)
      should.equal(result.prizeSets[0].prizes[0].value, data.challenge.prizeSets[0].prizes[0].value)
      should.equal(result.tags.length, 1)
      should.equal(result.tags[0], data.challenge.tags[0])
      should.equal(result.projectId, data.challenge.projectId)
      should.equal(result.legacy.track, data.challenge.legacy.track)
      should.equal(result.legacy.reviewType, data.challenge.legacy.reviewType)
      should.equal(result.legacy.forumId, data.challenge.legacy.forumId)
      should.equal(result.legacyId, data.challenge.legacyId)
      should.equal(result.status, data.challenge.status)
      should.equal(result.groups.length, 1)
      should.equal(result.groups[0], data.challenge.groups[0])
      should.exist(result.startDate)
      should.exist(result.created)
      should.exist(result.createdBy)
      should.equal(result.numOfSubmissions, 0)
      should.equal(result.numOfRegistrants, 0)
    })

    it('should get challenge successfully with terms', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 200)
      const result = response.body
      const challengeData = _.cloneDeep(testChallengeData)
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
      should.equal(result.tags.length, 1)
      should.equal(result.tags[0], data.challenge.tags[0])
      should.equal(result.projectId, data.challenge.projectId)
      should.equal(result.legacy.track, data.challenge.legacy.track)
      should.equal(result.legacy.reviewType, data.challenge.legacy.reviewType)
      should.equal(result.legacy.forumId, data.challenge.legacy.forumId)
      should.equal(result.legacyId, data.challenge.legacyId)
      should.equal(result.status, data.challenge.status)
      should.equal(result.groups.length, 1)
      should.equal(result.groups[0], data.challenge.groups[0])
      should.equal(result.gitRepoURLs.length, 1)
      should.equal(result.gitRepoURLs[0], data.challenge.gitRepoURLs[0])
      should.equal(result.createdBy, 'TopcoderService')
      should.exist(result.startDate)
      should.exist(result.created)
      should.equal(result.numOfSubmissions, 0)
      should.equal(result.numOfRegistrants, 0)
      should.equal(result.terms.length, 2)
      should.equal(testHelper.deepCompareArrays(result.terms, _.map(data.defaultProjectTerms, t => t.id)), true)
    })

    it('get challenge - forbidden', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${data.challenge.id}`)
        .set('Authorization', `Bearer ${config.USER_TOKEN}`)
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You don\'t have access to this group!')
    })

    it('get challenge - not found', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${notFoundId}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 404)
      should.equal(response.body.message, `Challenge of id ${notFoundId} is not found.`)
    })

    it('get challenge - invalid id', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/invalid`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"id" must be a valid GUID')
    })
  })

  describe('search challenges API tests', () => {
    it('search challenges successfully 1', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
        .query({
          page: 1,
          perPage: 10,
          id: data.challenge.id,
          typeId: data.challenge.typeId,
          track: data.challenge.legacy.track,
          name: data.challenge.name.substring(2).trim().toUpperCase(),
          description: data.challenge.description,
          timelineTemplateId: data.challenge.timelineTemplateId,
          reviewType: data.challenge.legacy.reviewType,
          tag: data.challenge.tags[0],
          projectId: data.challenge.projectId,
          forumId: data.challenge.legacy.forumId,
          legacyId: data.challenge.legacyId,
          status: data.challenge.status,
          group: data.challenge.groups[0],
          createdDateStart: '1992-01-02',
          createdDateEnd: '2022-01-02',
          createdBy: data.challenge.createdBy,
          memberId: 40309246
        })
      should.equal(response.status, 200)
      should.equal(response.headers['x-page'], '1')
      should.equal(response.headers['x-per-page'], '10')
      should.equal(response.headers['x-total'], '1')
      should.equal(response.headers['x-total-pages'], '1')
      should.exist(response.headers['link'])

      should.equal(response.body.length, 1)
      const result = response.body[0]
      should.equal(result.id, data.challenge.id)
      should.equal(result.type, data.challengeType.name)
      should.equal(result.name, data.challenge.name)
      should.equal(result.description, data.challenge.description)
      should.equal(result.timelineTemplateId, data.challenge.timelineTemplateId)
      should.equal(result.phases.length, 1)
      should.equal(result.phases[0].id, data.challenge.phases[0].id)
      should.equal(result.phases[0].name, data.challenge.phases[0].name)
      should.equal(result.phases[0].description, data.challenge.phases[0].description)
      should.equal(result.phases[0].isActive, data.challenge.phases[0].isActive)
      should.equal(result.phases[0].duration, data.challenge.phases[0].duration)
      should.equal(result.prizeSets.length, 1)
      should.equal(result.prizeSets[0].type, data.challenge.prizeSets[0].type)
      should.equal(result.prizeSets[0].description, data.challenge.prizeSets[0].description)
      should.equal(result.prizeSets[0].prizes.length, 1)
      should.equal(result.prizeSets[0].prizes[0].description, data.challenge.prizeSets[0].prizes[0].description)
      should.equal(result.prizeSets[0].prizes[0].type, data.challenge.prizeSets[0].prizes[0].type)
      should.equal(result.prizeSets[0].prizes[0].value, data.challenge.prizeSets[0].prizes[0].value)
      should.equal(result.tags.length, 1)
      should.equal(result.tags[0], data.challenge.tags[0])
      should.equal(result.projectId, data.challenge.projectId)
      should.equal(result.legacy.track, data.challenge.legacy.track)
      should.equal(result.legacy.reviewType, data.challenge.legacy.reviewType)
      should.equal(result.legacy.forumId, data.challenge.legacy.forumId)
      should.equal(result.legacyId, data.challenge.legacyId)
      should.equal(result.status, data.challenge.status)
      should.equal(result.groups.length, 1)
      should.equal(result.groups[0], data.challenge.groups[0])
      should.exist(result.startDate)
      should.exist(result.created)
      should.exist(result.createdBy)
      should.equal(result.numOfSubmissions, 0)
      should.equal(result.numOfRegistrants, 0)
    })

    it('search challenges successfully 2', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        .query({ name: 'xxjklsdjfihx' })
      should.equal(response.status, 200)
      should.equal(response.headers['x-page'], '1')
      should.equal(response.headers['x-per-page'], '20')
      should.equal(response.headers['x-total'], '0')
      should.equal(response.headers['x-total-pages'], '0')
      should.equal(response.body.length, 0)
    })

    it('search challenges successfully 3', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
        .query({
          page: 1,
          perPage: 10,
          id: data.challenge.id,
          typeId: data.challenge.typeId,
          track: data.challenge.legacy.track,
          name: data.challenge.name.substring(2).trim().toUpperCase(),
          description: data.challenge.description,
          timelineTemplateId: data.challenge.timelineTemplateId,
          reviewType: data.challenge.legacy.reviewType,
          tag: data.challenge.tags[0],
          projectId: data.challenge.projectId,
          forumId: data.challenge.legacy.forumId,
          legacyId: data.challenge.legacyId,
          status: data.challenge.status,
          group: data.challenge.groups[0],
          createdDateStart: '1992-01-02',
          createdDateEnd: '2022-01-02',
          createdBy: data.challenge.createdBy,
          memberId: 23124329
        })
      should.equal(response.status, 200)
      should.equal(response.headers['x-page'], '1')
      should.equal(response.headers['x-per-page'], '10')
      should.equal(response.headers['x-total'], '0')
      should.equal(response.headers['x-total-pages'], '0')

      should.equal(response.body.length, 0)
    })

    it('search challenges successfully 4 - with terms', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
        .query({
          page: 1,
          perPage: 10,
          id
        })
      const challengeData = _.cloneDeep(testChallengeData)
      should.equal(response.status, 200)
      should.equal(response.headers['x-page'], '1')
      should.equal(response.headers['x-per-page'], '10')
      should.equal(response.headers['x-total'], '1')
      should.equal(response.headers['x-total-pages'], '1')
      should.exist(response.headers['link'])

      should.equal(response.body.length, 1)
      const result = response.body[0]

      should.equal(result.type, data.challengeType.name)
      should.equal(result.legacy.track, challengeData.legacy.track)
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
      should.equal(result.legacy.reviewType, data.challenge.legacy.reviewType)
      should.equal(result.tags.length, 1)
      should.equal(result.tags[0], data.challenge.tags[0])
      should.equal(result.projectId, data.challenge.projectId)
      should.equal(result.legacyId, data.challenge.legacyId)
      should.equal(result.legacy.forumId, data.challenge.legacy.forumId)
      should.equal(result.status, data.challenge.status)
      should.equal(result.groups.length, 1)
      should.equal(result.groups[0], data.challenge.groups[0])
      should.equal(result.gitRepoURLs.length, 1)
      should.equal(result.gitRepoURLs[0], data.challenge.gitRepoURLs[0])
      should.equal(result.createdBy, 'TopcoderService')
      should.exist(result.startDate)
      should.exist(result.created)
      should.equal(result.numOfSubmissions, 0)
      should.equal(result.numOfRegistrants, 0)
      should.equal(result.terms.length, 2)
      should.equal(testHelper.deepCompareArrays(result.terms, _.map(data.defaultProjectTerms, t => t.id)), true)
    })

    it('search challenges - invalid page', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ page: -1 })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"page" must be larger than or equal to 1')
    })

    it('search challenges - invalid memberId', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ memberId: 'abcde' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"memberId" must be a number')
    })

    it('search challenges - invalid perPage', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ perPage: 'abc' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"perPage" must be a number')
    })

    it('search challenges - invalid id', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ id: 'abc' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"id" must be a valid GUID')
    })

    it('search challenges - invalid typeId', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ typeId: 'abc' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"typeId" must be a valid GUID')
    })

    it('search challenges - invalid timelineTemplateId', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ timelineTemplateId: [1, 2] })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"timelineTemplateId" must be a string')
    })

    it('search challenges - invalid projectId', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ projectId: -1 })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"projectId" must be a positive number')
    })

    it('search challenges - invalid forumId', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ forumId: -1 })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"forumId" must be a positive number')
    })

    it('search challenges - invalid legacyId', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ legacyId: -1 })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"legacyId" must be a positive number')
    })

    it('search challenges - invalid status', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ status: 'abc' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"status" must be one of [New, Draft, Cancelled, Active, Completed]')
    })

    it('search challenges - invalid createdDateStart', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ createdDateStart: 'abc' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"createdDateStart" must be a number of milliseconds or valid date string')
    })

    it('search challenges - invalid createdDateEnd', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ createdDateEnd: 'abc' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"createdDateEnd" must be a number of milliseconds or valid date string')
    })

    it('search challenges - invalid updatedDateStart', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ updatedDateStart: 'abc' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"updatedDateStart" must be a number of milliseconds or valid date string')
    })

    it('search challenges - invalid updatedDateEnd', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ updatedDateEnd: 'abc' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"updatedDateEnd" must be a number of milliseconds or valid date string')
    })

    it('search challenges - unexpected field', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ other: 123 })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"other" is not allowed')
    })
  })

  describe('fully update challenge API tests', () => {
    it('fully update challenge successfully', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.projectId = 112233
      challengeData.legacyId = 445566
      challengeData.attachmentIds = [attachment.id]
      challengeData.terms = _.union(_.map(data.defaultProjectTerms, t => t.id), [data.additionalTerm.id])
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.id, id)
      should.equal(result.typeId, data.challenge.typeId)
      should.equal(result.legacy.track, data.challenge.legacy.track)
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
      should.equal(result.legacy.reviewType, data.challenge.legacy.reviewType)
      should.equal(result.tags.length, 1)
      should.equal(result.tags[0], data.challenge.tags[0])
      should.equal(result.projectId, 112233)
      should.equal(result.legacyId, 445566)
      should.equal(result.legacy.forumId, data.challenge.legacy.forumId)
      should.equal(result.status, data.challenge.status)
      should.equal(result.groups.length, 1)
      should.equal(result.groups[0], data.challenge.groups[0])
      should.equal(result.attachments.length, 1)
      should.equal(result.attachments[0].id, attachment.id)
      should.equal(result.attachments[0].fileSize, attachment.fileSize)
      should.equal(result.attachments[0].fileName, attachment.fileName)
      should.equal(result.attachments[0].challengeId, attachment.challengeId)
      should.exist(result.startDate)
      should.exist(result.createdBy)
      should.exist(result.updatedBy)
      should.exist(result.created)
      should.exist(result.updated)
      should.equal(result.terms.length, 3)
      should.equal(
        testHelper.deepCompareArrays(
          result.terms,
          _.union(_.map(data.defaultProjectTerms, t => t.id), [data.additionalTerm.id])
        ),
        true
      )
    })

    it('fully update challenge with winners successfully', async () => {
      const challengeData = _.cloneDeep(testCompletedChallengeData)
      challengeData.projectId = 112233
      challengeData.legacyId = 445566
      challengeData.attachmentIds = [attachment.id]
      challengeData.winners = winners
      challengeData.terms = _.map(data.defaultProjectTerms, t => t.id)
      const response = await chai.request(app)
        .put(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.id, id2)
      should.equal(result.typeId, data.completedChallenge.typeId)
      should.equal(result.legacy.track, data.completedChallenge.legacy.track)
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
      should.equal(result.legacy.reviewType, data.completedChallenge.legacy.reviewType)
      should.equal(result.tags.length, 1)
      should.equal(result.tags[0], data.completedChallenge.tags[0])
      should.equal(result.projectId, 112233)
      should.equal(result.legacyId, 445566)
      should.equal(result.legacy.forumId, data.completedChallenge.legacy.forumId)
      should.equal(result.status, data.completedChallenge.status)
      should.equal(result.groups.length, 1)
      should.equal(result.groups[0], data.completedChallenge.groups[0])
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
      should.exist(result.startDate)
      should.exist(result.createdBy)
      should.exist(result.updatedBy)
      should.exist(result.created)
      should.exist(result.updated)
      should.equal(result.terms.length, 2)
      should.equal(testHelper.deepCompareArrays(result.terms, _.map(data.defaultProjectTerms, t => t.id)), true)
    })

    it('should not fully update challenge with duplicate terms', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.terms = [data.mockTerms[0], data.mockTerms[0]]

      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, `There are duplicate elements (${data.mockTerms[0]}) for terms.`)
    })

    it('should not fully update challenge when removing default project terms', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.terms = [data.additionalTerm.id]

      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, `Default project terms ${_.map(data.defaultProjectTerms, t => t.id)} should not be removed`)
    })

    it('should not fully update challenge with non existing terms', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.terms = [data.defaultProjectTerms[0].id, data.defaultProjectTerms[1].id, data.mockTerms[1].replace('c', 'b')]

      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, `Terms of use identified by the id ${data.mockTerms[1].replace('c', 'b')} does not exist`)
    })

    it('should not fully update challenge with invalid terms ids data type', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.terms = ['20653']

      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message.indexOf('"0" must be a valid GUID') >= 0, true)
    })

    it('fully update challenge - forbidden', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.USER_TOKEN}`)
        .send(testChallengeData)
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('fully update challenge - not found', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${notFoundId}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(testChallengeData)
      should.equal(response.status, 404)
      should.equal(response.body.message, `Challenge with id: ${notFoundId} doesn't exist`)
    })

    it('fully update challenge - invalid id', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/invalid`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(testChallengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"challengeId" must be a valid GUID')
    })

    it('fully update challenge - project not found', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.projectId = 100000

      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, `Project with id: ${challengeData.projectId} doesn't exist`)
    })

    it(`fully update challenge - user doesn't have permission to update challenge under specific project`, async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.projectId = 200

      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You do not have permissions to perform this action')
    })

    it('fully update challenge - null name', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.name = null
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" must be a string')
    })

    it('fully update challenge - invalid track', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.legacy.track = ['updated-track']
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"track" must be a string')
    })

    it('fully update challenge - invalid timelineTemplateId', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.timelineTemplateId = [1, 2]
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"timelineTemplateId" must be a string')
    })

    it('fully update challenge - invalid phases', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.phases = [{ duration: 999 }]
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"phaseId" is required')
    })

    it('fully update challenge - empty reviewType', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.legacy.reviewType = ''
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"reviewType" is not allowed to be empty')
    })

    it('fully update challenge - invalid prize', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.prizeSets[0].prizes[0].value = -1
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"value" must be larger than or equal to 0')
    })

    it('fully update challenge - invalid placement', async () => {
      const challengeData = _.cloneDeep(testCompletedChallengeData)
      challengeData.winners = [{
        userId: 12345678,
        handle: 'thomaskranitsas',
        placement: -1
      }]
      const response = await chai.request(app)
        .put(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"placement" must be a positive number')
    })

    it('fully update challenge - invalid handle', async () => {
      const challengeData = _.cloneDeep(testCompletedChallengeData)
      challengeData.winners = [{
        userId: 12345678,
        handle: 567,
        placement: 1
      }]
      const response = await chai.request(app)
        .put(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"handle" must be a string')
    })

    it('fully update challenge - empty winners', async () => {
      const challengeData = _.cloneDeep(testCompletedChallengeData)
      challengeData.winners = []
      const response = await chai.request(app)
        .put(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"winners" must contain at least 1 items')
    })

    it('fully update challenge - Completed to Active status', async () => {
      const challengeData = _.cloneDeep(testCompletedChallengeData)
      challengeData.status = constants.challengeStatuses.Active
      const response = await chai.request(app)
        .put(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Cannot change Completed challenge status to Active status')
    })

    it('fully update challenge - set winners with non-completed Active status', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.winners = winners
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Cannot set winners for challenge with non-completed Active status')
    })

    it('fully update challenge - Duplicate member with placement 1', async () => {
      const challengeData = _.cloneDeep(testCompletedChallengeData)
      challengeData.winners = [
        {
          userId: 12345678,
          handle: 'thomaskranitsas',
          placement: 1
        },
        {
          userId: 12345678,
          handle: 'thomaskranitsas',
          placement: 1
        }
      ]
      const response = await chai.request(app)
        .put(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, `Duplicate member with placement: { userId: 12345678, handle: 'thomaskranitsas', placement: 1 }`)
    })

    it('fully update challenge - Only one member can have placement 1', async () => {
      const challengeData = _.cloneDeep(testCompletedChallengeData)
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
      const response = await chai.request(app)
        .put(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Only one member can have a placement: 1')
    })

    it('fully update challenge - The same member 12345678 cannot have multiple placements', async () => {
      const challengeData = _.cloneDeep(testCompletedChallengeData)
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
      const response = await chai.request(app)
        .put(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, 'The same member 12345678 cannot have multiple placements')
    })
  })

  describe('partially update challenge API tests', () => {
    it('partially update challenge successfully', async () => {
      const challengeData = testChallengeData
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        .send({
          tags: ['tag-abc'],
          description: 'updated desc',
          attachmentIds: [] // this will delete attachments
        })
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.id, id)
      should.equal(result.typeId, data.challenge.typeId)
      should.equal(result.legacy.track, data.challenge.legacy.track)
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
      should.equal(result.legacy.reviewType, data.challenge.legacy.reviewType)
      should.equal(result.tags.length, 1)
      should.equal(result.tags[0], 'tag-abc')
      should.equal(result.projectId, 112233)
      should.equal(result.legacyId, 445566)
      should.equal(result.legacy.forumId, data.challenge.legacy.forumId)
      should.equal(result.status, data.challenge.status)
      should.equal(result.groups.length, 1)
      should.equal(result.groups[0], data.challenge.groups[0])
      should.equal(!result.attachments || result.attachments.length === 0, true)
      should.exist(result.startDate)
      should.exist(result.createdBy)
      should.exist(result.updatedBy)
      should.exist(result.created)
      should.exist(result.updated)
      should.equal(result.terms.length, 3)
      should.equal(
        testHelper.deepCompareArrays(
          result.terms,
          _.union(_.map(data.defaultProjectTerms, t => t.id), [data.additionalTerm.id])
        ),
        true
      )
    })

    it('partially update challenge successfully with winners', async () => {
      const challengeData = testChallengeData
      const response = await chai.request(app)
        .patch(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        .send({
          winners: [{
            userId: 12345678,
            handle: 'thomaskranitsas',
            placement: 1
          }]
        })
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.id, id2)
      should.equal(result.typeId, data.completedChallenge.typeId)
      should.equal(result.legacy.track, data.completedChallenge.legacy.track)
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
      should.equal(result.legacy.reviewType, data.completedChallenge.legacy.reviewType)
      should.equal(result.tags.length, 1)
      should.equal(result.tags[0], data.completedChallenge.tags[0])
      should.equal(result.projectId, 112233)
      should.equal(result.legacyId, 445566)
      should.equal(result.legacy.forumId, data.completedChallenge.legacy.forumId)
      should.equal(result.status, data.completedChallenge.status)
      should.equal(result.groups.length, 1)
      should.equal(result.groups[0], data.completedChallenge.groups[0])
      should.equal(result.winners.length, 1)
      should.equal(result.winners[0].userId, winners[0].userId)
      should.equal(result.winners[0].handle, winners[0].handle)
      should.equal(result.winners[0].placement, winners[0].placement)
      should.exist(result.startDate)
      should.exist(result.createdBy)
      should.exist(result.updatedBy)
      should.exist(result.created)
      should.exist(result.updated)
      should.equal(result.terms.length, 2)
      should.equal(testHelper.deepCompareArrays(result.terms, _.map(data.defaultProjectTerms, t => t.id)), true)
    })

    it('should partially update challenge terms successfully', async () => {
      const challengeData = testChallengeData
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        .send({
          terms: _.map(data.defaultProjectTerms, t => t.id)
        })
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.id, id)
      should.equal(result.typeId, data.challenge.typeId)
      should.equal(result.legacy.track, data.challenge.legacy.track)
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
      should.equal(result.legacy.reviewType, data.challenge.legacy.reviewType)
      should.equal(result.tags.length, 1)
      should.equal(result.tags[0], 'tag-abc')
      should.equal(result.projectId, 112233)
      should.equal(result.legacyId, 445566)
      should.equal(result.legacy.forumId, data.challenge.legacy.forumId)
      should.equal(result.status, data.challenge.status)
      should.equal(result.groups.length, 1)
      should.equal(result.groups[0], data.challenge.groups[0])
      should.equal(!result.attachments || result.attachments.length === 0, true)
      should.exist(result.startDate)
      should.exist(result.createdBy)
      should.exist(result.updatedBy)
      should.exist(result.created)
      should.exist(result.updated)
      should.equal(result.terms.length, 2)
      should.equal(testHelper.deepCompareArrays(result.terms, _.map(data.defaultProjectTerms, t => t.id)), true)
    })

    it('should not partially update challenge with duplicate terms', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.terms = [data.defaultProjectTerms[0].id, data.defaultProjectTerms[0].id]

      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, `There are duplicate elements (${data.defaultProjectTerms[0].id}) for terms.`)
    })

    it('should not partially update challenge when removing default project terms', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.terms = [data.additionalTerm.id]

      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, `Default project terms ${_.map(data.defaultProjectTerms, t => t.id)} should not be removed`)
    })

    it('should not partially update challenge with non existing terms', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.terms = _.union(
        _.map(data.defaultProjectTerms, t => t.id),
        [ data.mockTerms[0].replace('c', 'b') ]
      )

      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message, `Terms of use identified by the id ${data.mockTerms[0].replace('c', 'b')} does not exist`)
    })

    it('should not partially update challenge with invalid terms ids data type', async () => {
      const challengeData = _.cloneDeep(testChallengeData)
      challengeData.terms = ['20653']

      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send(challengeData)
      should.equal(response.status, 400)
      should.equal(response.body.message.indexOf('"0" must be a valid GUID') >= 0, true)
    })

    it('partially update challenge - forbidden', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
        .send({ name: 'testing2' })
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('partially update challenge - not found', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${notFoundId}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ name: 'testing2' })
      should.equal(response.status, 404)
      should.equal(response.body.message, `Challenge with id: ${notFoundId} doesn't exist`)
    })

    it('partially update challenge - invalid id', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/invalid`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ name: 'testing2' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"challengeId" must be a valid GUID')
    })

    it('partially update challenge - project not found', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ projectId: 100000 })
      should.equal(response.status, 400)
      should.equal(response.body.message, `Project with id: 100000 doesn't exist`)
    })

    it(`partially update challenge - user doesn't have permission to update challenge under specific project`, async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ projectId: 200 })
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You do not have permissions to perform this action')
    })

    it('partially update challenge - null name', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ name: null })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" must be a string')
    })

    it('partially update challenge - invalid name', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ name: { invalid: 123 } })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" must be a string')
    })

    it('partially update challenge - empty name', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ name: '' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" is not allowed to be empty')
    })

    it('partially update challenge - invalid tags', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ tags: [] })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"tags" does not contain 1 required value(s)')
    })

    it('partially update challenge - invalid groups', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ groups: 'group1 group2' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"groups" must be an array')
    })

    it('partially update challenge - invalid attachmentIds', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ attachmentIds: ['abc'] })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"0" must be a valid GUID')
    })

    it('partially update challenge - invalid placement', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ winners: [{
          userId: 12345678,
          handle: 'thomaskranitsas',
          placement: -1
        }] })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"placement" must be a positive number')
    })

    it('partially update challenge - invalid handle', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ winners: [{
          userId: 12345678,
          handle: 5678,
          placement: 1
        }] })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"handle" must be a string')
    })

    it('partially update challenge - empty winners', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ winners: [] })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"winners" must contain at least 1 items')
    })

    it('partially update challenge - Completed to Active status', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ status: constants.challengeStatuses.Active })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Cannot change Completed challenge status to Active status')
    })

    it('partially update challenge - set winners with non-completed Active status', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ winners })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Cannot set winners for challenge with non-completed Active status')
    })

    it('partially update challenge - Duplicate member with placement 1', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ winners: [
          {
            userId: 12345678,
            handle: 'thomaskranitsas',
            placement: 1
          },
          {
            userId: 12345678,
            handle: 'thomaskranitsas',
            placement: 1
          }
        ] })
      should.equal(response.status, 400)
      should.equal(response.body.message, `Duplicate member with placement: { userId: 12345678, handle: 'thomaskranitsas', placement: 1 }`)
    })

    it('partially update challenge - Only one member can have placement 1', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ winners: [
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
        ] })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'Only one member can have a placement: 1')
    })

    it('partially update challenge -The same member 12345678 cannot have multiple placements', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ winners: [
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
        ] })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'The same member 12345678 cannot have multiple placements')
    })
  })
})
