/**
 * The application entry point for mock API
 */

const express = require('express')
const cors = require('cors')
const config = require('config')
const winston = require('winston')
const _ = require('lodash')
const prisma = require('../src/common/prisma').getClient()

const app = express()
app.set('port', config.PORT)

app.use(cors())

const groups = {
  '33ba038e-48da-487b-96e8-8d3b99b6d181': {
    id: '33ba038e-48da-487b-96e8-8d3b99b6d181',
    name: 'group1',
    description: 'desc1',
    privateGroup: false,
    selfRegister: true,
    domain: 'domain1'
  },
  '33ba038e-48da-487b-96e8-8d3b99b6d182': {
    id: '33ba038e-48da-487b-96e8-8d3b99b6d182',
    name: 'group2',
    description: 'desc2',
    privateGroup: true,
    selfRegister: false,
    domain: 'domain2'
  }
}

// create resources
app.post('/v5/resources', (req, res) => {
  // let's directly return 200 now.
  winston.debug(`creating challenge resources`)
  res.json({})
})

// get resource roles. Return roles with full write access
app.get('/v5/resource-roles', (req, res) => {
  res.json([{
    id: '10ba038e-48da-487b-96e8-8d3b99b6d18a',
    fullWriteAccess: true
  }, {
    id: '10ba038e-48da-487b-96e8-8d3b99b6d18a',
    fullWriteAccess: true
  }])
})

// get challenge resources
app.get('/v5/resources', (req, res) => {
  winston.debug(`query: ${JSON.stringify(req.query, null, 2)}`)
  if (Number(req.query.page) > 1) {
    res.json([])
    return
  }
  const challengeId = req.query.challengeId
  winston.info(`Get resources of challenge id ${challengeId}`)

  const memberId = req.query.memberId

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
  }, {
    // submitter & winner
    id: '22ba038e-48da-487b-96e8-8d3b99b6d183',
    challengeId,
    memberId: '12345678',
    memberHandle: 'thomaskranitsas',
    roleId: '732339e7-8e30-49d7-9198-cccf9451e221'
  }]

  let ret
  if (memberId) {
    // filter with memberId
    ret = _.filter(resources, r => r.memberId === memberId)
  } else {
    ret = resources
  }

  winston.info(`Challenge resources: ${JSON.stringify(resources, null, 4)}`)
  res.json(ret)
})

// get challenges member can access to
app.get('/v5/resources/:memberId/challenges', (req, res) => {
  const memberId = req.params.memberId
  if (memberId === '40309246' || memberId === '151743') {
    prisma.challenge.findMany()
      .then(result => {
        const ret = []
        for (const element of result) {
          if (memberId === '151743') {
            if (element.createdBy === 'Ghostar') {
              ret.push(element.id)
            }
          } else {
            ret.push(element.id)
          }
        }
        res.json(ret)
      })
      .catch(e => {
        winston.error(e)
        res.json([])
      })
  } else {
    res.json([])
  }
})

let projectIdSeed = 3456;
// create project
app.post('/v5/projects', (req, res) => {
  // directly return result with id
  projectIdSeed += 1
  res.json({ id: projectIdSeed })
})

// get project by id
app.get('/v5/projects/:projectId', (req, res) => {
  const projectId = req.params.projectId
  if (projectId === '111' || projectId === '123' || projectId === '112233' || projectId === '16531') {
    res.json({
      projectId,
      directProjectId: parseInt(projectId) + 1,
      terms: ['0fcb41d1-ec7c-44bb-8f3b-f017a61cd708', 'be0652ae-8b28-4e91-9b42-8ad00b31e9cb']
    })
  } else if (projectId === '200') {
    res.status(403).send({
      id: '6e97fe68-f89c-4c45-b25b-d17933a3c4b9',
      result: {
        success: false,
        status: 403,
        content: { message: 'You do not have permissions to perform this action' }
      }
    })
  } else {
    res.status(404).end()
  }
})

// get project billing info
app.get('/v5/projects/:projectId/billingAccount', (req, res) => {
  // let's return same billing info for now
  res.json({
    markup: 1,
    tcBillingAccountId: 'test-billing-account'
  })
})

