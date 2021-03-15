const newman = require('newman')
const _ = require('lodash')

const challengeTypeRequests = [
  {
    folder: 'create challengeType by admin',
    iterationData: require('./testData/challenge-type/create-challenge-type-by-admin.json')
  },
  {
    folder: 'create challengeType by invalid token',
    iterationData: require('./testData/challenge-type/create-challenge-type-by-invalid-token.json')
  },
  {
    folder: 'create challengeType by error field',
    iterationData: require('./testData/challenge-type/create-challenge-type-by-error-field.json')
  },
  {
    folder: 'get challengeType - id'
  },
  {
    folder: 'get challengeType - all'
  },
  {
    folder: 'get challengeType - not found'
  },
  {
    folder: 'fully update challengeType by admin',
    iterationData: require('./testData/challenge-type/fully-update-challenge-type-by-admin.json')
  },
  {
    folder: 'fully update challengeType by invalid token',
    iterationData: require('./testData/challenge-type/fully-update-challenge-type-by-invalid-token.json')
  },
  {
    folder: 'fully update challengeType by error field',
    iterationData: require('./testData/challenge-type/fully-update-challenge-type-by-error-field.json')
  },
  {
    folder: 'fully update challengeType by not foundId'
  },
  {
    folder: 'partially update challengeType by admin',
    iterationData: require('./testData/challenge-type/partially-update-challenge-type-by-admin.json')
  },
  {
    folder: 'partially update challengeType by invalid token',
    iterationData: require('./testData/challenge-type/partially-update-challenge-type-by-invalid-token.json')
  },
  {
    folder: 'partially update challengeType by error field',
    iterationData: require('./testData/challenge-type/partially-update-challenge-type-by-error-field.json')
  },
  {
    folder: 'partially update challengeType by not foundId'
  }
]
const challengeTrackRequests = [
  {
    folder: 'create challengeTrack by admin',
    iterationData: require('./testData/challenge-track/create-challenge-track-by-admin.json')
  },
  {
    folder: 'create challengeTrack by invalid token',
    iterationData: require('./testData/challenge-track/create-challenge-track-by-invalid-token.json')
  },
  {
    folder: 'create challengeTrack by error field',
    iterationData: require('./testData/challenge-track/create-challenge-track-by-error-field.json')
  },
  {
    folder: 'get challengeTrack - id'
  },
  {
    folder: 'get challengeTrack - all'
  },
  {
    folder: 'get challengeTrack - not found'
  },
  {
    folder: 'fully update challengeTrack by admin',
    iterationData: require('./testData/challenge-track/fully-update-challenge-track-by-admin.json')
  },
  {
    folder: 'fully update challengeTrack by invalid token',
    iterationData: require('./testData/challenge-track/fully-update-challenge-track-by-invalid-token.json')
  },
  {
    folder: 'fully update challengeTrack by error field',
    iterationData: require('./testData/challenge-track/fully-update-challenge-track-by-error-field.json')
  },
  {
    folder: 'fully update challengeTrack by not foundId'
  },
  {
    folder: 'partially update challengeTrack by admin',
    iterationData: require('./testData/challenge-track/partially-update-challenge-track-by-admin.json')
  },
  {
    folder: 'partially update challengeTrack by invalid token',
    iterationData: require('./testData/challenge-track/partially-update-challenge-track-by-invalid-token.json')
  },
  {
    folder: 'partially update challengeTrack by error field',
    iterationData: require('./testData/challenge-track/partially-update-challenge-track-by-error-field.json')
  },
  {
    folder: 'partially update challengeTrack by not foundId'
  }
]

const challengePhaseRequests = [
  {
    folder: 'create challengePhase by admin',
    iterationData: require('./testData/challenge-phase/create-challenge-phase-by-admin.json')
  },
  {
    folder: 'create challengePhase by invalid token',
    iterationData: require('./testData/challenge-phase/create-challenge-phase-by-invalid-token.json')
  },
  {
    folder: 'create challengePhase by error field',
    iterationData: require('./testData/challenge-phase/create-challenge-phase-by-error-field.json')
  },
  {
    folder: 'get challengePhase - id'
  },
  {
    folder: 'get challengePhase - all'
  },
  {
    folder: 'get challengePhase - not found'
  },
  {
    folder: 'fully update challengePhase by admin',
    iterationData: require('./testData/challenge-phase/fully-update-challenge-phase-by-admin.json')
  },
  {
    folder: 'fully update challengePhase by invalid token',
    iterationData: require('./testData/challenge-phase/fully-update-challenge-phase-by-invalid-token.json')
  },
  {
    folder: 'fully update challengePhase by error field',
    iterationData: require('./testData/challenge-phase/fully-update-challenge-phase-by-error-field.json')
  },
  {
    folder: 'fully update challengePhase by not foundId'
  },
  {
    folder: 'partially update challengePhase by admin',
    iterationData: require('./testData/challenge-phase/partially-update-challenge-phase-by-admin.json')
  },
  {
    folder: 'partially update challengePhase by invalid token',
    iterationData: require('./testData/challenge-phase/partially-update-challenge-phase-by-invalid-token.json')
  },
  {
    folder: 'partially update challengePhase by error field',
    iterationData: require('./testData/challenge-phase/partially-update-challenge-phase-by-error-field.json')
  },
  {
    folder: 'partially update challengePhase by not foundId'
  },
  {
    folder: 'delete challengePhase - id'
  },
  {
    folder: 'delete challengePhase - invalid token',
    iterationData: require('./testData/challenge-phase/delete-challenge-phase-by-invalid-token.json')
  },
  {
    folder: 'delete challengePhase - not found'
  }
]

