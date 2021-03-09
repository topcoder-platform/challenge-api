/*
 * E2E tests of audit log API
 */

require('../../app-bootstrap')
const _ = require('lodash')
const config = require('config')
const uuid = require('uuid/v4')
const chai = require('chai')
const chaiHttp = require('chai-http')
const app = require('../../app')
const testHelper = require('../testHelper')

const should = chai.should()
chai.use(chaiHttp)

const basePath = `/${config.API_VERSION}/challenge-audit-logs`

describe('audit log API E2E tests', () => {
  // generated data
  let data
  const notFoundId = uuid()

  before(async () => {
    await testHelper.createData()
    data = testHelper.getData()
  })

  after(async () => {
    await testHelper.clearData()
  })

  describe('search audit logs API tests', () => {
    it('search audit logs successfully 1', async () => {
      // update challenge so that there are some audit logs
      const updateChallengeResponse = await chai.request(app)
        .patch(`/${config.API_VERSION}/challenges/${data.challenge.id}`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        .send({
          tags: ['tag-abc'],
          description: 'desc-abc'
        })
      should.equal(updateChallengeResponse.status, 200)

      const dateStart = new Date(new Date().getTime() - 1000 * 60 * 60 * 30)
      const dateEndStr = '2022-01-02'
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.M2M_READ_ACCESS_TOKEN}`)
        .query({
          page: 1,
          perPage: 10,
          challengeId: data.challenge.id,
          createdDateStart: dateStart,
          createdDateEnd: dateEndStr
        })
      should.equal(response.status, 200)
      should.equal(response.headers['x-page'], '1')
      should.equal(response.headers['x-per-page'], '10')
      should.equal(response.headers['x-total'], '2')
      should.equal(response.headers['x-total-pages'], '1')
      should.exist(response.headers['link'])

      should.equal(response.body.length, 2)
      let log = _.find(response.body, (item) => item.fieldName === 'tags')
      should.exist(log)
      should.equal(log.oldValue, '["tag1"]')
      should.equal(log.newValue, '["tag-abc"]')
      should.equal(log.challengeId, data.challenge.id)
      should.exist(log.createdBy)
      should.exist(log.created)
      should.equal(log.created <= dateEndStr, true)
      should.equal(log.created >= dateStart.toISOString(), true)
      should.exist(log.id)
      log = _.find(response.body, (item) => item.fieldName === 'description')
      should.exist(log)
      should.equal(log.oldValue, '"desc"')
      should.equal(log.newValue, '"desc-abc"')
      should.equal(log.challengeId, data.challenge.id)
      should.exist(log.createdBy)
      should.exist(log.created)
      should.exist(log.id)
    })

    it('search audit logs successfully 2', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ challengeId: notFoundId })
      should.equal(response.status, 200)
      should.equal(response.headers['x-page'], '1')
      should.equal(response.headers['x-per-page'], '20')
      should.equal(response.headers['x-total'], '0')
      should.equal(response.headers['x-total-pages'], '0')
      should.equal(response.body.length, 0)
    })

    it('throw error if challengeId or id not present', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ fieldName: 'field' })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'You should pass at least one of challengeId or id in params')
    })

    it('createdDateStart should be less than or equal to createdDateEnd', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({
          challengeId: data.challenge.id,
          createdDateStart: '2021-12-12',
          createdDateEnd: '2021-12-11'
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, 'createdDateEnd param should be greater than or equal to createdDateStart')
    })

    it('search audit logs - invalid page', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ page: -1 })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"page" must be larger than or equal to 1')
    })

    it('search audit logs - invalid perPage', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ perPage: 'abc' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"perPage" must be a number')
    })

    it('search audit logs - invalid start date', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ createdDateStart: 'abc' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"createdDateStart" must be a number of milliseconds or valid date string')
    })

    it('search audit logs - invalid end date', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ createdDateEnd: 'abc' })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"createdDateEnd" must be a number of milliseconds or valid date string')
    })

    it('search audit logs - invalid oldValue', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ oldValue: ['old1', 'old2'] })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"oldValue" must be a string')
    })

    it('search audit logs - invalid newValue', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ newValue: ['new1', 'new2'] })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"newValue" must be a string')
    })

    it('search audit logs - unexpected field', async () => {
      const response = await chai.request(app)
        .get(basePath)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .query({ other: 123 })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"other" is not allowed')
    })
  })
})
