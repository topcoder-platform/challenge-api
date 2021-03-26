/*
 * Unit tests of audit log service
 */

require('../../app-bootstrap')
const chai = require('chai')
const config = require('config')
const helper = require('../../src/common/helper')

const should = chai.should()

describe('helper unit tests', () => {
  describe('wrapExpress method', () => {
    it('wrapExpress successfully', () => {
      helper.wrapExpress({}, {}, {})
    })
  })

  describe('autoWrapExpress method', () => {
    it('autoWrapExpress successfully 1', () => {
      helper.autoWrapExpress(() => { return { key1: 'message1' } })
    })

    it('autoWrapExpress successfully 2', () => {
      helper.autoWrapExpress(() => { return [{ key1: 'message1' }] })
    })
  })

  describe('setResHeaders method', () => {
    const mockReq = {
      query: 'query',
      path: 'path',
      page: 1
    }

    it('setResHeaders successfully 1', () => {
      const mockRes = {
        headers: {
          'X-Prev-Page': 0,
          'X-Next-Page': 0,
          'X-Page': 0,
          'X-Per-Page': 0,
          'X-Total': 0,
          'X-Total-Pages': 0,
          'Link': ''
        },
        set: (key, val) => {
          mockRes.headers[key] = val
        }
      }
      const result = {
        page: 3,
        perPage: 11,
        total: 24
      }
      helper.setResHeaders(mockReq, mockRes, result)
      should.equal(mockRes.headers['X-Page'], 3)
      should.exist(mockRes.headers['Link'])
    })

    it('setResHeaders successfully 2', () => {
      const mockRes = {
        headers: {
          'X-Prev-Page': 0,
          'X-Next-Page': 0,
          'X-Page': 0,
          'X-Per-Page': 0,
          'X-Total': 0,
          'X-Total-Pages': 0,
          'Link': ''
        },
        set: (key, val) => {
          mockRes.headers[key] = val
        }
      }
      const result = {
        page: 2,
        perPage: 11,
        total: 24
      }
      helper.setResHeaders(mockReq, mockRes, result)
      should.equal(mockRes.headers['X-Page'], 2)
      should.exist(mockRes.headers['Link'])
    })

    it('setResHeaders successfully 3', () => {
      const mockRes = {
        headers: {
          'X-Prev-Page': 0,
          'X-Next-Page': 0,
          'X-Page': 0,
          'X-Per-Page': 0,
          'X-Total': 0,
          'X-Total-Pages': 0,
          'Link': ''
        },
        set: (key, val) => {
          mockRes.headers[key] = val
        }
      }
      const result = {
        page: 1,
        perPage: 10,
        total: 0
      }
      helper.setResHeaders(mockReq, mockRes, result)
      should.equal(mockRes.headers['X-Page'], 1)
      should.equal(mockRes.headers['Link'], '')
    })
  })

  describe('checkIfExists method', () => {
    it('checkIfExists successfully 1', () => {
      const source = ['term1', 'term2']
      const term = 'term1'
      const res = helper.checkIfExists(source, term)
      should.equal(res, true)
    })

    it('checkIfExists successfully 2', () => {
      const source = ['term1', 'term2']
      const term = 'term1,term3'
      const res = helper.checkIfExists(source, term)
      should.equal(res, false)
    })

    it('checkIfExists successfully 3', () => {
      const source = ['term1', 'term2']
      const term = ['term1', 'term2']
      const res = helper.checkIfExists(source, term)
      should.equal(res, true)
    })

    it('checkIfExists - invalid source', () => {
      try {
        helper.checkIfExists('abc', 'term1')
      } catch (e) {
        should.equal(e.message, 'Source argument should be an array')
        return
      }
      throw new Error('should not reach here')
    })

    it('checkIfExists - invalid term', () => {
      try {
        helper.checkIfExists(['abc'], 123)
      } catch (e) {
        should.equal(e.message, 'Term argument should be either a string or an array')
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('downloadFromFileStack method', () => {
    it('downloadFromFileStack successfully', async () => {
      const res = await helper.downloadFromFileStack(`${config.RESOURCES_API_URL}/151743/challenges`)
      should.exist(res.data)
      should.exist(res.mimetype)
    })
  })

  describe('createResource method', () => {
    it('createResource successfully', async () => {
      const res = await helper.createResource('1234', 'test', config.MANAGER_ROLE_ID)
      should.exist(res)
    })
  })

  describe('getCompleteUserGroupTreeIds method', () => {
    it('getCompleteUserGroupTreeIds successfully', async () => {
      const res = await helper.getCompleteUserGroupTreeIds(151743)
      should.equal(res.length, 2)
    })
  })

  describe('expandWithParentGroups method', () => {
    it('expandWithParentGroups successfully', async () => {
      const res = await helper.expandWithParentGroups('33ba038e-48da-487b-96e8-8d3b99b6d181')
      should.equal(res.length, 1)
    })
  })

  describe('getProjectDefaultTerms method', () => {
    it('getProjectDefaultTerms successfully', async () => {
      const res = await helper.getProjectDefaultTerms('111')
      should.equal(res.length, 2)
    })

    it('getProjectDefaultTerms with not exist projectId', async () => {
      try {
        await helper.getProjectDefaultTerms('1234')
      } catch (e) {
        should.equal(e.message.indexOf('doesn\'t exist') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('validateChallengeTerms method', () => {
    it('validateChallengeTerms successfully', async () => {
      const terms = [
        { id: '0fcb41d1-ec7c-44bb-8f3b-f017a61cd708' },
        { id: 'be0652ae-8b28-4e91-9b42-8ad00b31e9cb' }
      ]

      const res = await helper.validateChallengeTerms(terms)
      should.equal(res.length, 2)
    })

    it('validateChallengeTerms with not exist termId', async () => {
      const terms = [
        { id: '0fcb41d1-ec7c-44bb-8f3b-f017a6111111' },
        { id: 'be0652ae-8b28-4e91-9b42-8ad00b31e9cb' }
      ]
      try {
        await helper.validateChallengeTerms(terms)
      } catch (e) {
        should.equal(e.message.indexOf('does not exist') >= 0, true)
        return
      }
      throw new Error('should not reach here')
    })
  })

  describe('getGroupById method', () => {
    it('getGroupById successfully', async () => {
      const res = await helper.getGroupById('33ba038e-48da-487b-96e8-8d3b99b6d181')
      should.equal(res.name, 'group1')
    })

    it('getGroupById with not exist groupId', async () => {
      const res = await helper.getGroupById('not-exist')
      should.not.exist(res)
    })
  })
})
