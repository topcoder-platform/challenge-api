/*
 * E2E tests of phase API
 */

require('../../app-bootstrap')
const config = require('config')
const uuid = require('uuid/v4')
const chai = require('chai')
const chaiHttp = require('chai-http')
const app = require('../../app')

const should = chai.should()
chai.use(chaiHttp)

const basePath = `/${config.API_VERSION}/challenge-phases`

describe('phase API E2E tests', () => {
  // created entity ids
  let id
  let id2
  // random names
  const name = `test1${new Date().getTime()}`
  const name2 = `test2${new Date().getTime()}`
  const notFoundId = uuid()

  describe('create phase API tests', () => {
    it('create phase successfully 1', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        .send({
          name,
          description: 'desc',
          isOpen: true,
          duration: 123
        })
      should.equal(response.status, 201)
      const result = response.body
      should.equal(result.name, name)
      should.equal(result.description, 'desc')
      should.equal(result.isOpen, true)
      should.equal(result.duration, 123)
      should.exist(result.id)
      id = result.id
    })

    it('create phase successfully 2', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name: name2,
          description: 'desc2',
          isOpen: false,
          duration: 456
        })
      should.equal(response.status, 201)
      const result = response.body
      should.equal(result.name, name2)
      should.equal(result.description, 'desc2')
      should.equal(result.isOpen, false)
      should.equal(result.duration, 456)
      should.exist(result.id)
      id2 = result.id
    })

    it('create phase - missing token', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .send({
          name: 'ueueue7878',
          description: 'desc',
          isOpen: true,
          duration: 123
        })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'No token provided.')
    })

    it('create phase - invalid bearer format', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', 'invalid format')
        .send({
          name: 'ueueue7878',
          description: 'desc',
          isOpen: true,
          duration: 123
        })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'No token provided.')
    })

    it('create phase - invalid token', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.INVALID_TOKEN}`)
        .send({
          name: 'ueueue7878',
          description: 'desc',
          isOpen: true,
          duration: 123
        })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'Failed to authenticate token.')
    })

    it('create phase - expired token', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.EXPIRED_TOKEN}`)
        .send({
          name: 'ueueue7878',
          description: 'desc',
          isOpen: true,
          duration: 123
        })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'Failed to authenticate token.')
    })

    it('create phase - name already used', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name,
          description: 'desc',
          isOpen: false,
          duration: 456
        })
      should.equal(response.status, 409)
      should.equal(response.body.message, `Phase with name: ${name} already exist`)
    })

    it('create phase - forbidden', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
        .send({
          name: 'flskjdf',
          description: 'desc',
          isOpen: false,
          duration: 456
        })
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('create phase - missing name', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          description: 'desc',
          isOpen: false,
          duration: 456
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" is required')
    })

    it('create phase - invalid name', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name: ['xx'],
          description: 'desc',
          isOpen: false,
          duration: 456
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" must be a string')
    })

    it('create phase - null description', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name: 'fijgijfgfg',
          description: null,
          isOpen: false,
          duration: 456
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"description" must be a string')
    })

    it('create phase - unexpected field', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name: 'flskjdf',
          description: 'desc',
          isOpen: false,
          duration: 456,
          other: 'def'
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"other" is not allowed')
    })
  })

  describe('get phase API tests', () => {
    it('get phase successfully', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.COPILOT_TOKEN}`)
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.id, id2)
      should.equal(result.name, name2)
      should.equal(result.description, 'desc2')
      should.equal(result.isOpen, false)
      should.equal(result.duration, 456)
    })

    it('get phase - forbidden', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('get phase - not found', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${notFoundId}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 404)
      should.equal(response.body.message, `Phase with id: ${notFoundId} doesn't exist`)
    })

    it('get phase - invalid id', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/invalid`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"phaseId" must be a valid GUID')
    })
  })

  describe('search phases API tests', () => {
    it('search phases successfully 1', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.COPILOT_TOKEN}`)
        .query({ page: 1, perPage: 10, name: name2.substring(1).toUpperCase() })
      should.equal(response.status, 200)
      should.equal(response.headers['x-page'], '1')
      should.equal(response.headers['x-per-page'], '10')
      should.equal(response.headers['x-total'], '1')
      should.equal(response.headers['x-total-pages'], '1')
      should.exist(response.headers['link'])

      const result = response.body
      should.equal(result.length, 1)
      should.equal(result[0].id, id2)
      should.equal(result[0].name, name2)
      should.equal(result[0].description, 'desc2')
      should.equal(result[0].isOpen, false)
      should.equal(result[0].duration, 456)
    })

    it('search phases successfully 2', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.COPILOT_TOKEN}`)
        .query({ name: 'xxjklsdjfihx' })
      should.equal(response.status, 200)
      should.equal(response.headers['x-page'], '1')
      should.equal(response.headers['x-per-page'], '100')
      should.equal(response.headers['x-total'], '0')
      should.equal(response.headers['x-total-pages'], '0')
      should.equal(response.body.length, 0)
    })

    it('search phases - invalid page', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ page: -1 })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"page" must be larger than or equal to 1')
    })

    it('search phases - invalid perPage', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ perPage: 'abc' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"perPage" must be a number')
    })

    it('search phases - unexpected field', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ other: 123 })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"other" is not allowed')
    })
  })

  describe('fully update phase API tests', () => {
    it('fully update phase successfully', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: `${name2}-updated`,
          description: 'desc222',
          isOpen: true,
          duration: 789
        })
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.id, id2)
      should.equal(result.name, `${name2}-updated`)
      should.equal(result.description, 'desc222')
      should.equal(result.isOpen, true)
      should.equal(result.duration, 789)
    })

    it('fully update phase - name already used', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name,
          description: 'desc',
          isOpen: false,
          duration: 456
        })
      should.equal(response.status, 409)
      should.equal(response.body.message, `Phase with name: ${name} already exist`)
    })

    it('fully update phase - forbidden', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.USER_TOKEN}`)
        .send({
          name: 'xlkjfeug',
          description: 'desc',
          isOpen: false,
          duration: 456
        })
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('fully update phase - not found', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${notFoundId}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: 'fjgjgjg',
          description: 'desc',
          isOpen: false,
          duration: 456
        })
      should.equal(response.status, 404)
      should.equal(response.body.message, `Phase with id: ${notFoundId} doesn't exist`)
    })

    it('fully update phase - invalid id', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/invalid`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: 'fjgjgjg',
          description: 'desc',
          isOpen: false,
          duration: 456
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"phaseId" must be a valid GUID')
    })

    it('fully update phase - null name', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: null,
          description: 'desc',
          isOpen: false,
          duration: 456
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" must be a string')
    })

    it('fully update phase - invalid name', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: { invalid: 123 },
          description: 'desc',
          isOpen: false,
          duration: 456
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" must be a string')
    })

    it('fully update phase - empty name', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: '',
          description: 'desc',
          isOpen: false,
          duration: 456
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" is not allowed to be empty')
    })

    it('fully update phase - invalid isOpen', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: 'slkdjfhhghg',
          description: 'desc',
          isOpen: [],
          duration: 456
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"isOpen" must be a boolean')
    })
  })

  describe('partially update phase API tests', () => {
    it('partially update phase successfully', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        .send({
          name: `${name2}-33`,
          description: 'desc33',
          duration: 111
        })
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.id, id2)
      should.equal(result.name, `${name2}-33`)
      should.equal(result.description, 'desc33')
      should.equal(result.isOpen, true)
      should.equal(result.duration, 111)
    })

    it('partially update phase - name already used', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({ name })
      should.equal(response.status, 409)
      should.equal(response.body.message, `Phase with name: ${name} already exist`)
    })

    it('partially update phase - forbidden', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
        .send({ name: 'testing2' })
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('partially update phase - not found', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${notFoundId}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ name: 'testing2' })
      should.equal(response.status, 404)
      should.equal(response.body.message, `Phase with id: ${notFoundId} doesn't exist`)
    })

    it('partially update phase - invalid id', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/invalid`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ name: 'testing2' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"phaseId" must be a valid GUID')
    })

    it('partially update phase - null name', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ name: null })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" must be a string')
    })

    it('partially update phase - invalid name', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ name: { invalid: 123 } })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" must be a string')
    })

    it('partially update phase - empty name', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ name: '' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" is not allowed to be empty')
    })

    it('partially update phase - invalid duration', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ duration: 0 })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"duration" must be a positive number')
    })
  })

  describe('remove phase API tests', () => {
    it('remove phase - forbidden', async () => {
      const response = await chai.request(app)
        .delete(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.USER_TOKEN}`)
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('remove phase successfully 1', async () => {
      const response = await chai.request(app)
        .delete(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 200)
      should.equal(response.body.id, id2)
    })

    it('remove phase successfully 2', async () => {
      const response = await chai.request(app)
        .delete(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
      should.equal(response.status, 200)
      should.equal(response.body.id, id)
    })

    it('remove phase - not found', async () => {
      const response = await chai.request(app)
        .delete(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
      should.equal(response.status, 404)
      should.equal(response.body.message, `Phase with id: ${id} doesn't exist`)
    })

    it('remove phase - invalid id', async () => {
      const response = await chai.request(app)
        .delete(`${basePath}/invalid`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"phaseId" must be a valid GUID')
    })
  })
})
