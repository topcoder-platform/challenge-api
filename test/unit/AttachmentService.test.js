/*
 * Unit tests of attachment service
 */

require('../../app-bootstrap')
const fs = require('fs')
const path = require('path')
const uuid = require('uuid/v4')
const chai = require('chai')
const service = require('../../src/services/AttachmentService')
const testHelper = require('../testHelper')

const should = chai.should()

const attachmentContent = fs.readFileSync(path.join(__dirname, '../attachment.txt'))

describe('attachment service unit tests', () => {
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

  describe('upload attachment tests', () => {
    it('upload attachment successfully', async () => {
      const result = await service.uploadAttachment({
        isMachine: true
      }, data.challenge.id, {
        attachment: {
          data: attachmentContent,
          mimetype: 'text/plain',
          name: 'attachment.txt',
          size: attachmentContent.length
        }
      })
      should.exist(result.id)
      id = result.id
      should.equal(result.fileSize, attachmentContent.length)
      should.equal(result.fileName, 'attachment.txt')
      should.equal(result.challengeId, data.challenge.id)
    })

    it('upload attachment - forbidden', async () => {
      try {
        await service.uploadAttachment({
          roles: ['user']
        }, data.challenge.id, {
          attachment: {
            data: attachmentContent,
            mimetype: 'text/plain',
            name: 'attachment.txt',
            size: attachmentContent.length
          }
        })
      } catch (e) {
        should.equal(e.message, 'You are not allowed to upload attachment of the challenge.')
        return
      }
      throw new Error('should not reach here')
    })

    it('upload attachment - file too large', async () => {
      try {
        await service.uploadAttachment({
          isMachine: true
        }, data.challenge.id, {
          attachment: {
            truncated: true,
            data: attachmentContent,
            mimetype: 'text/plain',
            name: 'attachment.txt',
            size: attachmentContent.length
          }
        })
      } catch (e) {
        should.equal(e.message.indexOf('attachment is too large') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('upload attachment - challenge not found', async () => {
      try {
        await service.uploadAttachment({
          isMachine: true
        }, notFoundId, {
          attachment: {
            data: attachmentContent,
            mimetype: 'text/plain',
            name: 'attachment.txt',
            size: attachmentContent.length
          }
        })
      } catch (e) {
        should.equal(e.message, `Challenge with id: ${notFoundId} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('download attachment tests', () => {
    it('download attachment successfully', async () => {
      const result = await service.downloadAttachment({ isMachine: true }, data.challenge.id, id)
      should.equal(result.fileName, 'attachment.txt')
      should.equal(attachmentContent.compare(result.data), 0)
    })

    it('download attachment - forbidden', async () => {
      try {
        await service.downloadAttachment({ roles: ['user'], userId: 678678 }, data.challenge.id, id)
      } catch (e) {
        should.equal(e.message, 'You are not allowed to download attachment of the challenge.')
        return
      }
      throw new Error('should not reach here')
    })

    it('download attachment - attachment not found', async () => {
      try {
        await service.downloadAttachment({ isMachine: true }, data.challenge.id, notFoundId)
      } catch (e) {
        should.equal(e.message, `Attachment with id: ${notFoundId} doesn't exist`)
        return
      }
      throw new Error('should not reach here')
    })

    it('download attachment - challenge id mismatched', async () => {
      try {
        await service.downloadAttachment({ isMachine: true }, notFoundId, id)
      } catch (e) {
        should.equal(e.message, 'The attachment challengeId does not match the path challengeId.')
        return
      }
      throw new Error('should not reach here')
    })

    it('download attachment - invalid id', async () => {
      try {
        await service.downloadAttachment({ isMachine: true }, data.challenge.id, 'invalid')
      } catch (e) {
        should.equal(e.message.indexOf('"attachmentId" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('download attachment - invalid challenge id', async () => {
      try {
        await service.downloadAttachment({ isMachine: true }, 'invalid', id)
      } catch (e) {
        should.equal(e.message.indexOf('"challengeId" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })
})
