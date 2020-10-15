/*
 * E2E tests of timeline template API
 */

require('../../app-bootstrap')
const config = require('config')
const uuid = require('uuid/v4')
const chai = require('chai')
const chaiHttp = require('chai-http')
const app = require('../../app')
const helper = require('../../src/common/helper')

const should = chai.should()
chai.use(chaiHttp)

const basePath = `/${config.API_VERSION}/challenge-timelines`

describe('challenge type timeline template API E2E tests', () => {
  // created entity id
  let id
  // reference data
  let type
  let type2
  let timelineTemplate

  const notFoundId = uuid()

  before(async () => {
    type = await helper.create('ChallengeType', {
      id: uuid(),
      name: `type-${new Date().getTime()}`, // random name
      description: 'desc',
      isActive: true,
      abbreviation: 'test'
    })
    type2 = await helper.create('ChallengeType', {
      id: uuid(),
      name: `type2-${new Date().getTime()}`, // random name
      description: 'desc2',
      isActive: true,
      abbreviation: 'test2'
    })
    timelineTemplate = await helper.create('TimelineTemplate', {
      id: uuid(),
      name: `template-${new Date().getTime()}`, // random name
      description: 'desc',
      isActive: true,
      phases: [{
        id: uuid(),
        name: 'test',
        isOpen: true,
        duration: 123
      }]
    })
  })

  after(async () => {
    await type.delete()
    await type2.delete()
    await timelineTemplate.delete()
  })

  describe('create challenge type timeline template API tests', () => {
    it('create challenge type timeline template successfully', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        .send({
          typeId: type.id,
          timelineTemplateId: timelineTemplate.id
        })
      should.equal(response.status, 201)
      const result = response.body
      should.exist(result.id)
      id = result.id
      should.equal(result.typeId, type.id)
      should.equal(result.timelineTemplateId, timelineTemplate.id)
    })

    it('create challenge type timeline template - missing token', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .send({
          typeId: type.id,
          timelineTemplateId: timelineTemplate.id
        })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'No token provided.')
    })

    it('create challenge type timeline template - invalid bearer format', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', 'invalid format')
        .send({
          typeId: type.id,
          timelineTemplateId: timelineTemplate.id
        })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'No token provided.')
    })

    it('create challenge type timeline template - invalid token', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.INVALID_TOKEN}`)
        .send({
          typeId: type.id,
          timelineTemplateId: timelineTemplate.id
        })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'Failed to authenticate token.')
    })

    it('create challenge type timeline template - expired token', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.EXPIRED_TOKEN}`)
        .send({
          typeId: type.id,
          timelineTemplateId: timelineTemplate.id
        })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'Failed to authenticate token.')
    })

    it('create challenge type timeline template - forbidden', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
        .send({
          typeId: type.id,
          timelineTemplateId: timelineTemplate.id
        })
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('create challenge type timeline template - already defined', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          typeId: type.id,
          timelineTemplateId: timelineTemplate.id
        })
      should.equal(response.status, 409)
      should.equal(response.body.message, 'The challenge type timeline template is already defined.')
    })

    it('create challenge type timeline template - missing typeId', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          timelineTemplateId: timelineTemplate.id
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"typeId" is required')
    })

    it('create challenge type timeline template - invalid typeId', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          typeId: 123,
          timelineTemplateId: timelineTemplate.id
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"typeId" must be a string')
    })

    it('create challenge type timeline template - invalid timelineTemplateId', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          typeId: type.id,
          timelineTemplateId: [1]
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"timelineTemplateId" must be a string')
    })

    it('create timeline template - empty timelineTemplateId', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          typeId: type.id,
          timelineTemplateId: ''
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"timelineTemplateId" is not allowed to be empty')
    })

    it('create challenge type timeline template - unexpected field', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          typeId: type.id,
          timelineTemplateId: timelineTemplate.id,
          other: 'def'
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"other" is not allowed')
    })
  })

  describe('get challenge type timeline template API tests', () => {
    it('get challenge type timeline template successfully', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.COPILOT_TOKEN}`)
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.id, id)
      should.equal(result.typeId, type.id)
      should.equal(result.timelineTemplateId, timelineTemplate.id)
    })

    it('get challenge type timeline template - M2M update access token', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.id, id)
      should.equal(result.typeId, type.id)
      should.equal(result.timelineTemplateId, timelineTemplate.id)
    })

    it('get challenge type timeline template - not found', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${notFoundId}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 404)
      should.equal(response.body.message, `ChallengeTypeTimelineTemplate with id: ${notFoundId} doesn't exist`)
    })

    it('get challenge type timeline template - invalid id', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/invalid`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"challengeTypeTimelineTemplateId" must be a valid GUID')
    })
  })

  describe('search challenge type timeline templates API tests', () => {
    it('search challenge type timeline templates successfully 1', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.COPILOT_TOKEN}`)
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.length, 1)
      should.equal(result[0].id, id)
      should.equal(result[0].typeId, type.id)
      should.equal(result[0].timelineTemplateId, timelineTemplate.id)
    })

    it('search challenge type timeline templates successfully 2', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.COPILOT_TOKEN}`)
        .query({ typeId: type.id })
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.length, 1)
      should.equal(result[0].id, id)
      should.equal(result[0].typeId, type.id)
      should.equal(result[0].timelineTemplateId, timelineTemplate.id)
    })

    it('search challenge type timeline templates successfully 3', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.COPILOT_TOKEN}`)
        .query({ timelineTemplateId: timelineTemplate.id })
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.length, 1)
      should.equal(result[0].id, id)
      should.equal(result[0].typeId, type.id)
      should.equal(result[0].timelineTemplateId, timelineTemplate.id)
    })

    it('search challenge type timeline templates successfully 4', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.COPILOT_TOKEN}`)
        .query({ typeId: notFoundId })
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.length, 0)
    })

    it('search challenge type timeline templates - invalid typeId', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ typeId: 1 })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"typeId" must be a valid GUID')
    })

    it('search challenge type timeline templates - invalid timelineTemplateId', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ timelineTemplateId: 1 })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"timelineTemplateId" must be a valid GUID')
    })

    it('search challenge type timeline templates - unexpected field', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ other: 123 })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"other" is not allowed')
    })
  })

  describe('fully update challenge type timeline template API tests', () => {
    it('fully update challenge type timeline template successfully', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          typeId: type2.id,
          timelineTemplateId: timelineTemplate.id
        })
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.id, id)
      should.equal(result.typeId, type2.id)
      should.equal(result.timelineTemplateId, timelineTemplate.id)
    })

    it('fully update challenge type timeline template - forbidden', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.USER_TOKEN}`)
        .send({
          typeId: type2.id,
          timelineTemplateId: timelineTemplate.id
        })
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('fully update challenge type timeline template - not found', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${notFoundId}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          typeId: type2.id,
          timelineTemplateId: timelineTemplate.id
        })
      should.equal(response.status, 404)
      should.equal(response.body.message, `ChallengeTypeTimelineTemplate with id: ${notFoundId} doesn't exist`)
    })

    it('fully update challenge type timeline template - invalid id', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/invalid`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          typeId: type2.id,
          timelineTemplateId: timelineTemplate.id
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"challengeTypeTimelineTemplateId" must be a valid GUID')
    })

    it('fully update challenge type timeline template - null typeId', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          typeId: null,
          timelineTemplateId: timelineTemplate.id
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"typeId" must be a string')
    })

    it('fully update challenge type timeline template - invalid timelineTemplateId', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          typeId: type.id,
          timelineTemplateId: 'abc'
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"timelineTemplateId" must be a valid GUID')
    })

    it('fully update challenge type timeline template - empty timelineTemplateId', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          typeId: type.id,
          timelineTemplateId: ''
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"timelineTemplateId" is not allowed to be empty')
    })
  })

  describe('remove challenge type timeline template API tests', () => {
    it('remove challenge type timeline template - forbidden', async () => {
      const response = await chai.request(app)
        .delete(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.USER_TOKEN}`)
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('remove challenge type timeline template successfully', async () => {
      const response = await chai.request(app)
        .delete(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 200)
      should.equal(response.body.id, id)
      should.equal(response.body.typeId, type2.id)
      should.equal(response.body.timelineTemplateId, timelineTemplate.id)
    })

    it('remove challenge type timeline template - not found 1', async () => {
      const response = await chai.request(app)
        .delete(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 404)
      should.equal(response.body.message, `ChallengeTypeTimelineTemplate with id: ${id} doesn't exist`)
    })

    it('remove challenge type timeline template - not found 2', async () => {
      const response = await chai.request(app)
        .delete(`${basePath}/${notFoundId}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 404)
      should.equal(response.body.message, `ChallengeTypeTimelineTemplate with id: ${notFoundId} doesn't exist`)
    })

    it('remove challenge type timeline template - invalid id', async () => {
      const response = await chai.request(app)
        .delete(`${basePath}/invalid`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"challengeTypeTimelineTemplateId" must be a valid GUID')
    })
  })
})
