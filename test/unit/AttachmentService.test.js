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

  describe('create attachment tests', () => {
    it('create attachment successfully', async () => {
      const result = await service.createAttachment({
        isMachine: true,
        handle: 'abc',
        sub: 'def'
      }, data.challenge.id, {
        name: 'attachment.txt',
        url: 'http://s3.amazonaws.com/bucket/key1/key2',
        fileSize: attachmentContent.length,
        description: 'desc'
      })
      should.exist(result.id)
      id = result.id
      should.equal(result.fileSize, attachmentContent.length)
      should.equal(result.name, 'attachment.txt')
      should.equal(result.challengeId, data.challenge.id)
    })

    it('create attachment - forbidden', async () => {
      try {
        await service.createAttachment({
          roles: ['user'],
          handle: 'abc',
          sub: 'def'
        }, data.challenge.id, {
          name: 'attachment.txt',
          url: 'http://s3.amazonaws.com/bucket/key1/key2',
          fileSize: attachmentContent.length,
          description: 'desc'
        })
      } catch (e) {
        should.equal(e.message.indexOf('Request failed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('upload attachment - url not in white list', async () => {
      try {
        await service.createAttachment({
          isMachine: true,
          handle: 'abc',
          sub: 'def'
        }, data.challenge.id, {
          name: 'attachment.txt',
          url: 'http://s3.amazonaws.com/x/y/z',
          fileSize: attachmentContent.length,
          description: 'desc'
        })
      } catch (e) {
        should.equal(e.message.indexOf('The bucket x is not in the whitelist') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('upload attachment - challenge not found', async () => {
      try {
        await service.createAttachment({
          isMachine: true,
          handle: 'abc',
          sub: 'def'
        }, notFoundId, {
          name: 'attachment.txt',
          url: 'http://s3.amazonaws.com/bucket/key1/key2',
          fileSize: attachmentContent.length,
          description: 'desc'
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
    })

    it('download attachment - forbidden', async () => {
      try {
        await service.downloadAttachment({ roles: ['user'], userId: 678678 }, data.challenge.id, id)
      } catch (e) {
        should.equal(e.message.indexOf('Request failed') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('download attachment - attachment not found', async () => {
      try {
        await service.downloadAttachment({ isMachine: true }, data.challenge.id, notFoundId)
      } catch (e) {
        should.equal(e.message.indexOf('Attachment') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('download attachment - challenge id mismatched', async () => {
      try {
        await service.downloadAttachment({ isMachine: true }, notFoundId, id)
      } catch (e) {
        should.equal(e.message.indexOf('doesn\'t exist') >= 0, true)
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

  describe('get attachment tests', () => {
    it('get attachment successfully', async () => {
      const result = await service.getAttachment({ isMachine: true }, data.challenge.id, id)
      should.equal(result.name, 'attachment.txt')
      should.equal(result.id, id)
      should.equal(result.challengeId, data.challenge.id)
    })

    it('get attachment - attachment not found', async () => {
      try {
        await service.getAttachment({ isMachine: true }, data.challenge.id, notFoundId)
      } catch (e) {
        should.equal(e.message.indexOf('Attachment') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('fully update attachment tests', () => {
    it('fully update attachment successfully', async () => {
      const result = await service.fullyUpdateAttachment({ isMachine: true }, data.challenge.id, id,
        {
          name: 'attachment.txt',
          url: 'http://s3.amazonaws.com/bucket/key1/key2',
          fileSize: 13,
          description: 'desc2'
        }
      )
      should.equal(result.name, 'attachment.txt')
      should.equal(result.fileSize, 13)
      should.equal(result.description, 'desc2')
    })
  })

  describe('partially update attachment tests', () => {
    it('partially update attachment successfully', async () => {
      const result = await service.partiallyUpdateAttachment({ isMachine: true }, data.challenge.id, id,
        {
          fileSize: 15,
          description: 'desc3'
        }
      )
      should.equal(result.name, 'attachment.txt')
      should.equal(result.fileSize, 15)
      should.equal(result.description, 'desc3')
    })
  })

  describe('delete attachment tests', () => {
    it('delete attachment successfully', async () => {
      await service.deleteAttachment({ isMachine: true }, data.challenge.id, id)
    })

    it('delete attachment - not found', async () => {
      try {
        await service.deleteAttachment({ isMachine: true }, data.challenge.id, notFoundId)
      } catch (e) {
        should.equal(e.message.indexOf('not found') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })

    it('delete attachment - invalid id', async () => {
      try {
        await service.deleteAttachment({ isMachine: true }, data.challenge.id, 'invalid')
      } catch (e) {
        should.equal(e.message.indexOf('"attachmentId" must be a valid GUID') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })
})
