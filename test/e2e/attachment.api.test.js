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

  describe('upload attachment API tests', () => {
    it('upload attachment successfully', async () => {
      const response = await chai.request(app)
        .post(`${baseUrl}/${data.challenge.id}/attachments`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .attach('attachment', attachmentContent, 'attachment.txt')
      should.equal(response.status, 200)
      const result = response.body
      should.exist(result.id)
      id = result.id
      should.equal(result.fileSize, attachmentContent.length)
      should.equal(result.fileName, 'attachment.txt')
      should.equal(result.challengeId, data.challenge.id)
    })

    it('upload attachment - missing token', async () => {
      const response = await chai.request(app)
        .post(`${baseUrl}/${data.challenge.id}/attachments`)
        .attach('attachment', attachmentContent, 'attachment.txt')
      should.equal(response.status, 401)
      should.equal(response.body.message, 'No token provided.')
    })

    it('upload attachment - invalid bearer format', async () => {
      const response = await chai.request(app)
        .post(`${baseUrl}/${data.challenge.id}/attachments`)
        .set('Authorization', 'invalid format')
        .attach('attachment', attachmentContent, 'attachment.txt')
      should.equal(response.status, 401)
      should.equal(response.body.message, 'No token provided.')
    })

    it('upload attachment - invalid token', async () => {
      const response = await chai.request(app)
        .post(`${baseUrl}/${data.challenge.id}/attachments`)
        .set('Authorization', `Bearer ${config.INVALID_TOKEN}`)
        .attach('attachment', attachmentContent, 'attachment.txt')
      should.equal(response.status, 401)
      should.equal(response.body.message, 'Failed to authenticate token.')
    })

    it('upload attachment - expired token', async () => {
      const response = await chai.request(app)
        .post(`${baseUrl}/${data.challenge.id}/attachments`)
        .set('Authorization', `Bearer ${config.EXPIRED_TOKEN}`)
        .attach('attachment', attachmentContent, 'attachment.txt')
      should.equal(response.status, 401)
      should.equal(response.body.message, 'Failed to authenticate token.')
    })

    it('upload attachment - invalid attachment', async () => {
      const response = await chai.request(app)
        .post(`${baseUrl}/${data.challenge.id}/attachments`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .attach('invalid', attachmentContent, 'attachment.txt')
      should.equal(response.status, 400)
      should.equal(response.body.message, '"attachment" is required')
    })

    it('upload attachment - challenge not found', async () => {
      const response = await chai.request(app)
        .post(`${baseUrl}/${notFoundId}/attachments`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
        .attach('attachment', attachmentContent, 'attachment.txt')
      should.equal(response.status, 404)
      should.equal(response.body.message, `Challenge with id: ${notFoundId} doesn't exist`)
    })

    it('upload attachment - forbidden', async () => {
      const response = await chai.request(app)
        .post(`${baseUrl}/${data.challenge.id}/attachments`)
        .set('Authorization', `Bearer ${config.USER_TOKEN}`)
        .attach('attachment', attachmentContent, 'attachment.txt')
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to perform this action!')
    })
  })

  describe('download attachment API tests', () => {
    it('download attachment successfully', async () => {
      const response = await chai.request(app)
        .get(`${baseUrl}/${data.challenge.id}/attachments/${id}`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
      should.equal(response.status, 200)
      should.equal(response.text, 'test') // attachment content is 'test'
    })

    it('download attachment - forbidden', async () => {
      const response = await chai.request(app)
        .get(`${baseUrl}/${data.challenge.id}/attachments/${id}`)
        .set('Authorization', `Bearer ${config.COPILOT_TOKEN}`)
      should.equal(response.status, 403)
      should.equal(response.body.message, 'You are not allowed to download attachment of the challenge.')
    })

    it('download attachment - attachment not found', async () => {
      const response = await chai.request(app)
        .get(`${baseUrl}/${data.challenge.id}/attachments/${notFoundId}`)
        .set('Authorization', `Bearer ${config.M2M_FULL_ACCESS_TOKEN}`)
      should.equal(response.status, 404)
      should.equal(response.body.message, `Attachment with id: ${notFoundId} doesn't exist`)
    })

    it('download attachment - challenge id mismatched', async () => {
      const response = await chai.request(app)
        .get(`${baseUrl}/${notFoundId}/attachments/${id}`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 400)
      should.equal(response.body.message, 'The attachment challengeId does not match the path challengeId.')
    })

    it('download attachment - invalid id', async () => {
      const response = await chai.request(app)
        .get(`${baseUrl}/${notFoundId}/attachments/invalid`)
        .set('Authorization', `Bearer ${config.ADMIN_TOKEN}`)
      should.equal(response.status, 400)
      should.equal(response.body.message, '"attachmentId" must be a valid GUID')
    })
  })
})
