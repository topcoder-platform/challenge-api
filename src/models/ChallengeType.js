/**
 * This defines ChallengeType model.
 */

const dynamoose = require('dynamoose')

const Schema = dynamoose.Schema

const schema = new Schema({
  id: {
    type: String,
    hashKey: true,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: false
  },
  isActive: {
    type: Boolean,
    required: true
  },
  abbreviation: {
    type: String,
    required: true
  },
  legacyId: {
    type: Number,
    required: false
  }
},
{
  throughput: { read: 4, write: 2 }
})

module.exports = schema
