/**
 * The application entry point
 */

require("./app-bootstrap");

const _ = require("lodash");
const config = require("config");
const express = require("express");
const compressible = require("compressible");
const compression = require("compression");
const bodyParser = require("body-parser");
const cors = require("cors");
const HttpStatus = require("http-status-codes");
const logger = require("./src/common/logger");
const interceptor = require("express-interceptor");
const fileUpload = require("express-fileupload");
const YAML = require("yamljs");
const swaggerUi = require("swagger-ui-express");
const challengeAPISwaggerDoc = YAML.load("./docs/swagger.yaml");
const { ForbiddenError } = require("./src/common/errors");

// setup express app
const app = express();
app.use(
  compression({
    filter: (req, res) => {
      var type = res.getHeader("Content-Type");

      if (!compressible(type)) {
        return false;
      }

      // enable compression for /challenges/topgear api
      return req.path && req.path.startsWith(`/${config.API_VERSION}/challenges/topgear`);
    },
  })
);

// Disable POST, PUT, PATCH, DELETE operations if READONLY is set to true
app.use((req, res, next) => {
  if (config.READONLY === true && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    throw new ForbiddenError("Action is temporarely not allowed!");
  }
  next();
});

// serve challenge V5 API swagger definition
app.use("/v5/challenges/docs", swaggerUi.serve, swaggerUi.setup(challengeAPISwaggerDoc));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        // disable cors if service to service request
        callback(null, false);
      } else {
        callback(null, new RegExp(/topcoder(-dev|-qa)?\.com$/));
      }
    },
    exposedHeaders: [
      "X-Prev-Page",
      "X-Next-Page",
      "X-Page",
      "X-Per-Page",
      "X-Total",
      "X-Total-Pages",
      "Link",
    ],
  })
);
app.use(
  fileUpload({
    limits: { fileSize: config.FILE_UPLOAD_SIZE_LIMIT },
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("port", config.PORT);

// intercept the response body from jwtAuthenticator
app.use(
  interceptor((req, res) => {
    return {
      isInterceptable: () => {
        return res.statusCode === 403;
      },

      intercept: (body, send) => {
        let obj;
        try {
          obj = JSON.parse(body);
        } catch (e) {
          logger.error("Invalid response body.");
        }
        if (obj && obj.result && obj.result.content && obj.result.content.message) {
          const ret = { message: obj.result.content.message };
          res.statusCode = 401;
          send(JSON.stringify(ret));
        } else {
          send(body);
        }
      },
    };
  })
);

// Register routes
require("./app-routes")(app);

// The error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.logFullError(err, req.signature || `${req.method} ${req.url}`);
  const errorResponse = {};
  let status = err.isJoi
    ? HttpStatus.BAD_REQUEST
    : err.httpStatus || _.get(err, "response.status") || HttpStatus.INTERNAL_SERVER_ERROR;

  // Check if err is a GrpcError
  if (err.details != null && err.code != null) {
    status = err.code == 5 ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST; // TODO: Use @topcoder-framework/lib-common to map GrpcError codes to HTTP codes
    errorResponse.code = err.code;
    errorResponse.message = err.details;
  }

  if (_.isArray(err.details)) {
    if (err.isJoi) {
      _.map(err.details, (e) => {
        if (e.message) {
          if (_.isUndefined(errorResponse.message)) {
            errorResponse.message = e.message;
          } else {
            errorResponse.message += `, ${e.message}`;
          }
        }
      });
    }
  }
  if (_.get(err, "response.status")) {
    // extra error message from axios http response(v4 and v5 tc api)
    errorResponse.message =
      _.get(err, "response.data.result.content.message") || _.get(err, "response.data.message");
  }

  if (_.isUndefined(errorResponse.message)) {
    if (err.message && status !== HttpStatus.INTERNAL_SERVER_ERROR) {
      errorResponse.message = err.message;
    } else {
      errorResponse.message = "Internal server error";
    }
  }

  res.status(status).json(errorResponse);
});

app.listen(app.get("port"), () => {
  logger.info(`Express server listening on port ${app.get("port")}`);
});

module.exports = app;
