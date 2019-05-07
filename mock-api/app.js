/**
 * The application entry point for mock API
 */
const express = require('express')
const cors = require('cors')
const config = require('config')
const winston = require('winston')

const app = express()
app.set('port', config.PORT)

app.use(cors())

// get challenge resources
app.get('/v5/challenges/:challengeId/resources', (req, res) => {
  const challengeId = req.params.challengeId
  winston.info(`Get resources of challenge id ${challengeId}`)

  const resources = [{
    id: '22ba038e-48da-487b-96e8-8d3b99b6d181',
    challengeId,
    memberId: '251280',
    memberHandle: 'denis', // normal user
    roleId: '10ba038e-48da-487b-96e8-8d3b99b6d18a'
  }, {
    id: '22ba038e-48da-487b-96e8-8d3b99b6d182',
    challengeId,
    memberId: '151743',
    memberHandle: 'Ghostar', // copilot
    roleId: '10ba038e-48da-487b-96e8-8d3b99b6d18b'
  }]

  winston.info(`Challenge resources: ${JSON.stringify(resources, null, 4)}`)
  res.json(resources)
})

// search groups
app.get('/v5/groups', (req, res) => {
  const page = Number(req.query.page || 1)
  const memberId = req.query.memberId || ''
  winston.info(`Search groups, page: ${page}, memberId: ${memberId}`)

  // only member id '151743' has groups
  let result
  if (page > 1 || memberId !== '151743') {
    result = { result: [] }
  } else {
    result = {
      result: [{
        id: '33ba038e-48da-487b-96e8-8d3b99b6d181',
        name: 'group1',
        description: 'desc1',
        privateGroup: false,
        selfRegister: true,
        domain: 'domain1'
      }, {
        id: '33ba038e-48da-487b-96e8-8d3b99b6d182',
        name: 'group2',
        description: 'desc2',
        privateGroup: true,
        selfRegister: false,
        domain: 'domain2'
      }]
    }
  }

  winston.info(`Result: ${JSON.stringify(result, null, 4)}`)
  res.json(result)
})

app.use((req, res) => {
  res.status(404).json({ error: 'route not found' })
})

app.use((err, req, res, next) => {
  winston.error(err)
  res.status(500).json({
    error: err.message,
  })
})

app.listen(app.get('port'), '0.0.0.0', () => {
  winston.info(`Express server listening on port ${app.get('port')}`)
})
