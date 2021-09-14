const config = require('config')
const apiTestLib = require('tc-api-testing-lib')
const logger = require('../../src/common/logger')
const helper = require('../../src/common/helper')

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
    folder: 'create challengeType by invalid bearer format',
    iterationData: require('./testData/challenge-type/create-challenge-type-by-invalid-bearer-format.json')
  },
  {
    folder: 'create challengeType by error field',
    iterationData: require('./testData/challenge-type/create-challenge-type-by-error-field.json')
  },
  {
    folder: 'create challengeType by invalid field 1',
    iterationData: require('./testData/challenge-type/create-challenge-type-by-invalid-field-1.json')
  },
  {
    folder: 'create challengeType by invalid field 2',
    iterationData: require('./testData/challenge-type/create-challenge-type-by-invalid-field-2.json')
  },
  {
    folder: 'create challengeType by invalid field 3',
    iterationData: require('./testData/challenge-type/create-challenge-type-by-invalid-field-3.json')
  },
  {
    folder: 'create challengeType by invalid field 4',
    iterationData: require('./testData/challenge-type/create-challenge-type-by-invalid-field-4.json')
  },
  {
    folder: 'create challengeType by missing field 1',
    iterationData: require('./testData/challenge-type/create-challenge-type-by-missing-field-1.json')
  },
  {
    folder: 'create challengeType by missing field 2',
    iterationData: require('./testData/challenge-type/create-challenge-type-by-missing-field-2.json')
  },
  {
    folder: 'create challengeType by missing field 3',
    iterationData: require('./testData/challenge-type/create-challenge-type-by-missing-field-3.json')
  },
  {
    folder: 'create challengeType by unexpected field',
    iterationData: require('./testData/challenge-type/create-challenge-type-by-unexpected-field.json')
  },
  {
    folder: 'get challengeType - id',
    iterationData: require('./testData/challenge-type/get-challenge-type-id.json')
  },
  {
    folder: 'get challengeType - all',
    iterationData: require('./testData/challenge-type/get-challenge-type-all.json')
  },
  {
    folder: 'get challengeType by invalid id',
    iterationData: require('./testData/challenge-type/get-challenge-type-by-invalid-id.json')
  },
  {
    folder: 'search challengeType successfully 1',
    iterationData: require('./testData/challenge-type/search-challenge-type-successfully-1.json')
  },
  {
    folder: 'search challengeType successfully 2',
    iterationData: require('./testData/challenge-type/search-challenge-type-successfully-2.json')
  },
  {
    folder: 'search challengeType by invalid parameter',
    iterationData: require('./testData/challenge-type/search-challenge-type-by-invalid-parameter.json')
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
    folder: 'fully update challengeType by invalid bearer format',
    iterationData: require('./testData/challenge-type/fully-update-challenge-type-by-invalid-bearer-format.json')
  },
  {
    folder: 'fully update challengeType by invalid Id',
    iterationData: require('./testData/challenge-type/fully-update-challenge-type-by-invalid-id.json')
  },
  {
    folder: 'fully update challengeType by error field',
    iterationData: require('./testData/challenge-type/fully-update-challenge-type-by-error-field.json')
  },
  {
    folder: 'fully update challengeType by invalid field 1',
    iterationData: require('./testData/challenge-type/fully-update-challenge-type-by-invalid-field-1.json')
  },
  {
    folder: 'fully update challengeType by invalid field 2',
    iterationData: require('./testData/challenge-type/fully-update-challenge-type-by-invalid-field-2.json')
  },
  {
    folder: 'fully update challengeType by invalid field 3',
    iterationData: require('./testData/challenge-type/fully-update-challenge-type-by-invalid-field-3.json')
  },
  {
    folder: 'fully update challengeType by invalid field 4',
    iterationData: require('./testData/challenge-type/fully-update-challenge-type-by-invalid-field-4.json')
  },
  {
    folder: 'fully update challengeType by missing field 1',
    iterationData: require('./testData/challenge-type/fully-update-challenge-type-by-missing-field-1.json')
  },
  {
    folder: 'fully update challengeType by missing field 2',
    iterationData: require('./testData/challenge-type/fully-update-challenge-type-by-missing-field-2.json')
  },
  {
    folder: 'fully update challengeType by missing field 3',
    iterationData: require('./testData/challenge-type/fully-update-challenge-type-by-missing-field-3.json')
  },
  {
    folder: 'fully update challengeType by unexpected field',
    iterationData: require('./testData/challenge-type/fully-update-challenge-type-by-unexpected-field.json')
  },
  {
    folder: 'partially update challengeType by admin 1',
    iterationData: require('./testData/challenge-type/partially-update-challenge-type-by-admin-1.json')
  },
  {
    folder: 'partially update challengeType by admin 2',
    iterationData: require('./testData/challenge-type/partially-update-challenge-type-by-admin-2.json')
  },
  {
    folder: 'partially update challengeType by admin 3',
    iterationData: require('./testData/challenge-type/partially-update-challenge-type-by-admin-3.json')
  },
  {
    folder: 'partially update challengeType by admin 4',
    iterationData: require('./testData/challenge-type/partially-update-challenge-type-by-admin-4.json')
  },
  {
    folder: 'partially update challengeType by admin 5',
    iterationData: require('./testData/challenge-type/partially-update-challenge-type-by-admin-5.json')
  },
  {
    folder: 'partially update challengeType by admin 6',
    iterationData: require('./testData/challenge-type/partially-update-challenge-type-by-admin-6.json')
  },
  {
    folder: 'partially update challengeType by invalid token',
    iterationData: require('./testData/challenge-type/partially-update-challenge-type-by-invalid-token.json')
  },
  {
    folder: 'partially update challengeType by invalid bearer format',
    iterationData: require('./testData/challenge-type/partially-update-challenge-type-by-invalid-bearer-format.json')
  },
  {
    folder: 'partially update challengeType by invalid Id',
    iterationData: require('./testData/challenge-type/partially-update-challenge-type-by-invalid-id.json')
  },
  {
    folder: 'partially update challengeType by error field',
    iterationData: require('./testData/challenge-type/partially-update-challenge-type-by-error-field.json')
  },
  {
    folder: 'partially update challengeType by invalid field 1',
    iterationData: require('./testData/challenge-type/partially-update-challenge-type-by-invalid-field-1.json')
  },
  {
    folder: 'partially update challengeType by invalid field 2',
    iterationData: require('./testData/challenge-type/partially-update-challenge-type-by-invalid-field-2.json')
  },
  {
    folder: 'partially update challengeType by invalid field 3',
    iterationData: require('./testData/challenge-type/partially-update-challenge-type-by-invalid-field-3.json')
  },
  {
    folder: 'partially update challengeType by invalid field 4',
    iterationData: require('./testData/challenge-type/partially-update-challenge-type-by-invalid-field-4.json')
  },
  {
    folder: 'partially update challengeType by unexpected field',
    iterationData: require('./testData/challenge-type/partially-update-challenge-type-by-unexpected-field.json')
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
    folder: 'create challengeTrack by invalid bearer format',
    iterationData: require('./testData/challenge-track/create-challenge-track-by-invalid-bearer-format.json')
  },
  {
    folder: 'create challengeTrack by error field',
    iterationData: require('./testData/challenge-track/create-challenge-track-by-error-field.json')
  },
  {
    folder: 'create challengeTrack by invalid field 1',
    iterationData: require('./testData/challenge-track/create-challenge-track-by-invalid-field-1.json')
  },
  {
    folder: 'create challengeTrack by invalid field 2',
    iterationData: require('./testData/challenge-track/create-challenge-track-by-invalid-field-2.json')
  },
  {
    folder: 'create challengeTrack by invalid field 3',
    iterationData: require('./testData/challenge-track/create-challenge-track-by-invalid-field-3.json')
  },
  {
    folder: 'create challengeTrack by invalid field 4',
    iterationData: require('./testData/challenge-track/create-challenge-track-by-invalid-field-4.json')
  },
  {
    folder: 'create challengeTrack by invalid field 5',
    iterationData: require('./testData/challenge-track/create-challenge-track-by-invalid-field-5.json')
  },
  {
    folder: 'create challengeTrack by missing field 1',
    iterationData: require('./testData/challenge-track/create-challenge-track-by-missing-field-1.json')
  },
  {
    folder: 'create challengeTrack by missing field 2',
    iterationData: require('./testData/challenge-track/create-challenge-track-by-missing-field-2.json')
  },
  {
    folder: 'create challengeTrack by missing field 3',
    iterationData: require('./testData/challenge-track/create-challenge-track-by-missing-field-3.json')
  },
  {
    folder: 'create challengeTrack by unexpected field',
    iterationData: require('./testData/challenge-track/create-challenge-track-by-unexpected-field.json')
  },
  {
    folder: 'get challengeTrack - id',
    iterationData: require('./testData/challenge-track/get-challenge-track-id.json')
  },
  {
    folder: 'get challengeTrack - all',
    iterationData: require('./testData/challenge-track/get-challenge-track-all.json')
  },
  {
    folder: 'get challengeTrack by invalid id',
    iterationData: require('./testData/challenge-track/get-challenge-track-by-invalid-id.json')
  },
  {
    folder: 'search challengeTrack successfully 1',
    iterationData: require('./testData/challenge-track/search-challenge-track-successfully-1.json')
  },
  {
    folder: 'search challengeTrack successfully 2',
    iterationData: require('./testData/challenge-track/search-challenge-track-successfully-2.json')
  },
  {
    folder: 'search challengeTrack by invalid parameter',
    iterationData: require('./testData/challenge-track/search-challenge-track-by-invalid-parameter.json')
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
    folder: 'fully update challengeTrack by invalid bearer format',
    iterationData: require('./testData/challenge-track/fully-update-challenge-track-by-invalid-bearer-format.json')
  },
  {
    folder: 'fully update challengeTrack by invalid Id',
    iterationData: require('./testData/challenge-track/fully-update-challenge-track-by-invalid-id.json')
  },
  {
    folder: 'fully update challengeTrack by error field',
    iterationData: require('./testData/challenge-track/fully-update-challenge-track-by-error-field.json')
  },
  {
    folder: 'fully update challengeTrack by invalid field 1',
    iterationData: require('./testData/challenge-track/fully-update-challenge-track-by-invalid-field-1.json')
  },
  {
    folder: 'fully update challengeTrack by invalid field 2',
    iterationData: require('./testData/challenge-track/fully-update-challenge-track-by-invalid-field-2.json')
  },
  {
    folder: 'fully update challengeTrack by invalid field 3',
    iterationData: require('./testData/challenge-track/fully-update-challenge-track-by-invalid-field-3.json')
  },
  {
    folder: 'fully update challengeTrack by invalid field 4',
    iterationData: require('./testData/challenge-track/fully-update-challenge-track-by-invalid-field-4.json')
  },
  {
    folder: 'fully update challengeTrack by invalid field 5',
    iterationData: require('./testData/challenge-track/fully-update-challenge-track-by-invalid-field-5.json')
  },
  {
    folder: 'fully update challengeTrack by missing field 1',
    iterationData: require('./testData/challenge-track/fully-update-challenge-track-by-missing-field-1.json')
  },
  {
    folder: 'fully update challengeTrack by missing field 2',
    iterationData: require('./testData/challenge-track/fully-update-challenge-track-by-missing-field-2.json')
  },
  {
    folder: 'fully update challengeTrack by missing field 3',
    iterationData: require('./testData/challenge-track/fully-update-challenge-track-by-missing-field-3.json')
  },
  {
    folder: 'fully update challengeTrack by unexpected field',
    iterationData: require('./testData/challenge-track/fully-update-challenge-track-by-unexpected-field.json')
  },
  {
    folder: 'partially update challengeTrack by admin 1',
    iterationData: require('./testData/challenge-track/partially-update-challenge-track-by-admin-1.json')
  },
  {
    folder: 'partially update challengeTrack by admin 2',
    iterationData: require('./testData/challenge-track/partially-update-challenge-track-by-admin-2.json')
  },
  {
    folder: 'partially update challengeTrack by admin 3',
    iterationData: require('./testData/challenge-track/partially-update-challenge-track-by-admin-3.json')
  },
  {
    folder: 'partially update challengeTrack by admin 4',
    iterationData: require('./testData/challenge-track/partially-update-challenge-track-by-admin-4.json')
  },
  {
    folder: 'partially update challengeTrack by admin 5',
    iterationData: require('./testData/challenge-track/partially-update-challenge-track-by-admin-5.json')
  },
  {
    folder: 'partially update challengeTrack by invalid token',
    iterationData: require('./testData/challenge-track/partially-update-challenge-track-by-invalid-token.json')
  },
  {
    folder: 'partially update challengeTrack by invalid bearer format',
    iterationData: require('./testData/challenge-track/partially-update-challenge-track-by-invalid-bearer-format.json')
  },
  {
    folder: 'partially update challengeTrack by invalid Id',
    iterationData: require('./testData/challenge-track/partially-update-challenge-track-by-invalid-id.json')
  },
  {
    folder: 'partially update challengeTrack by error field',
    iterationData: require('./testData/challenge-track/partially-update-challenge-track-by-error-field.json')
  },
  {
    folder: 'partially update challengeTrack by invalid field 1',
    iterationData: require('./testData/challenge-track/partially-update-challenge-track-by-invalid-field-1.json')
  },
  {
    folder: 'partially update challengeTrack by invalid field 2',
    iterationData: require('./testData/challenge-track/partially-update-challenge-track-by-invalid-field-2.json')
  },
  {
    folder: 'partially update challengeTrack by invalid field 3',
    iterationData: require('./testData/challenge-track/partially-update-challenge-track-by-invalid-field-3.json')
  },
  {
    folder: 'partially update challengeTrack by invalid field 4',
    iterationData: require('./testData/challenge-track/partially-update-challenge-track-by-invalid-field-4.json')
  },
  {
    folder: 'partially update challengeTrack by invalid field 5',
    iterationData: require('./testData/challenge-track/partially-update-challenge-track-by-invalid-field-5.json')
  },
  {
    folder: 'partially update challengeTrack by unexpected field',
    iterationData: require('./testData/challenge-track/partially-update-challenge-track-by-unexpected-field.json')
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
    folder: 'create challengePhase by invalid bearer format',
    iterationData: require('./testData/challenge-phase/create-challenge-phase-by-invalid-bearer-format.json')
  },
  {
    folder: 'create challengePhase by error field',
    iterationData: require('./testData/challenge-phase/create-challenge-phase-by-error-field.json')
  },
  {
    folder: 'create challengePhase by invalid field 1',
    iterationData: require('./testData/challenge-phase/create-challenge-phase-by-invalid-field-1.json')
  },
  {
    folder: 'create challengePhase by invalid field 2',
    iterationData: require('./testData/challenge-phase/create-challenge-phase-by-invalid-field-2.json')
  },
  {
    folder: 'create challengePhase by invalid field 3',
    iterationData: require('./testData/challenge-phase/create-challenge-phase-by-invalid-field-3.json')
  },
  {
    folder: 'create challengePhase by missing field 1',
    iterationData: require('./testData/challenge-phase/create-challenge-phase-by-missing-field-1.json')
  },
  {
    folder: 'create challengePhase by missing field 2',
    iterationData: require('./testData/challenge-phase/create-challenge-phase-by-missing-field-2.json')
  },
  {
    folder: 'create challengePhase by missing field 3',
    iterationData: require('./testData/challenge-phase/create-challenge-phase-by-missing-field-3.json')
  },
  {
    folder: 'create challengePhase by unexpected field',
    iterationData: require('./testData/challenge-phase/create-challenge-phase-by-unexpected-field.json')
  },
  {
    folder: 'get challengePhase - id',
    iterationData: require('./testData/challenge-phase/get-challenge-phase-id.json')
  },
  {
    folder: 'get challengePhase by invalid id',
    iterationData: require('./testData/challenge-phase/get-challenge-phase-by-invalid-id.json')
  },
  {
    folder: 'get challengePhase by invalid token',
    iterationData: require('./testData/challenge-phase/get-challenge-phase-by-invalid-token.json')
  },
  {
    folder: 'get challengePhase - all',
    iterationData: require('./testData/challenge-phase/get-challenge-phase-all.json')
  },
  {
    folder: 'search challengePhase successfully 1',
    iterationData: require('./testData/challenge-phase/search-challenge-phase-successfully-1.json')
  },
  {
    folder: 'search challengePhase successfully 2',
    iterationData: require('./testData/challenge-phase/search-challenge-phase-successfully-2.json')
  },
  {
    folder: 'search challengePhase by invalid parameter',
    iterationData: require('./testData/challenge-phase/search-challenge-phase-by-invalid-parameter.json')
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
    folder: 'fully update challengePhase by invalid bearer format',
    iterationData: require('./testData/challenge-phase/fully-update-challenge-phase-by-invalid-bearer-format.json')
  },
  {
    folder: 'fully update challengePhase by invalid Id',
    iterationData: require('./testData/challenge-phase/fully-update-challenge-phase-by-invalid-id.json')
  },
  {
    folder: 'fully update challengePhase by error field',
    iterationData: require('./testData/challenge-phase/fully-update-challenge-phase-by-error-field.json')
  },
  {
    folder: 'fully update challengePhase by invalid field 1',
    iterationData: require('./testData/challenge-phase/fully-update-challenge-phase-by-invalid-field-1.json')
  },
  {
    folder: 'fully update challengePhase by invalid field 2',
    iterationData: require('./testData/challenge-phase/fully-update-challenge-phase-by-invalid-field-2.json')
  },
  {
    folder: 'fully update challengePhase by invalid field 3',
    iterationData: require('./testData/challenge-phase/fully-update-challenge-phase-by-invalid-field-3.json')
  },
  {
    folder: 'fully update challengePhase by missing field 1',
    iterationData: require('./testData/challenge-phase/fully-update-challenge-phase-by-missing-field-1.json')
  },
  {
    folder: 'fully update challengePhase by missing field 2',
    iterationData: require('./testData/challenge-phase/fully-update-challenge-phase-by-missing-field-2.json')
  },
  {
    folder: 'fully update challengePhase by missing field 3',
    iterationData: require('./testData/challenge-phase/fully-update-challenge-phase-by-missing-field-3.json')
  },
  {
    folder: 'fully update challengePhase by unexpected field',
    iterationData: require('./testData/challenge-phase/fully-update-challenge-phase-by-unexpected-field.json')
  },
  {
    folder: 'partially update challengePhase by admin 1',
    iterationData: require('./testData/challenge-phase/partially-update-challenge-phase-by-admin-1.json')
  },
  {
    folder: 'partially update challengePhase by admin 2',
    iterationData: require('./testData/challenge-phase/partially-update-challenge-phase-by-admin-2.json')
  },
  {
    folder: 'partially update challengePhase by admin 3',
    iterationData: require('./testData/challenge-phase/partially-update-challenge-phase-by-admin-3.json')
  },
  {
    folder: 'partially update challengePhase by admin 4',
    iterationData: require('./testData/challenge-phase/partially-update-challenge-phase-by-admin-4.json')
  },
  {
    folder: 'partially update challengePhase by admin 5',
    iterationData: require('./testData/challenge-phase/partially-update-challenge-phase-by-admin-5.json')
  },
  {
    folder: 'partially update challengePhase by invalid token',
    iterationData: require('./testData/challenge-phase/partially-update-challenge-phase-by-invalid-token.json')
  },
  {
    folder: 'partially update challengePhase by invalid bearer format',
    iterationData: require('./testData/challenge-phase/partially-update-challenge-phase-by-invalid-bearer-format.json')
  },
  {
    folder: 'partially update challengePhase by invalid Id',
    iterationData: require('./testData/challenge-phase/partially-update-challenge-phase-by-invalid-id.json')
  },
  {
    folder: 'partially update challengePhase by error field',
    iterationData: require('./testData/challenge-phase/partially-update-challenge-phase-by-error-field.json')
  },
  {
    folder: 'partially update challengePhase by invalid field 1',
    iterationData: require('./testData/challenge-phase/partially-update-challenge-phase-by-invalid-field-1.json')
  },
  {
    folder: 'partially update challengePhase by invalid field 2',
    iterationData: require('./testData/challenge-phase/partially-update-challenge-phase-by-invalid-field-2.json')
  },
  {
    folder: 'partially update challengePhase by invalid field 3',
    iterationData: require('./testData/challenge-phase/partially-update-challenge-phase-by-invalid-field-3.json')
  },
  {
    folder: 'partially update challengePhase by unexpected field',
    iterationData: require('./testData/challenge-phase/partially-update-challenge-phase-by-unexpected-field.json')
  },
  {
    folder: 'delete challengePhase - id',
    iterationData: require('./testData/challenge-phase/delete-challenge-phase-id.json')
  },
  {
    folder: 'delete challengePhase by invalid Id',
    iterationData: require('./testData/challenge-phase/delete-challenge-phase-by-invalid-id.json')
  },
  {
    folder: 'delete challengePhase by invalid token',
    iterationData: require('./testData/challenge-phase/delete-challenge-phase-by-invalid-token.json')
  },
  {
    folder: 'delete challengePhase by invalid bearer format',
    iterationData: require('./testData/challenge-phase/delete-challenge-phase-by-invalid-bearer-format.json')
  }
]

