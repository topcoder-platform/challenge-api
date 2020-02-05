/*
 * E2E tests of health API
 */

require('../../app-bootstrap')
const chai = require('chai')
const chaiHttp = require('chai-http')
const config = require('config')
const app = require('../../app')

const should = chai.should()
chai.use(chaiHttp)

describe('health API tests', () => {
  it('Check health successfully', async () => {
    const response = await chai.request(app)
      .get(`/${config.API_VERSION}/challenges/health`)
    should.equal(response.status, 200)
    should.equal(response.body.checksRun >= 1, true)
  })
})
