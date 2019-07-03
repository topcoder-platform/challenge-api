/*
 * E2E tests of challenge setting API
 */

// During the test the env variable is set to test
process.env.NODE_ENV = 'test'

require('../../app-bootstrap')
const config = require('config')
const uuid = require('uuid/v4')
const chai = require('chai')
const chaiHttp = require('chai-http')
const app = require('../../app')

const should = chai.should()
chai.use(chaiHttp)

const basePath = '/challengeSettings'

describe('challenge setting API E2E tests', () => {
  // created entity ids
  let id
  let id2
  // random names
  const name = `test1${new Date().getTime()}`
  const name2 = `test2${new Date().getTime()}`
  const notFoundId = uuid()

  describe('create challenge setting API tests', () => {
    it('create challenge setting successfully 1', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        .send({
          name
        })
      should.equal(response.status, 201)
      const result = response.body
      should.equal(result.name, name)
      should.exist(result.id)
      id = result.id
    })

    it('create challenge setting successfully 2', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name: name2
        })
      should.equal(response.status, 201)
      const result = response.body
      should.equal(result.name, name2)
      should.exist(result.id)
      id2 = result.id
    })

    it('create challenge setting - missing token', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .send({
          name: 'ueueue7878'
        })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'No token provided.')
    })

    it('create challenge setting - invalid bearer format', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', 'invalid format')
        .send({
          name: 'ueueue7878'
        })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'No token provided.')
    })

    it('create challenge setting - invalid token', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.INVALID_TOKEN}`)
        .send({
          name: 'ueueue7878'
        })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'Failed to authenticate token.')
    })

    it('create challenge setting - expired token', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.EXPIRED_TOKEN}`)
        .send({
          name: 'ueueue7878'
        })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'Failed to authenticate token.')
    })

    it('create challenge setting - name already used', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name
        })
      should.equal(response.status, 409)
      should.equal(response.body.message, `ChallengeSetting with name: ${name} already exist`)
    })

    it('create challenge setting - forbidden', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
        .send({
          name: 'flskjdf'
        })
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('create challenge setting - missing name', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" is required')
    })

    it('create challenge setting - invalid name', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name: ['xx']
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" must be a string')
    })

    it('create challenge setting - unexpected field', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name: 'flskjdf',
          other: 'def'
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"other" is not allowed')
    })
  })

  describe('get challenge setting API tests', () => {
    it('get challenge setting successfully', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.COPILOT_TOKEN}`)
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.id, id2)
      should.equal(result.name, name2)
    })

    it('get challenge setting - forbidden', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('get challenge setting - not found', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${notFoundId}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 404)
      should.equal(response.body.message, `ChallengeSetting with id: ${notFoundId} doesn't exist`)
    })

    it('get challenge setting - invalid id', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/invalid`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"id" must be a valid GUID')
    })
  })

  describe('search challenge settings API tests', () => {
    it('search challenge settings successfully 1', async () => {
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
    })

    it('search challenge settings successfully 2', async () => {
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

    it('search challenge settings - invalid page', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ page: -1 })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"page" must be larger than or equal to 1')
    })

    it('search challenge settings - invalid perPage', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ perPage: 'abc' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"perPage" must be a number')
    })

    it('search challenge settings - unexpected field', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ other: 123 })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"other" is not allowed')
    })
  })

  describe('fully update challenge setting API tests', () => {
    it('fully update challenge setting successfully', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: `${name2}-updated`
        })
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.id, id2)
      should.equal(result.name, `${name2}-updated`)
    })

    it('fully update challenge setting - name already used', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name
        })
      should.equal(response.status, 409)
      should.equal(response.body.message, `ChallengeSetting with name: ${name} already exist`)
    })

    it('fully update challenge setting - forbidden', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.USER_TOKEN}`)
        .send({
          name: 'xlkjfeug'
        })
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('fully update challenge setting - not found', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${notFoundId}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: 'fjgjgjg'
        })
      should.equal(response.status, 404)
      should.equal(response.body.message, `ChallengeSetting with id: ${notFoundId} doesn't exist`)
    })

    it('fully update challenge setting - invalid id', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/invalid`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: 'fjgjgjg'
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"id" must be a valid GUID')
    })

    it('fully update challenge setting - null name', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: null
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" must be a string')
    })

    it('fully update challenge setting - invalid name', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: { invalid: 123 }
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" must be a string')
    })

    it('fully update challenge setting - empty name', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: ''
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" is not allowed to be empty')
    })
  })
})