const timelineTemplateRequests = [
  {
    folder: 'create timelineTemplate by admin 1',
    iterationData: require('./testData/timeline-template/create-timeline-template-by-admin-1.json')
  },
  {
    folder: 'create timelineTemplate by admin 2',
    iterationData: require('./testData/timeline-template/create-timeline-template-by-admin-2.json')
  },
  {
    folder: 'create timelineTemplate by invalid token',
    iterationData: require('./testData/timeline-template/create-timeline-template-by-invalid-token.json')
  },
  {
    folder: 'create timelineTemplate by invalid bearer format',
    iterationData: require('./testData/timeline-template/create-timeline-template-by-invalid-bearer-format.json')
  },
  {
    folder: 'create timelineTemplate by error field 1',
    iterationData: require('./testData/timeline-template/create-timeline-template-by-error-field-1.json')
  },
  {
    folder: 'create timelineTemplate by error field 2',
    iterationData: require('./testData/timeline-template/create-timeline-template-by-error-field-2.json')
  },
  {
    folder: 'create timelineTemplate by invalid field 1',
    iterationData: require('./testData/timeline-template/create-timeline-template-by-invalid-field-1.json')
  },
  {
    folder: 'create timelineTemplate by invalid field 2',
    iterationData: require('./testData/timeline-template/create-timeline-template-by-invalid-field-2.json')
  },
  {
    folder: 'create timelineTemplate by invalid field 3',
    iterationData: require('./testData/timeline-template/create-timeline-template-by-invalid-field-3.json')
  },
  {
    folder: 'create timelineTemplate by invalid field 4',
    iterationData: require('./testData/timeline-template/create-timeline-template-by-invalid-field-4.json')
  },
  {
    folder: 'create timelineTemplate by missing field 1',
    iterationData: require('./testData/timeline-template/create-timeline-template-by-missing-field-1.json')
  },
  {
    folder: 'create timelineTemplate by missing field 2',
    iterationData: require('./testData/timeline-template/create-timeline-template-by-missing-field-2.json')
  },
  {
    folder: 'create timelineTemplate by missing field 3',
    iterationData: require('./testData/timeline-template/create-timeline-template-by-missing-field-3.json')
  },
  {
    folder: 'create timelineTemplate by unexpected field',
    iterationData: require('./testData/timeline-template/create-timeline-template-by-unexpected-field.json')
  },
  {
    folder: 'get timelineTemplate - id',
    iterationData: require('./testData/timeline-template/get-timeline-template-id.json')
  },
  {
    folder: 'get timelineTemplate by invalid id',
    iterationData: require('./testData/timeline-template/get-timeline-template-by-invalid-id.json')
  },
  {
    folder: 'get timelineTemplate by invalid token',
    iterationData: require('./testData/timeline-template/get-timeline-template-by-invalid-token.json')
  },
  {
    folder: 'get timelineTemplate - all',
    iterationData: require('./testData/timeline-template/get-timeline-template-all.json')
  },
  {
    folder: 'search timelineTemplate successfully 1',
    iterationData: require('./testData/timeline-template/search-timeline-template-successfully-1.json')
  },
  {
    folder: 'search timelineTemplate successfully 2',
    iterationData: require('./testData/timeline-template/search-timeline-template-successfully-2.json')
  },
  {
    folder: 'search timelineTemplate by invalid parameter',
    iterationData: require('./testData/timeline-template/search-timeline-template-by-invalid-parameter.json')
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
    folder: 'fully update timelineTemplate by invalid bearer format',
    iterationData: require('./testData/timeline-template/fully-update-timeline-template-by-invalid-bearer-format.json')
  },
  {
    folder: 'fully update timelineTemplate by invalid Id',
    iterationData: require('./testData/timeline-template/fully-update-timeline-template-by-invalid-id.json')
  },
  {
    folder: 'fully update timelineTemplate by error field 1',
    iterationData: require('./testData/timeline-template/fully-update-timeline-template-by-error-field-1.json')
  },
  {
    folder: 'fully update timelineTemplate by error field 2',
    iterationData: require('./testData/timeline-template/fully-update-timeline-template-by-error-field-2.json')
  },
  {
    folder: 'fully update timelineTemplate by invalid field 1',
    iterationData: require('./testData/timeline-template/fully-update-timeline-template-by-invalid-field-1.json')
  },
  {
    folder: 'fully update timelineTemplate by invalid field 2',
    iterationData: require('./testData/timeline-template/fully-update-timeline-template-by-invalid-field-2.json')
  },
  {
    folder: 'fully update timelineTemplate by invalid field 3',
    iterationData: require('./testData/timeline-template/fully-update-timeline-template-by-invalid-field-3.json')
  },
  {
    folder: 'fully update timelineTemplate by invalid field 4',
    iterationData: require('./testData/timeline-template/fully-update-timeline-template-by-invalid-field-4.json')
  },
  {
    folder: 'fully update timelineTemplate by missing field 1',
    iterationData: require('./testData/timeline-template/fully-update-timeline-template-by-missing-field-1.json')
  },
  {
    folder: 'fully update timelineTemplate by missing field 2',
    iterationData: require('./testData/timeline-template/fully-update-timeline-template-by-missing-field-2.json')
  },
  {
    folder: 'fully update timelineTemplate by missing field 3',
    iterationData: require('./testData/timeline-template/fully-update-timeline-template-by-missing-field-3.json')
  },
  {
    folder: 'fully update timelineTemplate by unexpected field',
    iterationData: require('./testData/timeline-template/fully-update-timeline-template-by-unexpected-field.json')
  },
  {
    folder: 'partially update timelineTemplate by admin 1',
    iterationData: require('./testData/timeline-template/partially-update-timeline-template-by-admin-1.json')
  },
  {
    folder: 'partially update timelineTemplate by admin 2',
    iterationData: require('./testData/timeline-template/partially-update-timeline-template-by-admin-2.json')
  },
  {
    folder: 'partially update timelineTemplate by admin 3',
    iterationData: require('./testData/timeline-template/partially-update-timeline-template-by-admin-3.json')
  },
  {
    folder: 'partially update timelineTemplate by admin 4',
    iterationData: require('./testData/timeline-template/partially-update-timeline-template-by-admin-4.json')
  },
  {
    folder: 'partially update timelineTemplate by admin 5',
    iterationData: require('./testData/timeline-template/partially-update-timeline-template-by-admin-5.json')
  },
  {
    folder: 'partially update timelineTemplate by invalid token',
    iterationData: require('./testData/timeline-template/partially-update-timeline-template-by-invalid-token.json')
  },
  {
    folder: 'partially update timelineTemplate by invalid bearer format',
    iterationData: require('./testData/timeline-template/partially-update-timeline-template-by-invalid-bearer-format.json')
  },
  {
    folder: 'partially update timelineTemplate by invalid Id',
    iterationData: require('./testData/timeline-template/partially-update-timeline-template-by-invalid-id.json')
  },
  {
    folder: 'partially update timelineTemplate by error field 1',
    iterationData: require('./testData/timeline-template/partially-update-timeline-template-by-error-field-1.json')
  },
  {
    folder: 'partially update timelineTemplate by error field 2',
    iterationData: require('./testData/timeline-template/partially-update-timeline-template-by-error-field-2.json')
  },
  {
    folder: 'partially update timelineTemplate by invalid field 1',
    iterationData: require('./testData/timeline-template/partially-update-timeline-template-by-invalid-field-1.json')
  },
  {
    folder: 'partially update timelineTemplate by invalid field 2',
    iterationData: require('./testData/timeline-template/partially-update-timeline-template-by-invalid-field-2.json')
  },
  {
    folder: 'partially update timelineTemplate by invalid field 3',
    iterationData: require('./testData/timeline-template/partially-update-timeline-template-by-invalid-field-3.json')
  },
  {
    folder: 'partially update timelineTemplate by invalid field 4',
    iterationData: require('./testData/timeline-template/partially-update-timeline-template-by-invalid-field-4.json')
  },
  {
    folder: 'partially update timelineTemplate by unexpected field',
    iterationData: require('./testData/timeline-template/partially-update-timeline-template-by-unexpected-field.json')
  },
  {
    folder: 'delete timelineTemplate - id',
    iterationData: require('./testData/timeline-template/delete-timeline-template-id.json')
  },
  {
    folder: 'delete timelineTemplate by invalid Id',
    iterationData: require('./testData/timeline-template/delete-timeline-template-by-invalid-id.json')
  },
  {
    folder: 'delete timelineTemplate by invalid token',
    iterationData: require('./testData/timeline-template/delete-timeline-template-by-invalid-token.json')
  },
  {
    folder: 'delete timelineTemplate by invalid bearer format',
    iterationData: require('./testData/timeline-template/delete-timeline-template-by-invalid-bearer-format.json')
  }
]

