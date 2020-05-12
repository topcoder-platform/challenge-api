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

const basePath = `/${config.API_VERSION}/timeline-templates`

describe('timeline template API E2E tests', () => {
  // created entity ids
  let id
  let id2
  // random names
  const name = `test1${new Date().getTime()}`
  const name2 = `test2${new Date().getTime()}`
  const notFoundId = uuid()
  // reference data
  let phase
  const predecessor = uuid()

  before(async () => {
    phase = await helper.create('Phase', {
      id: uuid(),
      name: `phase${new Date().getTime()}`, // random name
      description: 'desc',
      isOpen: true,
      duration: 123
    })
  })

  after(async () => {
    await phase.delete()
  })

  describe('create timeline template API tests', () => {
    it('create timeline template successfully 1', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        .send({
          name,
          description: 'desc',
          isActive: true,
          phases: [{ phaseId: phase.id, predecessor, defaultDuration: 123 }]
        })
      should.equal(response.status, 201)
      const result = response.body
      should.exist(result.id)
      id = result.id
      should.equal(result.name, name)
      should.equal(result.description, 'desc')
      should.equal(result.isActive, true)
      should.equal(result.phases.length, 1)
      should.equal(result.phases[0].phaseId, phase.id)
      should.equal(result.phases[0].predecessor, predecessor)
      should.equal(result.phases[0].defaultDuration, 123)
    })

    it('create timeline template successfully 2', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name: name2,
          description: 'desc',
          isActive: false,
          phases: [{ phaseId: phase.id, predecessor, defaultDuration: 123 }]
        })
      should.equal(response.status, 201)
      const result = response.body
      should.exist(result.id)
      id2 = result.id
      should.equal(result.name, name2)
      should.equal(result.description, 'desc')
      should.equal(result.isActive, false)
      should.equal(result.phases.length, 1)
      should.equal(result.phases[0].phaseId, phase.id)
      should.equal(result.phases[0].predecessor, predecessor)
      should.equal(result.phases[0].defaultDuration, 123)
    })

    it('create timeline template - missing token', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .send({
          name,
          description: 'desc',
          isActive: true,
          phases: [{ phaseId: phase.id, predecessor, defaultDuration: 123 }]
        })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'No token provided.')
    })

    it('create timeline template - invalid bearer format', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', 'invalid format')
        .send({
          name,
          description: 'desc',
          isActive: true,
          phases: [{ phaseId: phase.id, predecessor, defaultDuration: 123 }]
        })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'No token provided.')
    })

    it('create timeline template - invalid token', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.INVALID_TOKEN}`)
        .send({
          name,
          description: 'desc',
          isActive: true,
          phases: [{ phaseId: phase.id, predecessor, defaultDuration: 123 }]
        })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'Failed to authenticate token.')
    })

    it('create timeline template - expired token', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.EXPIRED_TOKEN}`)
        .send({
          name,
          description: 'desc',
          isActive: true,
          phases: [{ phaseId: phase.id, predecessor, defaultDuration: 123 }]
        })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'Failed to authenticate token.')
    })

    it('create timeline template - forbidden', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
        .send({
          name,
          description: 'desc',
          isActive: true,
          phases: [{ phaseId: phase.id, predecessor, defaultDuration: 123 }]
        })
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('create timeline template - name already used', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name,
          description: 'desc',
          isActive: true,
          phases: [{ phaseId: phase.id, predecessor, defaultDuration: 123 }]
        })
      should.equal(response.status, 409)
      should.equal(response.body.message, `TimelineTemplate with name: ${name} already exist`)
    })

    it('create timeline template - missing name', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          description: 'desc',
          isActive: true,
          phases: [{ phaseId: phase.id, predecessor, defaultDuration: 123 }]
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" is required')
    })

    it('create timeline template - invalid name', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name: ['xx'],
          description: 'desc',
          isActive: true,
          phases: [{ phaseId: phase.id, predecessor, defaultDuration: 123 }]
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" must be a string')
    })

    it('create timeline template - invalid description', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name: 'ghghguue',
          description: ['desc'],
          isActive: true,
          phases: [{ phaseId: phase.id, predecessor, defaultDuration: 123 }]
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"description" must be a string')
    })

    it('create timeline template - invalid phases', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name,
          description: 'desc',
          isActive: true,
          phases: [{ defaultDuration: 123 }]
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"phaseId" is required')
    })

    it('create timeline template - unexpected field', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name: 'flskjdf',
          description: 'desc',
          isActive: true,
          phases: [{ phaseId: phase.id, predecessor, defaultDuration: 123 }],
          other: 'def'
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"other" is not allowed')
    })
  })

  describe('get timeline template API tests', () => {
    it('get timeline template successfully', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.COPILOT_TOKEN}`)
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.id, id)
      should.equal(result.name, name)
      should.equal(result.description, 'desc')
      should.equal(result.isActive, true)
      should.equal(result.phases.length, 1)
      should.equal(result.phases[0].phaseId, phase.id)
      should.equal(result.phases[0].predecessor, predecessor)
      should.equal(result.phases[0].defaultDuration, 123)
    })

    it('get timeline template - forbidden', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('get timeline template - not found', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${notFoundId}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 404)
      should.equal(response.body.message, `TimelineTemplate with id: ${notFoundId} doesn't exist`)
    })

    it('get timeline template - invalid id', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/invalid`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"timelineTemplateId" must be a valid GUID')
    })
  })

  describe('search timeline templates API tests', () => {
    it('search timeline templates successfully 1', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.COPILOT_TOKEN}`)
        .query({ page: 1, perPage: 10, name: name.substring(1).toUpperCase() })
      should.equal(response.status, 200)
      should.equal(response.headers['x-page'], '1')
      should.equal(response.headers['x-per-page'], '10')
      should.equal(response.headers['x-total'], '1')
      should.equal(response.headers['x-total-pages'], '1')
      should.exist(response.headers['link'])

      const result = response.body
      should.equal(result.length, 1)
      should.equal(result[0].id, id)
      should.equal(result[0].name, name)
      should.equal(result[0].description, 'desc')
      should.equal(result[0].isActive, true)
      should.equal(result[0].phases.length, 1)
      should.equal(result[0].phases[0].phaseId, phase.id)
      should.equal(result[0].phases[0].predecessor, predecessor)
      should.equal(result[0].phases[0].defaultDuration, 123)
    })

    it('search timeline templates successfully 2', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.COPILOT_TOKEN}`)
        .query({ name: 'xxjklsdjfihx' })
      should.equal(response.status, 200)
      should.equal(response.headers['x-page'], '1')
      should.equal(response.headers['x-per-page'], '20')
      should.equal(response.headers['x-total'], '0')
      should.equal(response.headers['x-total-pages'], '0')
      should.equal(response.body.length, 0)
    })

    it('search timeline templates - invalid page', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ page: -1 })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"page" must be larger than or equal to 1')
    })

    it('search timeline templates - invalid perPage', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ perPage: 'abc' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"perPage" must be a number')
    })

    it('search timeline templates - unexpected field', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ other: 123 })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"other" is not allowed')
    })
  })

  describe('fully update timeline template API tests', () => {
    it('fully update timeline template successfully', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: `${name}-updated`,
          description: 'desc222',
          isActive: false,
          phases: [{ phaseId: phase.id, predecessor, defaultDuration: 123 }]
        })
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.id, id)
      should.equal(result.name, `${name}-updated`)
      should.equal(result.description, 'desc222')
      should.equal(result.isActive, false)
      should.equal(result.phases.length, 1)
      should.equal(result.phases[0].phaseId, phase.id)
      should.equal(result.phases[0].predecessor, predecessor)
      should.equal(result.phases[0].defaultDuration, 123)
    })

    it('fully update timeline template - name already used', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name: name2,
          description: 'desc',
          isActive: false,
          phases: [{ phaseId: phase.id, predecessor, defaultDuration: 123 }]
        })
      should.equal(response.status, 409)
      should.equal(response.body.message, `TimelineTemplate with name: ${name2} already exist`)
    })

    it('fully update timeline template - forbidden', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.USER_TOKEN}`)
        .send({
          name: 'xlkjfeug',
          description: 'desc',
          isActive: false,
          phases: [{ phaseId: phase.id, predecessor, defaultDuration: 123 }]
        })
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('fully update timeline template - not found', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${notFoundId}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: 'fjgjgjg',
          description: 'desc',
          isActive: false,
          phases: [{ phaseId: phase.id, predecessor, defaultDuration: 123 }]
        })
      should.equal(response.status, 404)
      should.equal(response.body.message, `TimelineTemplate with id: ${notFoundId} doesn't exist`)
    })

    it('fully update timeline template - invalid id', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/invalid`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: 'fjgjgjg',
          description: 'desc',
          isActive: false,
          phases: [{ phaseId: phase.id, predecessor, defaultDuration: 123 }]
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"timelineTemplateId" must be a valid GUID')
    })

    it('fully update timeline template - null name', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: null,
          description: 'desc',
          isActive: false,
          phases: [{ phaseId: phase.id, predecessor, defaultDuration: 123 }]
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" must be a string')
    })

    it('fully update timeline template - invalid name', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: { invalid: 123 },
          description: 'desc',
          isActive: false,
          phases: [{ phaseId: phase.id, predecessor, defaultDuration: 123 }]
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" must be a string')
    })

    it('fully update timeline template - empty name', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: '',
          description: 'desc',
          isActive: false,
          phases: [{ phaseId: phase.id, predecessor, defaultDuration: 123 }]
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" is not allowed to be empty')
    })

    it('fully update timeline template - invalid isActive', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: 'slkdjfhhghg',
          description: 'desc',
          isActive: [],
          phases: [{ phaseId: phase.id, predecessor, defaultDuration: 123 }]
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"isActive" must be a boolean')
    })
  })

  describe('partially update timeline template API tests', () => {
    it('partially update timeline template successfully', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        .send({
          name: `${name}-33`,
          description: 'desc33'
        })
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.id, id)
      should.equal(result.name, `${name}-33`)
      should.equal(result.description, 'desc33')
      should.equal(result.isActive, false)
      should.equal(result.phases.length, 1)
      should.equal(result.phases[0].phaseId, phase.id)
      should.equal(result.phases[0].predecessor, predecessor)
      should.equal(result.phases[0].defaultDuration, 123)
    })

    it('partially update timeline template - name already used', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({ name: name2 })
      should.equal(response.status, 409)
      should.equal(response.body.message, `TimelineTemplate with name: ${name2} already exist`)
    })

    it('partially update timeline template - forbidden', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
        .send({ name: 'testing2' })
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('partially update timeline template - not found', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${notFoundId}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ name: 'testing2' })
      should.equal(response.status, 404)
      should.equal(response.body.message, `TimelineTemplate with id: ${notFoundId} doesn't exist`)
    })

    it('partially update timeline template - invalid id', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/invalid`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ name: 'testing2' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"timelineTemplateId" must be a valid GUID')
    })

    it('partially update timeline template - null name', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ name: null })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" must be a string')
    })

    it('partially update timeline template - invalid name', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ name: { invalid: 123 } })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" must be a string')
    })

    it('partially update timeline template - empty name', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ name: '' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" is not allowed to be empty')
    })

    it('partially update timeline template - invalid phases', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ phases: ['abc'] })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"0" must be an object')
    })
  })

  describe('remove timeline template API tests', () => {
    it('remove timeline template - forbidden', async () => {
      const response = await chai.request(app)
        .delete(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.USER_TOKEN}`)
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('remove timeline template successfully 1', async () => {
      const response = await chai.request(app)
        .delete(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 200)
      should.equal(response.body.id, id)
    })

    it('remove timeline template successfully 2', async () => {
      const response = await chai.request(app)
        .delete(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
      should.equal(response.status, 200)
      should.equal(response.body.id, id2)
    })

    it('remove timeline template - not found', async () => {
      const response = await chai.request(app)
        .delete(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
      should.equal(response.status, 404)
      should.equal(response.body.message, `TimelineTemplate with id: ${id} doesn't exist`)
    })

    it('remove timeline template - invalid id', async () => {
      const response = await chai.request(app)
        .delete(`${basePath}/invalid`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"timelineTemplateId" must be a valid GUID')
    })
  })
})
