/**
 * This defines Challenge model.
 */

const dynamoose = require('dynamoose')

const Schema = dynamoose.Schema

const schema = new Schema({
  id: {
    type: String,
    hashKey: true,
    required: true
  },
  legacyId: {
    type: Number,
    required: false
  },
  typeId: {
    type: String,
    required: true
  },
  trackId: {
    type: String,
    required: true
  },
  legacy: {
    type: Object,
    required: false
  },
  billing: {
    type: Object,
    required: false
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: false
  },
  privateDescription: {
    type: String,
    required: false
  },
  descriptionFormat: {
    type: String,
    default: 'HTML',
    required: true
  },
  metadata: {
    type: [Object],
    required: false
  },
  task: {
    type: Object,
    required: false
  },
  timelineTemplateId: {
    type: String,
    required: false
  },
  phases: {
    type: Array,
    required: false
  },
  events: {
    type: [Object],
    required: false
  },
  terms: {
    type: Array,
    required: false
  },
  prizeSets: {
    type: [Object],
    required: false
  },
  // tag names
  tags: {
    type: Array,
    required: false
  },
  projectId: {
    type: Number,
    required: false
  },
  startDate: {
    type: Date,
    required: false
  },
  endDate: {
    type: Date,
    required: false
  },
  status: {
    type: String,
    required: true
  },
  attachments: {
    type: Array,
    required: false
  },
  // group names
  groups: {
    type: Array,
    required: false
  },
  // winners
  winners: {
    type: Array,
    required: false
  },
  discussions: {
    type: [Object],
    required: false
  },
  overview: {
    type: Object
  },
  created: {
    type: Date,
    required: true
  },
  createdBy: {
    type: String,
    required: true
  },
  updated: {
    type: Date,
    required: false
  },
  updatedBy: {
    type: String,
    required: false
  }
},
{
  // throughput: { read: 4, write: 2 },
  throughput: 'ON_DEMAND',
  useDocumentTypes: true
}
)

module.exports = schema