const challengeTimelineTemplateRequests = [
  {
    folder: 'create challengeTimelineTemplate by admin 1',
    iterationData: require('./testData/challenge-timeline-template/create-challenge-timeline-template-by-admin-1.json')
  },
  {
    folder: 'create challengeTimelineTemplate by admin 2',
    iterationData: require('./testData/challenge-timeline-template/create-challenge-timeline-template-by-admin-2.json')
  },
  {
    folder: 'create challengeTimelineTemplate by invalid token',
    iterationData: require('./testData/challenge-timeline-template/create-challenge-timeline-template-by-invalid-token.json')
  },
  {
    folder: 'create challengeTimelineTemplate by invalid bearer format',
    iterationData: require('./testData/challenge-timeline-template/create-challenge-timeline-template-by-invalid-bearer-format.json')
  },
  {
    folder: 'create challengeTimelineTemplate by error field 1',
    iterationData: require('./testData/challenge-timeline-template/create-challenge-timeline-template-by-error-field-1.json')
  },
  {
    folder: 'create challengeTimelineTemplate by error field 2',
    iterationData: require('./testData/challenge-timeline-template/create-challenge-timeline-template-by-error-field-2.json')
  },
  {
    folder: 'create challengeTimelineTemplate by error field 3',
    iterationData: require('./testData/challenge-timeline-template/create-challenge-timeline-template-by-error-field-3.json')
  },
  {
    folder: 'create challengeTimelineTemplate by error field 4',
    iterationData: require('./testData/challenge-timeline-template/create-challenge-timeline-template-by-error-field-4.json')
  },
  {
    folder: 'create challengeTimelineTemplate by invalid field',
    iterationData: require('./testData/challenge-timeline-template/create-challenge-timeline-template-by-invalid-field.json')
  },
  {
    folder: 'create challengeTimelineTemplate by missing field 1',
    iterationData: require('./testData/challenge-timeline-template/create-challenge-timeline-template-by-missing-field-1.json')
  },
  {
    folder: 'create challengeTimelineTemplate by missing field 2',
    iterationData: require('./testData/challenge-timeline-template/create-challenge-timeline-template-by-missing-field-2.json')
  },
  {
    folder: 'create challengeTimelineTemplate by missing field 3',
    iterationData: require('./testData/challenge-timeline-template/create-challenge-timeline-template-by-missing-field-3.json')
  },
  {
    folder: 'create challengeTimelineTemplate by missing field 4',
    iterationData: require('./testData/challenge-timeline-template/create-challenge-timeline-template-by-missing-field-4.json')
  },
  {
    folder: 'create challengeTimelineTemplate by unexpected field',
    iterationData: require('./testData/challenge-timeline-template/create-challenge-timeline-template-by-unexpected-field.json')
  },
  {
    folder: 'get challengeTimelineTemplate - id',
    iterationData: require('./testData/challenge-timeline-template/get-challenge-timeline-template-id.json')
  },
  {
    folder: 'get challengeTimelineTemplate by invalid id',
    iterationData: require('./testData/challenge-timeline-template/get-challenge-timeline-template-by-invalid-id.json')
  },
  {
    folder: 'get challengeTimelineTemplate - all',
    iterationData: require('./testData/challenge-timeline-template/get-challenge-timeline-template-all.json')
  },
  {
    folder: 'search challengeTimelineTemplate successfully 1',
    iterationData: require('./testData/challenge-timeline-template/search-challenge-timeline-template-successfully-1.json')
  },
  {
    folder: 'search challengeTimelineTemplate successfully 2',
    iterationData: require('./testData/challenge-timeline-template/search-challenge-timeline-template-successfully-2.json')
  },
  {
    folder: 'search challengeTimelineTemplate successfully 3',
    iterationData: require('./testData/challenge-timeline-template/search-challenge-timeline-template-successfully-3.json')
  },
  {
    folder: 'search challengeTimelineTemplate successfully 4',
    iterationData: require('./testData/challenge-timeline-template/search-challenge-timeline-template-successfully-4.json')
  },
  {
    folder: 'search challengeTimelineTemplate successfully 5',
    iterationData: require('./testData/challenge-timeline-template/search-challenge-timeline-template-successfully-5.json')
  },
  {
    folder: 'search challengeTimelineTemplate by invalid parameter',
    iterationData: require('./testData/challenge-timeline-template/search-challenge-timeline-template-by-invalid-parameter.json')
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
    folder: 'fully update challengeTimelineTemplate by invalid bearer format',
    iterationData: require('./testData/challenge-timeline-template/fully-update-challenge-timeline-template-by-invalid-bearer-format.json')
  },
  {
    folder: 'fully update challengeTimelineTemplate by invalid Id',
    iterationData: require('./testData/challenge-timeline-template/fully-update-challenge-timeline-template-by-invalid-id.json')
  },
  {
    folder: 'fully update challengeTimelineTemplate by error field 1',
    iterationData: require('./testData/challenge-timeline-template/fully-update-challenge-timeline-template-by-error-field-1.json')
  },
  {
    folder: 'fully update challengeTimelineTemplate by error field 2',
    iterationData: require('./testData/challenge-timeline-template/fully-update-challenge-timeline-template-by-error-field-2.json')
  },
  {
    folder: 'fully update challengeTimelineTemplate by error field 3',
    iterationData: require('./testData/challenge-timeline-template/fully-update-challenge-timeline-template-by-error-field-3.json')
  },
  {
    folder: 'fully update challengeTimelineTemplate by error field 4',
    iterationData: require('./testData/challenge-timeline-template/fully-update-challenge-timeline-template-by-error-field-4.json')
  },
  {
    folder: 'fully update challengeTimelineTemplate by invalid field',
    iterationData: require('./testData/challenge-timeline-template/fully-update-challenge-timeline-template-by-invalid-field.json')
  },
  {
    folder: 'fully update challengeTimelineTemplate by missing field 1',
    iterationData: require('./testData/challenge-timeline-template/fully-update-challenge-timeline-template-by-missing-field-1.json')
  },
  {
    folder: 'fully update challengeTimelineTemplate by missing field 2',
    iterationData: require('./testData/challenge-timeline-template/fully-update-challenge-timeline-template-by-missing-field-2.json')
  },
  {
    folder: 'fully update challengeTimelineTemplate by missing field 3',
    iterationData: require('./testData/challenge-timeline-template/fully-update-challenge-timeline-template-by-missing-field-3.json')
  },
  {
    folder: 'fully update challengeTimelineTemplate by missing field 4',
    iterationData: require('./testData/challenge-timeline-template/fully-update-challenge-timeline-template-by-missing-field-4.json')
  },
  {
    folder: 'fully update challengeTimelineTemplate by unexpected field',
    iterationData: require('./testData/challenge-timeline-template/fully-update-challenge-timeline-template-by-unexpected-field.json')
  },
  {
    folder: 'delete challengeTimelineTemplate - id',
    iterationData: require('./testData/challenge-timeline-template/delete-challenge-timeline-template-id.json')
  },
  {
    folder: 'delete challengeTimelineTemplate by invalid Id',
    iterationData: require('./testData/challenge-timeline-template/delete-challenge-timeline-template-by-invalid-id.json')
  },
  {
    folder: 'delete challengeTimelineTemplate by invalid token',
    iterationData: require('./testData/challenge-timeline-template/delete-challenge-timeline-template-by-invalid-token.json')
  },
  {
    folder: 'delete challengeTimelineTemplate by invalid bearer format',
    iterationData: require('./testData/challenge-timeline-template/delete-challenge-timeline-template-by-invalid-bearer-format.json')
  }
]

