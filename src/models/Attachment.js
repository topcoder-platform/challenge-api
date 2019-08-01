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
  fileSize: {
    type: Number,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  challengeId: {
    type: String,
    required: true
  }
},
{
  throughput: { read: 4, write: 2 }
})

module.exports = schema
