/*
 * Unit tests of attachment service
 */

require('../../app-bootstrap')
const fs = require('fs')
const path = require('path')
const uuid = require('uuid/v4')
const chai = require('chai')
const awsMock = require('aws-sdk-mock')
const service = require('../../src/services/AttachmentService')
const testHelper = require('../testHelper')
const prisma = require('../../src/common/prisma').getClient()

const should = chai.should()

const attachmentContent = fs.readFileSync(path.join(__dirname, '../attachment.txt'))

describe('attachment service unit tests', () => {
  // created attachment id
  let id
  // generated data
  let data
  // attachment for task challenge
  let id2
  const notFoundId = uuid()

  before(async () => {
    // mock S3 before creating S3 instance
    awsMock.mock('S3', 'getObject', (params, callback) => {
      callback(null, { Body: Buffer.from(attachmentContent) });
    });
    await testHelper.createData()
    data = testHelper.getData()
    // create attachment
    const createdAttachment = await prisma.attachment.create({
      data: {
        name: 'attachment.txt',
        url: 'http://s3.amazonaws.com/topcoder_01/attachment.txt',
        fileSize: 1024,
        createdBy: 'testdata',
        updatedBy: 'testdata',
        challenge: { connect: { id: data.challenge.id } }
      }
    })
    id = createdAttachment.id
    const taskAttachment = await prisma.attachment.create({ 
      data: {
        name: 'attachment.txt',
        url: 'http://s3.amazonaws.com/topcoder_01/attachment.txt',
        fileSize: 1024,
        createdBy: 'testdata',
        updatedBy: 'testdata',
        challenge: { connect: { id: data.taskChallenge.id } }
      }
    })
    id2 = taskAttachment.id
  })

  after(async () => {
    await testHelper.clearData()
    await prisma.attachment.deleteMany({ where: { id }})
    // restore S3
    awsMock.restore('S3');
  })

  describe('download attachment tests', () => {
    it('download attachment successfully', async () => {
      const result = await service.downloadAttachment({ isMachine: true }, data.challenge.id, id)
      should.equal(result.fileName, 'attachment.txt')
      should.equal(attachmentContent.compare(result.data), 0)
    })

    it('download attachment - forbidden', async () => {
      try {
        await service.downloadAttachment({ roles: ['user'], userId: 678678 }, data.taskChallenge.id, id2)
      } catch (e) {
        should.equal(e.message, 'You don\'t have access to view this challenge')
        return
      }
      throw new Error('should not reach here')
    })

    it('download attachment - attachment not found', async () => {
      try {
        await service.downloadAttachment({ isMachine: true }, data.challenge.id, notFoundId)
      } catch (e) {
        should.equal(e.message, `Attachment ${notFoundId} not found in challenge ${data.challenge.id}`)
        return
      }
      throw new Error('should not reach here')
    })

    it('download attachment - challenge id mismatched', async () => {
      try {
        await service.downloadAttachment({ isMachine: true }, notFoundId, id)
      } catch (e) {
        should.equal(e.message, `Attachment ${id} not found in challenge ${notFoundId}`)
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