const challengeRequests = [
  {
    folder: 'create challenge successfully 1',
    iterationData: require('./testData/challenge/create-challenge-successfully-1.json')
  },
  {
    folder: 'create challenge successfully 2',
    iterationData: require('./testData/challenge/create-challenge-successfully-2.json')
  },
  {
    folder: 'create challenge successfully 3',
    iterationData: require('./testData/challenge/create-challenge-successfully-3.json')
  },
  {
    folder: 'create challenge successfully 4',
    iterationData: require('./testData/challenge/create-challenge-successfully-4.json')
  },
  {
    folder: 'create challenge by invalid token',
    iterationData: require('./testData/challenge/create-challenge-by-invalid-token.json')
  },
  {
    folder: 'create challenge by invalid bearer format',
    iterationData: require('./testData/challenge/create-challenge-by-invalid-bearer-format.json')
  },
  {
    folder: 'create challenge by error field 1',
    iterationData: require('./testData/challenge/create-challenge-by-error-field-1.json')
  },
  {
    folder: 'create challenge by error field 2',
    iterationData: require('./testData/challenge/create-challenge-by-error-field-2.json')
  },
  {
    folder: 'create challenge by error field 3',
    iterationData: require('./testData/challenge/create-challenge-by-error-field-3.json')
  },
  {
    folder: 'create challenge by error field 4',
    iterationData: require('./testData/challenge/create-challenge-by-error-field-4.json')
  },
  {
    folder: 'create challenge by error field 5',
    iterationData: require('./testData/challenge/create-challenge-by-error-field-5.json')
  },
  {
    folder: 'create challenge by error field 6',
    iterationData: require('./testData/challenge/create-challenge-by-error-field-6.json')
  },
  {
    folder: 'create challenge by error field 7',
    iterationData: require('./testData/challenge/create-challenge-by-error-field-7.json')
  },
  {
    folder: 'create challenge by error field 8',
    iterationData: require('./testData/challenge/create-challenge-by-error-field-8.json')
  },
  {
    folder: 'create challenge by invalid field',
    iterationData: require('./testData/challenge/create-challenge-by-invalid-field.json')
  },
  {
    folder: 'create challenge by missing field 1',
    iterationData: require('./testData/challenge/create-challenge-by-missing-field-1.json')
  },
  {
    folder: 'create challenge by missing field 2',
    iterationData: require('./testData/challenge/create-challenge-by-missing-field-2.json')
  },
  {
    folder: 'create challenge by missing field 3',
    iterationData: require('./testData/challenge/create-challenge-by-missing-field-3.json')
  },
  {
    folder: 'create challenge by missing field 4',
    iterationData: require('./testData/challenge/create-challenge-by-missing-field-4.json')
  },
  {
    folder: 'create challenge by missing field 5',
    iterationData: require('./testData/challenge/create-challenge-by-missing-field-5.json')
  },
  {
    folder: 'create challenge by unexpected field',
    iterationData: require('./testData/challenge/create-challenge-by-unexpected-field.json')
  },
  {
    folder: 'get challenge - id',
    iterationData: require('./testData/challenge/get-challenge-id.json')
  },
  {
    folder: 'get challenge - all',
    iterationData: require('./testData/challenge/get-challenge-all.json')
  },
  {
    folder: 'get challenge - id forbidden',
    iterationData: require('./testData/challenge/get-challenge-id-forbidden.json')
  },
  {
    folder: 'get challenge by invalid id',
    iterationData: require('./testData/challenge/get-challenge-by-invalid-id.json')
  },
  {
    folder: 'search challenge successfully',
    iterationData: require('./testData/challenge/search-challenge-successfully.json')
  },
  {
    folder: 'search challenge by invalid parameter',
    iterationData: require('./testData/challenge/search-challenge-by-invalid-parameter.json')
  },
  {
    folder: 'fully update challenge successfully',
    iterationData: require('./testData/challenge/fully-update-challenge-successfully.json')
  },
  {
    folder: 'fully update challenge by invalid token',
    iterationData: require('./testData/challenge/fully-update-challenge-by-invalid-token.json')
  },
  {
    folder: 'fully update challenge by invalid bearer format',
    iterationData: require('./testData/challenge/fully-update-challenge-by-invalid-bearer-format.json')
  },
  {
    folder: 'fully update challenge by invalid Id',
    iterationData: require('./testData/challenge/fully-update-challenge-by-invalid-id.json')
  },
  {
    folder: 'fully update challenge by error field 1',
    iterationData: require('./testData/challenge/fully-update-challenge-by-error-field-1.json')
  },
  {
    folder: 'fully update challenge by error field 2',
    iterationData: require('./testData/challenge/fully-update-challenge-by-error-field-2.json')
  },
  {
    folder: 'fully update challenge by error field 3',
    iterationData: require('./testData/challenge/fully-update-challenge-by-error-field-3.json')
  },
  {
    folder: 'fully update challenge by error field 4',
    iterationData: require('./testData/challenge/fully-update-challenge-by-error-field-4.json')
  },
  {
    folder: 'fully update challenge by error field 5',
    iterationData: require('./testData/challenge/fully-update-challenge-by-error-field-5.json')
  },
  {
    folder: 'fully update challenge by invalid field',
    iterationData: require('./testData/challenge/fully-update-challenge-by-invalid-field.json')
  },
  {
    folder: 'fully update challenge by missing field 1',
    iterationData: require('./testData/challenge/fully-update-challenge-by-missing-field-1.json')
  },
  {
    folder: 'fully update challenge by missing field 2',
    iterationData: require('./testData/challenge/fully-update-challenge-by-missing-field-2.json')
  },
  {
    folder: 'fully update challenge by missing field 3',
    iterationData: require('./testData/challenge/fully-update-challenge-by-missing-field-3.json')
  },
  {
    folder: 'partially update challenge successfully',
    iterationData: require('./testData/challenge/partially-update-challenge-successfully.json')
  },
  {
    folder: 'partially update challenge by invalid token',
    iterationData: require('./testData/challenge/partially-update-challenge-by-invalid-token.json')
  },
  {
    folder: 'partially update challenge by invalid bearer format',
    iterationData: require('./testData/challenge/partially-update-challenge-by-invalid-bearer-format.json')
  },
  {
    folder: 'partially update challenge by invalid Id',
    iterationData: require('./testData/challenge/partially-update-challenge-by-invalid-id.json')
  },
  {
    folder: 'partially update challenge by error field 1',
    iterationData: require('./testData/challenge/partially-update-challenge-by-error-field-1.json')
  },
  {
    folder: 'partially update challenge by error field 2',
    iterationData: require('./testData/challenge/partially-update-challenge-by-error-field-2.json')
  },
  {
    folder: 'partially update challenge by error field 3',
    iterationData: require('./testData/challenge/partially-update-challenge-by-error-field-3.json')
  },
  {
    folder: 'partially update challenge by error field 4',
    iterationData: require('./testData/challenge/partially-update-challenge-by-error-field-4.json')
  },
  {
    folder: 'partially update challenge by error field 5',
    iterationData: require('./testData/challenge/partially-update-challenge-by-error-field-5.json')
  },
  {
    folder: 'partially update challenge by error field 6',
    iterationData: require('./testData/challenge/partially-update-challenge-by-error-field-6.json')
  },
  {
    folder: 'partially update challenge by error field 7',
    iterationData: require('./testData/challenge/partially-update-challenge-by-error-field-7.json')
  },
  {
    folder: 'partially update challenge by error field 8',
    iterationData: require('./testData/challenge/partially-update-challenge-by-error-field-8.json')
  },
  {
    folder: 'partially update challenge by error field 9',
    iterationData: require('./testData/challenge/partially-update-challenge-by-error-field-9.json')
  },
  {
    folder: 'partially update challenge by invalid field',
    iterationData: require('./testData/challenge/partially-update-challenge-by-invalid-field.json')
  },
  {
    folder: 'delete challenge - id',
    iterationData: require('./testData/challenge/delete-challenge-id.json')
  },
  {
    folder: 'delete challenge by invalid Id',
    iterationData: require('./testData/challenge/delete-challenge-by-invalid-id.json')
  },
  {
    folder: 'delete challenge by invalid token',
    iterationData: require('./testData/challenge/delete-challenge-by-invalid-token.json')
  },
  {
    folder: 'delete challenge by invalid bearer format',
    iterationData: require('./testData/challenge/delete-challenge-by-invalid-bearer-format.json')
  },
  {
    folder: 'delete challenge error',
    iterationData: require('./testData/challenge/delete-challenge-error.json')
  }
]

