/**
 * This defines Phase model.
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
  isOpen: {
    type: Boolean,
    required: true
  },
  duration: {
    type: Number,
    required: true
  }
},
{
  throughput: 'ON_DEMAND'
  // throughput: { read: 4, write: 2 }
})

module.exports = schema
