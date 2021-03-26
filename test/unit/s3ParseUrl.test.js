/*
 * Unit tests of audit log service
 */

require('../../app-bootstrap')
const chai = require('chai')
const s3ParseUrl = require('../../src/common/s3ParseUrl')

const should = chai.should()

describe('s3 parse url unit tests', () => {
  it('parse s3 url successfully 1', async () => {
    const result = s3ParseUrl('http://s3.amazonaws.com/bucket/key1/key2')
    should.equal(result.bucket, 'bucket')
    should.equal(result.key, 'key1/key2')
    should.equal(result.region, '')
  })

  it('parse s3 url successfully 2', async () => {
    const result = s3ParseUrl('http://s3-aws-region.amazonaws.com/bucket/key1/key2')
    should.equal(result.bucket, 'bucket')
    should.equal(result.key, 'key1/key2')
    should.equal(result.region, 'aws-region')
  })

  it('parse s3 url successfully 3', async () => {
    const result = s3ParseUrl('http://bucket.s3.amazonaws.com/key1/key2')
    should.equal(result.bucket, 'bucket')
    should.equal(result.key, 'key1/key2')
    should.equal(result.region, '')
  })

  it('parse s3 url successfully 4', async () => {
    const result = s3ParseUrl('http://bucket.s3-aws-region.amazonaws.com/key1/key2')
    should.equal(result.bucket, 'bucket')
    should.equal(result.key, 'key1/key2')
    should.equal(result.region, 'aws-region')
  })

  it('parse s3 url with invalid', async () => {
    const result = s3ParseUrl('http://invalid')
    should.not.exist(result)
  })
})