const attachmentRequests = [
  {
    folder: 'create attachment by admin',
    iterationData: require('./testData/attachment/create-attachment-by-admin.json')
  },
  {
    folder: 'create attachment by invalid token',
    iterationData: require('./testData/attachment/create-attachment-by-invalid-token.json')
  },
  {
    folder: 'create attachment by invalid bearer format',
    iterationData: require('./testData/attachment/create-attachment-by-invalid-bearer-format.json')
  },
  {
    folder: 'create attachment by invalid Id',
    iterationData: require('./testData/attachment/create-attachment-by-invalid-id.json')
  },
  {
    folder: 'create attachment by error field',
    iterationData: require('./testData/attachment/create-attachment-by-error-field.json')
  },
  {
    folder: 'create attachment by invalid field 1',
    iterationData: require('./testData/attachment/create-attachment-by-invalid-field-1.json')
  },
  {
    folder: 'create attachment by invalid field 2',
    iterationData: require('./testData/attachment/create-attachment-by-invalid-field-2.json')
  },
  {
    folder: 'create attachment by invalid field 3',
    iterationData: require('./testData/attachment/create-attachment-by-invalid-field-3.json')
  },
  {
    folder: 'create attachment by invalid field 4',
    iterationData: require('./testData/attachment/create-attachment-by-invalid-field-4.json')
  },
  {
    folder: 'create attachment by missing field 1',
    iterationData: require('./testData/attachment/create-attachment-by-missing-field-1.json')
  },
  {
    folder: 'create attachment by missing field 2',
    iterationData: require('./testData/attachment/create-attachment-by-missing-field-2.json')
  },
  {
    folder: 'create attachment by unexpected field',
    iterationData: require('./testData/attachment/create-attachment-by-unexpected-field.json')
  },
  {
    folder: 'get attachment - id',
    iterationData: require('./testData/attachment/get-attachment-id.json')
  },
  {
    folder: 'get attachment by invalid id 1',
    iterationData: require('./testData/attachment/get-attachment-by-invalid-id-1.json')
  },
  {
    folder: 'get attachment by invalid id 2',
    iterationData: require('./testData/attachment/get-attachment-by-invalid-id-2.json')
  },
  {
    folder: 'get attachment by invalid token',
    iterationData: require('./testData/attachment/get-attachment-by-invalid-token.json')
  },
  {
    folder: 'download attachment - id',
    iterationData: require('./testData/attachment/download-attachment-id.json')
  },
  {
    folder: 'download attachment by invalid id 1',
    iterationData: require('./testData/attachment/download-attachment-by-invalid-id-1.json')
  },
  {
    folder: 'download attachment by invalid id 2',
    iterationData: require('./testData/attachment/download-attachment-by-invalid-id-2.json')
  },
  {
    folder: 'download attachment by invalid token',
    iterationData: require('./testData/attachment/download-attachment-by-invalid-token.json')
  },
  {
    folder: 'fully update attachment by admin',
    iterationData: require('./testData/attachment/fully-update-attachment-by-admin.json')
  },
  {
    folder: 'fully update attachment by invalid token',
    iterationData: require('./testData/attachment/fully-update-attachment-by-invalid-token.json')
  },
  {
    folder: 'fully update attachment by invalid bearer format',
    iterationData: require('./testData/attachment/fully-update-attachment-by-invalid-bearer-format.json')
  },
  {
    folder: 'fully update attachment by invalid Id',
    iterationData: require('./testData/attachment/fully-update-attachment-by-invalid-id.json')
  },
  {
    folder: 'fully update attachment by error field',
    iterationData: require('./testData/attachment/fully-update-attachment-by-error-field.json')
  },
  {
    folder: 'fully update attachment by invalid field 1',
    iterationData: require('./testData/attachment/fully-update-attachment-by-invalid-field-1.json')
  },
  {
    folder: 'fully update attachment by invalid field 2',
    iterationData: require('./testData/attachment/fully-update-attachment-by-invalid-field-2.json')
  },
  {
    folder: 'fully update attachment by invalid field 3',
    iterationData: require('./testData/attachment/fully-update-attachment-by-invalid-field-3.json')
  },
  {
    folder: 'fully update attachment by invalid field 4',
    iterationData: require('./testData/attachment/fully-update-attachment-by-invalid-field-4.json')
  },
  {
    folder: 'fully update attachment by missing field 1',
    iterationData: require('./testData/attachment/fully-update-attachment-by-missing-field-1.json')
  },
  {
    folder: 'fully update attachment by missing field 2',
    iterationData: require('./testData/attachment/fully-update-attachment-by-missing-field-2.json')
  },
  {
    folder: 'fully update attachment by unexpected field',
    iterationData: require('./testData/attachment/fully-update-attachment-by-unexpected-field.json')
  },
  {
    folder: 'partially update attachment by admin',
    iterationData: require('./testData/attachment/partially-update-attachment-by-admin.json')
  },
  {
    folder: 'partially update attachment by invalid token',
    iterationData: require('./testData/attachment/partially-update-attachment-by-invalid-token.json')
  },
  {
    folder: 'partially update attachment by invalid bearer format',
    iterationData: require('./testData/attachment/partially-update-attachment-by-invalid-bearer-format.json')
  },
  {
    folder: 'partially update attachment by invalid Id',
    iterationData: require('./testData/attachment/partially-update-attachment-by-invalid-id.json')
  },
  {
    folder: 'partially update attachment by error field',
    iterationData: require('./testData/attachment/partially-update-attachment-by-error-field.json')
  },
  {
    folder: 'partially update attachment by invalid field 1',
    iterationData: require('./testData/attachment/partially-update-attachment-by-invalid-field-1.json')
  },
  {
    folder: 'partially update attachment by invalid field 2',
    iterationData: require('./testData/attachment/partially-update-attachment-by-invalid-field-2.json')
  },
  {
    folder: 'partially update attachment by invalid field 3',
    iterationData: require('./testData/attachment/partially-update-attachment-by-invalid-field-3.json')
  },
  {
    folder: 'partially update attachment by invalid field 4',
    iterationData: require('./testData/attachment/partially-update-attachment-by-invalid-field-4.json')
  },
  {
    folder: 'partially update attachment by unexpected field',
    iterationData: require('./testData/attachment/partially-update-attachment-by-unexpected-field.json')
  },
  {
    folder: 'delete attachment - id',
    iterationData: require('./testData/attachment/delete-attachment-id.json')
  },
  {
    folder: 'delete attachment by invalid Id',
    iterationData: require('./testData/attachment/delete-attachment-by-invalid-id.json')
  },
  {
    folder: 'delete attachment by invalid token',
    iterationData: require('./testData/attachment/delete-attachment-by-invalid-token.json')
  },
  {
    folder: 'delete attachment by invalid bearer format',
    iterationData: require('./testData/attachment/delete-attachment-by-invalid-bearer-format.json')
  }
]

