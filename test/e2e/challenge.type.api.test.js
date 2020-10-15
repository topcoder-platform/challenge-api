/*
 * E2E tests of challenge type API
 */

require('../../app-bootstrap')
const config = require('config')
const uuid = require('uuid/v4')
const chai = require('chai')
const chaiHttp = require('chai-http')
const app = require('../../app')

const should = chai.should()
chai.use(chaiHttp)

const basePath = `/${config.API_VERSION}/challenge-types`

describe('challenge type API E2E tests', () => {
  // created entity ids
  let id
  let id2
  // random values
  const name = `test1${new Date().getTime()}`
  const name2 = `test2${new Date().getTime()}`
  const abbreviation = `abb1${new Date().getTime()}`
  const abbreviation2 = `abb2${new Date().getTime()}`
  const legacyId = new Date().getTime()
  const legacyId2 = legacyId + 123
  const notFoundId = uuid()

  describe('create challenge type API tests', () => {
    it('create challenge type successfully 1', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        .send({
          name,
          description: 'desc',
          isActive: true,
          abbreviation,
          legacyId
        })
      should.equal(response.status, 201)
      const result = response.body
      should.equal(result.name, name)
      should.equal(result.description, 'desc')
      should.equal(result.isActive, true)
      should.equal(result.abbreviation, abbreviation)
      should.equal(result.legacyId, legacyId)
      should.exist(result.id)
      id = result.id
    })

    it('create challenge type successfully 2', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name: name2,
          description: 'desc2',
          isActive: false,
          abbreviation: abbreviation2,
          legacyId: legacyId2
        })
      should.equal(response.status, 201)
      const result = response.body
      should.equal(result.name, name2)
      should.equal(result.description, 'desc2')
      should.equal(result.isActive, false)
      should.equal(result.abbreviation, abbreviation2)
      should.equal(result.legacyId, legacyId2)
      should.exist(result.id)
      id2 = result.id
    })

    it('create challenge type - missing token', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .send({
          name: 'ueueue7878',
          description: 'desc',
          isActive: true,
          abbreviation: 'abb'
        })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'No token provided.')
    })

    it('create challenge type - invalid bearer format', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', 'invalid format')
        .send({
          name: 'ueueue7878',
          description: 'desc',
          isActive: true,
          abbreviation: 'abb'
        })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'No token provided.')
    })

    it('create challenge type - invalid token', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.INVALID_TOKEN}`)
        .send({
          name: 'ueueue7878',
          description: 'desc',
          isActive: true,
          abbreviation: 'abb'
        })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'Failed to authenticate token.')
    })

    it('create challenge type - expired token', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.EXPIRED_TOKEN}`)
        .send({
          name: 'ueueue7878',
          description: 'desc',
          isActive: true,
          abbreviation: 'abb'
        })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'Failed to authenticate token.')
    })

    it('create challenge type - name already used', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name,
          description: 'desc',
          isActive: false,
          abbreviation: `${abbreviation}-454545`
        })
      should.equal(response.status, 409)
      should.equal(response.body.message, `ChallengeType with name: ${name} already exist`)
    })

    it('create challenge type - abbreviation already used', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name: `${name}-xyz`,
          description: 'desc',
          isActive: false,
          abbreviation
        })
      should.equal(response.status, 409)
      should.equal(response.body.message, `ChallengeType with abbreviation: ${abbreviation} already exist`)
    })

    it('create challenge type - legacyId already used', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name: `${name}-xyz`,
          description: 'desc',
          isActive: false,
          abbreviation: `${abbreviation}-123123`,
          legacyId: legacyId2
        })
      should.equal(response.status, 409)
      should.equal(response.body.message, `ChallengeType with legacyId: ${legacyId2} already exist`)
    })

    it('create challenge type - forbidden', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
        .send({
          name: 'flskjdf',
          description: 'desc',
          isActive: false,
          abbreviation: 'abb'
        })
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('create challenge type - missing name', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          description: 'desc',
          isActive: false,
          abbreviation: 'abb'
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" is required')
    })

    it('create challenge type - missing abbreviation', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name: 'nnn',
          description: 'desc',
          isActive: false
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"abbreviation" is required')
    })

    it('create challenge type - invalid legacyId', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name: 'nnnnnxxx',
          description: 'desc',
          isActive: false,
          abbreviation: 'abb',
          legacyId: 'abc'
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"legacyId" must be a number')
    })

    it('create challenge type - invalid name', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name: ['xx'],
          description: 'desc',
          isActive: false,
          abbreviation: 'abb'
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" must be a string')
    })

    it('create challenge type - invalid isActive', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name: 'fjsioijdf',
          description: 'desc',
          isActive: 'abc',
          abbreviation: 'abb'
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"isActive" must be a boolean')
    })

    it('create challenge type - unexpected field', async () => {
      const response = await chai.request(app)
        .post(basePath)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name: 'flskjdf',
          description: 'desc',
          isActive: false,
          abbreviation: 'abb',
          other: 'def'
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"other" is not allowed')
    })
  })

  describe('get challenge type API tests', () => {
    it('get challenge type successfully', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.COPILOT_TOKEN}`)
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.id, id2)
      should.equal(result.name, name2)
      should.equal(result.description, 'desc2')
      should.equal(result.isActive, false)
      should.equal(result.abbreviation, abbreviation2)
      should.equal(result.legacyId, legacyId2)
    })

    it('get challenge type - not found', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/${notFoundId}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 404)
      should.equal(response.body.message, `ChallengeType with id: ${notFoundId} doesn't exist`)
    })

    it('get challenge type - invalid id', async () => {
      const response = await chai.request(app)
        .get(`${basePath}/invalid`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"id" must be a valid GUID')
    })
  })

  describe('search challenge types API tests', () => {
    it('search challenge types successfully 1', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.COPILOT_TOKEN}`)
        .query({
          page: 1,
          perPage: 10,
          name: name2.substring(1).toUpperCase(),
          description: 'desc',
          isActive: false,
          abbreviation: abbreviation2,
          legacyId: legacyId2
        })
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
      should.equal(result[0].isActive, false)
      should.equal(result[0].abbreviation, abbreviation2)
      should.equal(result[0].legacyId, legacyId2)
    })

    it('search challenge types successfully 2', async () => {
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

    it('search challenge types - invalid page', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ page: -1 })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"page" must be larger than or equal to 1')
    })

    it('search challenge types - invalid perPage', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ perPage: 'abc' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"perPage" must be a number')
    })

    it('search challenge types - unexpected field', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ other: 123 })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"other" is not allowed')
    })
  })

  describe('fully update challenge type API tests', () => {
    it('fully update challenge type successfully', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: `${name2}-updated`,
          description: 'desc222',
          isActive: true,
          abbreviation: `${abbreviation2}-updated`,
          legacyId: legacyId2
        })
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.id, id2)
      should.equal(result.name, `${name2}-updated`)
      should.equal(result.description, 'desc222')
      should.equal(result.isActive, true)
      should.equal(result.abbreviation, `${abbreviation2}-updated`)
      should.equal(result.legacyId, legacyId2)
    })

    it('fully update challenge type - name already used', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name,
          description: 'desc',
          isActive: false,
          abbreviation: `${abbreviation}-aaa123`
        })
      should.equal(response.status, 409)
      should.equal(response.body.message, `ChallengeType with name: ${name} already exist`)
    })

    it('fully update challenge type - abbreviation already used', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name: name2,
          description: 'desc',
          isActive: false,
          abbreviation
        })
      should.equal(response.status, 409)
      should.equal(response.body.message, `ChallengeType with abbreviation: ${abbreviation} already exist`)
    })

    it('fully update challenge type - legacyId already used', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({
          name: name2,
          description: 'desc',
          isActive: false,
          abbreviation: abbreviation2,
          legacyId
        })
      should.equal(response.status, 409)
      should.equal(response.body.message, `ChallengeType with legacyId: ${legacyId} already exist`)
    })

    it('fully update challenge type - forbidden', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.USER_TOKEN}`)
        .send({
          name: 'xlkjfeug',
          description: 'desc',
          isActive: false,
          abbreviation: 'ab'
        })
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('fully update challenge type - not found', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${notFoundId}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: 'fjgjgjg',
          description: 'desc',
          isActive: false,
          abbreviation: 'ab'
        })
      should.equal(response.status, 404)
      should.equal(response.body.message, `ChallengeType with id: ${notFoundId} doesn't exist`)
    })

    it('fully update challenge type - invalid id', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/invalid`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: 'fjgjgjg',
          description: 'desc',
          isActive: false,
          abbreviation: 'ab'
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"id" must be a valid GUID')
    })

    it('fully update challenge type - null name', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: null,
          description: 'desc',
          isActive: false,
          abbreviation: 'ab'
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" must be a string')
    })

    it('fully update challenge type - invalid name', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: { invalid: 123 },
          description: 'desc',
          isActive: false,
          abbreviation: 'ab'
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" must be a string')
    })

    it('fully update challenge type - empty name', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: '',
          description: 'desc',
          isActive: false,
          abbreviation: 'ab'
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" is not allowed to be empty')
    })

    it('fully update challenge type - invalid isActive', async () => {
      const response = await chai.request(app)
        .put(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: 'slkdjfhhghg',
          description: 'desc',
          isActive: [],
          abbreviation: 'ab'
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"isActive" must be a boolean')
    })
  })

  describe('partially update challenge type API tests', () => {
    it('partially update challenge type successfully', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        .send({
          name: `${name2}-33`,
          description: 'desc33',
          abbreviation: `${abbreviation2}-33`
        })
      should.equal(response.status, 200)
      const result = response.body
      should.equal(result.id, id2)
      should.equal(result.name, `${name2}-33`)
      should.equal(result.description, 'desc33')
      should.equal(result.isActive, true)
      should.equal(result.abbreviation, `${abbreviation2}-33`)
      should.equal(result.legacyId, legacyId2)
    })

    it('partially update challenge type - name already used', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({ name })
      should.equal(response.status, 409)
      should.equal(response.body.message, `ChallengeType with name: ${name} already exist`)
    })

    it('partially update challenge type - abbreviation already used', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({ abbreviation })
      should.equal(response.status, 409)
      should.equal(response.body.message, `ChallengeType with abbreviation: ${abbreviation} already exist`)
    })

    it('partially update challenge type - legacyId already used', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id2}`)
        .set('Authorization', `Bearer ${config.M2M_UPDATE_ACCESS_TOKEN}`)
        .send({ legacyId })
      should.equal(response.status, 409)
      should.equal(response.body.message, `ChallengeType with legacyId: ${legacyId} already exist`)
    })

    it('partially update challenge type - forbidden', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
        .send({ name: 'testing2' })
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })

    it('partially update challenge type - not found', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${notFoundId}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ name: 'testing2' })
      should.equal(response.status, 404)
      should.equal(response.body.message, `ChallengeType with id: ${notFoundId} doesn't exist`)
    })

    it('partially update challenge type - invalid id', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/invalid`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ name: 'testing2' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"id" must be a valid GUID')
    })

    it('partially update challenge type - null name', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ name: null })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" must be a string')
    })

    it('partially update challenge type - invalid name', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ name: { invalid: 123 } })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" must be a string')
    })

    it('partially update challenge type - empty name', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ name: '' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" is not allowed to be empty')
    })

    it('partially update challenge type - invalid description', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ description: { invalid: 123 } })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"description" must be a string')
    })

    it('partially update challenge type - invalid abbreviation', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ abbreviation: { invalid: 123 } })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"abbreviation" must be a string')
    })

    it('partially update challenge type - invalid legacyId', async () => {
      const response = await chai.request(app)
        .patch(`${basePath}/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({ legacyId: { invalid: 123 } })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"legacyId" must be a number')
    })
  })
})
