/**
 * This defines Attachment model.
 */

const dynamoose = require('dynamoose')

const Schema = dynamoose.Schema

const schema = new Schema({
  id: {
    type: String,
    hashKey: true,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  challengeId: {
    type: String,
    required: true
  },
  description: {
    type: String
  }
},
{
  throughput: { read: 4, write: 2 }
})

module.exports = schema
