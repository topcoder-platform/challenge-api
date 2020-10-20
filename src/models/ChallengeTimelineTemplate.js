/**
 * This defines ChallengeType-TimelineTemplate mapping model.
 */

const dynamoose = require('dynamoose')

const Schema = dynamoose.Schema

const schema = new Schema({
  id: {
    type: String,
    hashKey: true,
    required: true
  },
  trackId: {
    type: String,
    required: true
  },
  typeId: {
    type: String,
    required: true
  },
  timelineTemplateId: {
    type: String,
    required: true
  },
  isDefault: {
    type: Boolean,
    required: false
  }
},
{
  throughput: { read: 4, write: 2 }
})

module.exports = schema
