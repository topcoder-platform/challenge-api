/**
 * The application entry point
 */

require('./app-bootstrap')

const _ = require('lodash')
const config = require('config')
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const HttpStatus = require('http-status-codes')
const logger = require('./src/common/logger')
const interceptor = require('express-interceptor')
const fileUpload = require('express-fileupload')

// setup express app
const app = express()

app.use(cors({
  exposedHeaders: [
    'X-Prev-Page',
    'X-Next-Page',
    'X-Page',
    'X-Per-Page',
    'X-Total',
    'X-Total-Pages',
    'Link'
  ]
}))
app.use(fileUpload({
  limits: { fileSize: config.FILE_UPLOAD_SIZE_LIMIT }
}))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.set('port', config.PORT)

// intercept the response body from jwtAuthenticator
app.use(interceptor((req, res) => {
  return {
    isInterceptable: () => {
      return res.statusCode === 403
    },

    intercept: (body, send) => {
      let obj
      try {
        obj = JSON.parse(body)
      } catch (e) {
        logger.error('Invalid response body.')
      }
      if (obj && obj.result && obj.result.content && obj.result.content.message) {
        const ret = { message: obj.result.content.message }
        res.statusCode = 401
        send(JSON.stringify(ret))
      } else {
        send(body)
      }
    }
  }
}))

// Register routes
require('./app-routes')(app)

// The error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.logFullError(err, req.signature || `${req.method} ${req.url}`)
  const errorResponse = {}
  const status = err.isJoi ? HttpStatus.BAD_REQUEST : (err.httpStatus || _.get(err, 'response.status') || HttpStatus.INTERNAL_SERVER_ERROR)

  if (_.isArray(err.details)) {
    if (err.isJoi) {
      _.map(err.details, (e) => {
        if (e.message) {
          if (_.isUndefined(errorResponse.message)) {
            errorResponse.message = e.message
          } else {
            errorResponse.message += `, ${e.message}`
          }
        }
      })
    }
  }
  if (_.get(err, 'response.status')) {
    // extra error message from axios http response(v4 and v5 tc api)
    errorResponse.message = _.get(err, 'response.data.result.content.message') || _.get(err, 'response.data.message')
  }

  if (_.isUndefined(errorResponse.message)) {
    if (err.message && status !== HttpStatus.INTERNAL_SERVER_ERROR) {
      errorResponse.message = err.message
    } else {
      errorResponse.message = 'Internal server error'
    }
  }

  res.status(status).json(errorResponse)
})

app.listen(app.get('port'), () => {
  logger.info(`Express server listening on port ${app.get('port')}`)
})

module.exports = app
