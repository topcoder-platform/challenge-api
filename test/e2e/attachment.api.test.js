/*
 * E2E tests of attachment API
 */

require('../../app-bootstrap')
const fs = require('fs')
const path = require('path')
const config = require('config')
const uuid = require('uuid/v4')
const chai = require('chai')
const chaiHttp = require('chai-http')
const app = require('../../app')
const testHelper = require('../testHelper')

const should = chai.should()
chai.use(chaiHttp)

const attachmentContent = fs.readFileSync(path.join(__dirname, '../attachment.txt'))

const baseUrl = `/${config.API_VERSION}/challenges`

describe('attachment API E2E tests', () => {
  // created attachment id
  let id
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

  describe('create attachment API tests', () => {
    it('create attachment successfully', async () => {
      const response = await chai.request(app)
        .post(`${baseUrl}/${data.challenge.id}/attachments`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: 'attachment.txt',
          url: 'http://s3.amazonaws.com/bucket/key1/key2',
          fileSize: attachmentContent.length,
          description: 'desc'
        })
      should.equal(response.status, 201)
      const result = response.body
      should.exist(result.id)
      id = result.id
      should.equal(result.fileSize, attachmentContent.length)
      should.equal(result.name, 'attachment.txt')
      should.equal(result.challengeId, data.challenge.id)
    })

    it('create attachment - missing token', async () => {
      const response = await chai.request(app)
        .post(`${baseUrl}/${data.challenge.id}/attachments`)
        .send({
          name: 'attachment.txt',
          url: 'http://s3.amazonaws.com/bucket/key1/key2',
          fileSize: attachmentContent.length,
          description: 'desc'
        })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'No token provided.')
    })

    it('create attachment - invalid bearer format', async () => {
      const response = await chai.request(app)
        .post(`${baseUrl}/${data.challenge.id}/attachments`)
        .set('Authorization', 'invalid format')
        .send({
          name: 'attachment.txt',
          url: 'http://s3.amazonaws.com/bucket/key1/key2',
          fileSize: attachmentContent.length,
          description: 'desc'
        })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'No token provided.')
    })

    it('create attachment - invalid token', async () => {
      const response = await chai.request(app)
        .post(`${baseUrl}/${data.challenge.id}/attachments`)
        .set('Authorization', `Bearer ${config.INVALID_TOKEN}`)
        .send({
          name: 'attachment.txt',
          url: 'http://s3.amazonaws.com/bucket/key1/key2',
          fileSize: attachmentContent.length,
          description: 'desc'
        })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'Failed to authenticate token.')
    })

    it('create attachment - expired token', async () => {
      const response = await chai.request(app)
        .post(`${baseUrl}/${data.challenge.id}/attachments`)
        .set('Authorization', `Bearer ${config.EXPIRED_TOKEN}`)
        .send({
          name: 'attachment.txt',
          url: 'http://s3.amazonaws.com/bucket/key1/key2',
          fileSize: attachmentContent.length,
          description: 'desc'
        })
      should.equal(response.status, 401)
      should.equal(response.body.message, 'Failed to authenticate token.')
    })

    it('create attachment - missing attachment name', async () => {
      const response = await chai.request(app)
        .post(`${baseUrl}/${data.challenge.id}/attachments`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          url: 'http://s3.amazonaws.com/bucket/key1/key2',
          fileSize: attachmentContent.length,
          description: 'desc'
        })
      should.equal(response.status, 400)
      should.equal(response.body.message, '"name" is required')
    })

    it('create attachment - challenge not found', async () => {
      const response = await chai.request(app)
        .post(`${baseUrl}/${notFoundId}/attachments`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .send({
          name: 'attachment.txt',
          url: 'http://s3.amazonaws.com/bucket/key1/key2',
          fileSize: attachmentContent.length,
          description: 'desc'
        })
      should.equal(response.status, 404)
      should.equal(response.body.message, `Challenge with id: ${notFoundId} doesn't exist`)
    })

    it('create attachment - forbidden', async () => {
      const response = await chai.request(app)
        .post(`${baseUrl}/${data.challenge.id}/attachments`)
        .set('Authorization', `Bearer ${config.USER_TOKEN}`)
        .send({
          name: 'attachment.txt',
          url: 'http://s3.amazonaws.com/bucket/key1/key2',
          fileSize: attachmentContent.length,
          description: 'desc'
        })
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })
  })

  describe('download attachment API tests', () => {
    it('download attachment successfully', async () => {
      const response = await chai.request(app)
        .get(`${baseUrl}/${data.challenge.id}/attachments/${id}/download`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
      should.equal(response.status, 200)
    })

    it('download attachment - attachment not found', async () => {
      const response = await chai.request(app)
        .get(`${baseUrl}/${data.challenge.id}/attachments/${notFoundId}/download`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
      should.equal(response.status, 404)
      should.equal(response.body.message.indexOf('not found') >= 0, true)
    })
  })

  describe('get attachment API tests', () => {
    it('get attachment successfully', async () => {
      const response = await chai.request(app)
        .get(`${baseUrl}/${data.challenge.id}/attachments/${id}`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
      should.equal(response.status, 200)
      should.equal(response.body.name, 'attachment.txt')
    })

    it('get attachment - attachment not found', async () => {
      const response = await chai.request(app)
        .get(`${baseUrl}/${data.challenge.id}/attachments/${notFoundId}`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
      should.equal(response.status, 404)
      should.equal(response.body.message.indexOf('not found') >= 0, true)
    })

    it('get attachment - challenge id mismatched', async () => {
      const response = await chai.request(app)
        .get(`${baseUrl}/${notFoundId}/attachments/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 404)
      should.equal(response.body.message.indexOf('doesn\'t exist') >= 0, true)
    })

    it('get attachment - invalid id', async () => {
      const response = await chai.request(app)
        .get(`${baseUrl}/${notFoundId}/attachments/invalid`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"attachmentId" must be a valid GUID')
    })
  })

  describe('fully update attachment API tests', () => {
    it('fully update attachment successfully', async () => {
      const response = await chai.request(app)
        .put(`${baseUrl}/${data.challenge.id}/attachments/${id}`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        .send({
          name: 'attachment.txt',
          url: 'http://s3.amazonaws.com/bucket/key1/key2',
          fileSize: 13,
          description: 'desc2'
        })
      should.equal(response.status, 200)
      should.equal(response.body.fileSize, 13)
      should.equal(response.body.description, 'desc2')
    })
  })

  describe('partially update attachment API tests', () => {
    it('partially update attachment successfully', async () => {
      const response = await chai.request(app)
        .patch(`${baseUrl}/${data.challenge.id}/attachments/${id}`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
        .send({
          fileSize: 15,
          description: 'desc3'
        })
      should.equal(response.status, 200)
      should.equal(response.body.fileSize, 15)
      should.equal(response.body.description, 'desc3')
    })
  })

  describe('delete attachment API tests', () => {
    it('delete attachment successfully', async () => {
      const response = await chai.request(app)
        .delete(`${baseUrl}/${data.challenge.id}/attachments/${id}`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
      should.equal(response.status, 200)
    })

    it('delete attachment - attachment not found', async () => {
      const response = await chai.request(app)
        .delete(`${baseUrl}/${data.challenge.id}/attachments/${notFoundId}`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
      should.equal(response.status, 404)
      should.equal(response.body.message.indexOf('not found') >= 0, true)
    })

    it('delete attachment - invalid id', async () => {
      const response = await chai.request(app)
        .delete(`${baseUrl}/${notFoundId}/attachments/invalid`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"attachmentId" must be a valid GUID')
    })
  })
})