// search groups
app.get('/v5/groups', (req, res) => {
  const page = Number(req.query.page || 1)
  const memberId = req.query.memberId || ''
  winston.info(`Search groups, page: ${page}, memberId: ${memberId}`)

  // only member id '151743' has groups
  let result
  if (page > 1 || memberId !== '151743') {
    result = []
  } else {
    result = [{
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

  winston.info(`Result: ${JSON.stringify(result, null, 4)}`)
  res.json(result)
})

// get group by id
app.get('/v5/groups/:groupId', (req, res) => {
  winston.info(`Find group, groupId: ${req.params.groupId}`)
  if (!groups[req.params.groupId]) {
    res.status(404).send({ message: `group ${req.params.groupId} not found` })
  }
  const result = groups[req.params.groupId]
  winston.info(`Result: ${JSON.stringify(result, null, 4)}`)
  res.json(result)
})

// terms API
app.get('/v5/terms/:termId', (req, res) => {
  const termId = req.params.termId
  winston.info(`Get terms of use details, termsId = ${termId}`)

  const terms = {
    '0fcb41d1-ec7c-44bb-8f3b-f017a61cd708': {
      id: '0fcb41d1-ec7c-44bb-8f3b-f017a61cd708',
      title: 'Competition Non-Disclosure Agreement',
      url: '',
      text: 'docusign NDA',
      docusignTemplateId: '0c5b7081-1fff-4484-a20f-824c97a03b9b',
      agreeabilityType: 'DocuSignable'
    },
    '8a0207fc-ac9b-47e7-af1b-81d1ccaf0afc': {
      id: '8a0207fc-ac9b-47e7-af1b-81d1ccaf0afc',
      title: 'Non-Agreeable Terms Test',
      url: 'www.example.com',
      text: 'You will need to request access to join these challenges.  Please email support@topcoder.com to request access.',
      agreeabilityType: 'Non-electronically-agreeable'
    },
    '453c7c5c-c872-4672-9e78-5162d70903d3': {
      id: '453c7c5c-c872-4672-9e78-5162d70903d3',
      title: 'test 1',
      url: '',
      text: 'sf sfsfsdfsd sdf',
      agreeabilityType: 'Electronically-agreeable'
    },
    '28841de8-2f42-486f-beac-21d46a832ab6': {
      id: '28841de8-2f42-486f-beac-21d46a832ab6',
      title: '2008 TCO Marathon Match Competition Official Rules',
      url: 'http://topcoder.com/mm-terms',
      text: 'Marathon Competition Official Rules and Regulations',
      agreeabilityType: 'Electronically-agreeable'
    },
    'fb7e4a66-03d3-4918-b328-b1f277b0590b': {
      id: 'fb7e4a66-03d3-4918-b328-b1f277b0590b',
      title: '2008 TCO Studio Competition Rules',
      url: 'http://topcoder.com/studio-terms',
      text: 'Studio Design Official Rules and Regulations',
      agreeabilityType: 'Electronically-agreeable'
    },
    '13bbb3cb-6779-4dc8-9787-26411dfb7925': {
      id: '13bbb3cb-6779-4dc8-9787-26411dfb7925',
      title: 'Open AIM Developer Challenge Rules',
      url: 'http://topcoder.com/open-aim-terms',
      text: 'OPEN AIM DEVELOPER CHALLENGE, POWERED BY TOPCODER - Powered by Topcoder',
      agreeabilityType: 'Electronically-agreeable'
    },
    'be0652ae-8b28-4e91-9b42-8ad00b31e9cb': {
      id: 'be0652ae-8b28-4e91-9b42-8ad00b31e9cb',
      title: 'Subcontractor Services Agreement 2009-09-02',
      url: 'http://www.topcoder.com/i/terms/Subcontractor+Services+Agreement+2009-09-02.pdf',
      text: 'Subcontractor Services Agreement 2009-09-02. This agreement is unavailable in text format.  Please download the PDF to read its contents',
      agreeabilityType: 'Non-electronically-agreeable'
    }
  }

  if (!_.isUndefined(terms[termId])) {
    winston.info(`Terms details : ${JSON.stringify(terms[termId])}`)
    res.json(terms[termId])
  } else {
    res.status(404).end()
  }
})

// Event Bus API
app.post('/v5/bus/events', (req, res) => {
  winston.info('Received bus events')
  res.status(200).json({})
})

app.post('/v5/auth0', (req, res) => {
  winston.info('Received Auth0 request')
  // return config/test.js#M2M_FULL_ACCESS_TOKEN
  res.status(200).json({ access_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL3RvcGNvZGVyLWRldi5hdXRoMC5jb20vIiwic3ViIjoiZW5qdzE4MTBlRHozWFR3U08yUm4yWTljUVRyc3BuM0JAY2xpZW50cyIsImF1ZCI6Imh0dHBzOi8vbTJtLnRvcGNvZGVyLWRldi5jb20vIiwiaWF0IjoxNTUwOTA2Mzg4LCJleHAiOjE4ODA5OTI3ODgsImF6cCI6ImVuancxODEwZUR6M1hUd1NPMlJuMlk5Y1FUcnNwbjNCIiwiaXNNYWNoaW5lIjp0cnVlLCJzY29wZSI6ImFsbDpjaGFsbGVuZ2VzIGFsbDpjaGFsbGVuZ2VfdHlwZXMgYWxsOmNoYWxsZW5nZV9zZXR0aW5ncyByZWFkOmNoYWxsZW5nZV9hdWRpdF9sb2dzIGFsbDpjaGFsbGVuZ2VfcGhhc2VzIGFsbDp0aW1lbGluZV90ZW1wbGF0ZXMgYWxsOmNoYWxsZW5nZV9hdHRhY2htZW50cyBhbGw6Y2hhbGxlbmdlX3R5cGVfdGltZWxpbmVfdGVtcGxhdGVzIiwiZ3R5IjoiY2xpZW50LWNyZWRlbnRpYWxzIn0.On-x52qiJJyaLfljBUOYCU1bHWTy9I4CLIIJVyFS-l4' })
})

app.use((req, res) => {
  res.status(404).json({ error: 'route not found' })
})

app.use((err, req, res, next) => {
  winston.error(err)
  res.status(500).json({
    error: err.message
  })
})

app.listen(app.get('port'), '0.0.0.0', () => {
  winston.info(`Express server listening on port ${app.get('port')}`)
})
