/*
 * Prepare for tests.
 */

// During the test the env variable is set to test
process.env.NODE_ENV = 'test'

const prepare = require('mocha-prepare')
const config = require('config')
const AWS = require('aws-sdk')

/*
 * Initialize an S3 bucket.
 */
async function initBucket () {
  const s3 = new AWS.S3()
  try {
    await s3.headBucket({ Bucket: config.AMAZON.ATTACHMENT_S3_BUCKET }).promise()
  } catch (err) {
    await s3.createBucket({ Bucket: config.AMAZON.ATTACHMENT_S3_BUCKET }).promise()
  }
}

prepare(function (done) {
  AWS.config.update({
    accessKeyId: config.AMAZON.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AMAZON.AWS_SECRET_ACCESS_KEY,
    region: config.AMAZON.AWS_REGION,
    endpoint: config.S3_ENDPOINT,
    sslEnabled: false,
    s3ForcePathStyle: true
  })
  initBucket()
    .then(result => {
      done()
    })
}, function (done) {
  done()
})