const auditLogRequests = [
  {
    folder: 'get auditLog - all',
    iterationData: require('./testData/auditlog/get-auditlog-all.json')
  },
  {
    folder: 'search auditLog',
    iterationData: require('./testData/auditlog/search-auditlog.json')
  },
  {
    folder: 'search auditLog invalid field',
    iterationData: require('./testData/auditlog/search-auditlog-invalid-field.json')
  },
  {
    folder: 'get auditLog by invalid token',
    iterationData: require('./testData/auditlog/get-auditlog-by-invalid-token.json')
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
  ...challengeRequests,
  ...attachmentRequests,
  ...auditLogRequests,
  ...healthRequests
]

/**
 * Clear the test data.
 * @return {Promise<void>}
 */
async function clearTestData () {
  logger.info('Clear the Postman test data.')
  await helper.postRequest(`${config.API_BASE_URL}/${config.API_VERSION}/challenges/internal/jobs/clean`)
  logger.info('Finished clear the Postman test data.')
}

/**
 * Run postman tests
 * note: the apiTestLib is called multiple times as complete test takes more than 10 minutes to complete and jwt expires midway
 * make sure each test takes less than 10 minutes
 */

apiTestLib.runTests(requests, require.resolve('./Challenge-API.postman_collection.json'), require.resolve('./Challenge-API.postman_environment.json')).then(async () => {
  logger.info('newman test completed!')

  await clearTestData()
}).catch(async (err) => {
  logger.logFullError(err)

  // Only calling the clean up function when it is not validation error.
  if (err.name !== 'ValidationError') {
    await clearTestData()
  }
})

// if you require higher wait time comment the above test and uncomment the below

// ;(async () => {
// await apiTestLib.runTests(challengeTypeRequests, require.resolve('./Challenge-API.postman_collection.json'),require.resolve('./Challenge-API.postman_environment.json'))
//               .then(async () => {
//                 logger.info('newman test for Challenge Type Requests completed!')
//               })

// await apiTestLib.runTests(challengeTrackRequests, require.resolve('./Challenge-API.postman_collection.json'),require.resolve('./Challenge-API.postman_environment.json'))
//               .then(async () => {
//                 logger.info('newman test for Challenge Tracks completed!')
//               })

// await apiTestLib.runTests(challengePhaseRequests, require.resolve('./Challenge-API.postman_collection.json'),require.resolve('./Challenge-API.postman_environment.json'))
//               .then(async () => {
//                 logger.info('newman test for Challenge Phases completed!')
//               })

// await apiTestLib.runTests(timelineTemplateRequests, require.resolve('./Challenge-API.postman_collection.json'),require.resolve('./Challenge-API.postman_environment.json'))
//               .then(async () => {
//                 logger.info('newman test for Timeline Templates completed!')
//               })

// await apiTestLib.runTests(challengeTimelineTemplateRequests, require.resolve('./Challenge-API.postman_collection.json'),require.resolve('./Challenge-API.postman_environment.json'))
//               .then(async () => {
//                 logger.info('newman test for Challenge Timeline Templates completed!')
//               })

// await apiTestLib.runTests(challengeRequests, require.resolve('./Challenge-API.postman_collection.json'),require.resolve('./Challenge-API.postman_environment.json'))
//               .then(async () => {
//                 logger.info('newman test for Challenge Requests completed!')
//               })

// await apiTestLib.runTests(attachmentRequests, require.resolve('./Challenge-API.postman_collection.json'),require.resolve('./Challenge-API.postman_environment.json'))
//               .then(async () => {
//                 logger.info('newman test for Attachment Requests completed!')
//               })

// await apiTestLib.runTests(auditLogRequests, require.resolve('./Challenge-API.postman_collection.json'),require.resolve('./Challenge-API.postman_environment.json'))
//               .then(async () => {
//                 logger.info('newman test for Audit log requests completed!')
//               })

// await apiTestLib.runTests(healthRequests, require.resolve('./Challenge-API.postman_collection.json'),require.resolve('./Challenge-API.postman_environment.json'))
//               .then(async () => {
//                 logger.info('newman test for health request completed!')
//               })
// })().then(async () => {
//   logger.info('newman tests completed!')

//   await clearTestData()
// }).catch(async (err) => {
//   logger.logFullError(err)

//   // Only calling the clean up function when it is not validation error.
//   if (err.name !== 'ValidationError') {
//     await clearTestData()
//   }
// })