const timelineTemplateRequests = [
  {
    folder: 'create timelineTemplate by admin',
    iterationData: require('./testData/timeline-template/create-timeline-template-by-admin.json')
  },
  {
    folder: 'create timelineTemplate by invalid token',
    iterationData: require('./testData/timeline-template/create-timeline-template-by-invalid-token.json')
  },
  {
    folder: 'create timelineTemplate by error field',
    iterationData: require('./testData/timeline-template/create-timeline-template-by-error-field.json')
  },
  {
    folder: 'get timelineTemplate - id'
  },
  {
    folder: 'get timelineTemplate - all'
  },
  {
    folder: 'get timelineTemplate - not found'
  },
  {
    folder: 'fully update timelineTemplate by admin',
    iterationData: require('./testData/timeline-template/fully-update-timeline-template-by-admin.json')
  },
  {
    folder: 'fully update timelineTemplate by invalid token',
    iterationData: require('./testData/timeline-template/fully-update-timeline-template-by-invalid-token.json')
  },
  {
    folder: 'fully update timelineTemplate by error field',
    iterationData: require('./testData/timeline-template/fully-update-timeline-template-by-error-field.json')
  },
  {
    folder: 'fully update timelineTemplate by not foundId'
  },
  {
    folder: 'partially update timelineTemplate by admin',
    iterationData: require('./testData/timeline-template/partially-update-timeline-template-by-admin.json')
  },
  {
    folder: 'partially update timelineTemplate by invalid token',
    iterationData: require('./testData/timeline-template/partially-update-timeline-template-by-invalid-token.json')
  },
  {
    folder: 'partially update timelineTemplate by error field',
    iterationData: require('./testData/timeline-template/partially-update-timeline-template-by-error-field.json')
  },
  {
    folder: 'partially update timelineTemplate by not foundId'
  },
  {
    folder: 'delete timelineTemplate - id'
  },
  {
    folder: 'delete timelineTemplate - invalid token',
    iterationData: require('./testData/timeline-template/delete-timeline-template-by-invalid-token.json')
  },
  {
    folder: 'delete timelineTemplate - not found'
  }
]

const challengeTimelineTemplateRequests = [
  {
    folder: 'create challengeTimelineTemplate by admin',
    iterationData: require('./testData/challenge-timeline-template/create-challenge-timeline-template-by-admin.json')
  },
  {
    folder: 'create challengeTimelineTemplate by invalid token',
    iterationData: require('./testData/challenge-timeline-template/create-challenge-timeline-template-by-invalid-token.json')
  },
  {
    folder: 'create challengeTimelineTemplate by error field',
    iterationData: require('./testData/challenge-timeline-template/create-challenge-timeline-template-by-error-field.json')
  },
  {
    folder: 'get challengeTimelineTemplate - id'
  },
  {
    folder: 'get challengeTimelineTemplate - all'
  },
  {
    folder: 'get challengeTimelineTemplate - not found'
  },
  {
    folder: 'fully update challengeTimelineTemplate by admin',
    iterationData: require('./testData/challenge-timeline-template/fully-update-challenge-timeline-template-by-admin.json')
  },
  {
    folder: 'fully update challengeTimelineTemplate by invalid token',
    iterationData: require('./testData/challenge-timeline-template/fully-update-challenge-timeline-template-by-invalid-token.json')
  },
  {
    folder: 'fully update challengeTimelineTemplate by error field',
    iterationData: require('./testData/challenge-timeline-template/fully-update-challenge-timeline-template-by-error-field.json')
  },
  {
    folder: 'fully update challengeTimelineTemplate by not foundId'
  },
  {
    folder: 'delete challengeTimelineTemplate - id'
  },
  {
    folder: 'delete challengeTimelineTemplate - invalid token',
    iterationData: require('./testData/challenge-timeline-template/delete-challenge-timeline-template-by-invalid-token.json')
  },
  {
    folder: 'delete challengeTimelineTemplate - not found'
  }
]

const auditLogRequests = [
  {
    folder: 'get auditLog - all'
  }
]

const healthRequests = [
  {
    folder: 'check health'
  }
]

const requests = [
  ...challengeTypeRequests,
  ...challengeTrackRequests,
  ...challengePhaseRequests,
  ...timelineTemplateRequests,
  ...challengeTimelineTemplateRequests,
  ...auditLogRequests,
  ...healthRequests
]

const options = {
  collection: require('./Challenge-API.postman_collection.json'),
  exportEnvironment: 'test/postman/Challenge-API.postman_environment.json',
  reporters: 'cli'
}

const runner = (options) => new Promise((resolve, reject) => {
  newman.run(options, function (err, results) {
    if (err) {
      reject(err)
      return
    }
    resolve(results)
  })
})

;(async () => {
  for (const request of requests) {
    delete require.cache[require.resolve('./Challenge-API.postman_environment.json')]
    options.environment = require('./Challenge-API.postman_environment.json')
    options.folder = request.folder
    options.iterationData = request.iterationData
    try {
      const results = await runner(options)
      if (_.get(results, 'run.failures.length', 0) > 0) {
        process.exit(-1)
      }
    } catch (err) {
      console.log(err)
    }
  }
})().then(() => {
  console.log('newman test completed!')
  process.exit(0)
}).catch((err) => {
  console.log(err)
  process.exit(1)
})
