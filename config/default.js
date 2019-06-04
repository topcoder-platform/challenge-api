/**
 * The configuration file.
 */

module.exports = {
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  PORT: process.env.PORT || 3000,
  AUTH_SECRET: process.env.AUTH_SECRET || 'mysecret',
  VALID_ISSUERS: process.env.VALID_ISSUERS || '["https://api.topcoder-dev.com", "https://api.topcoder.com", "https://topcoder-dev.auth0.com/"]',

  // used to get M2M token
  AUTH0_URL: process.env.AUTH0_URL,
  AUTH0_PROXY_SERVER_URL: process.env.AUTH0_PROXY_SERVER_URL,
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE || 'https://www.topcoder-dev.com',
  TOKEN_CACHE_TIME: process.env.TOKEN_CACHE_TIME,
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,

  // bus API config params
  BUSAPI_URL: process.env.BUSAPI_URL || 'https://api.topcoder-dev.com/v5',
  KAFKA_ERROR_TOPIC: process.env.KAFKA_ERROR_TOPIC || 'common.error.reporting',

  AMAZON: {
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || 'FAKE_ACCESS_KEY',
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || 'FAKE_SECRET_ACCESS_KEY',
    AWS_REGION: process.env.AWS_REGION || 'ap-northeast-1',
    IS_LOCAL_DB: process.env.IS_LOCAL_DB ? process.env.IS_LOCAL_DB === 'true' : true,
    DYNAMODB_URL: process.env.DYNAMODB_URL || 'http://localhost:7777',
    ATTACHMENT_S3_BUCKET: process.env.ATTACHMENT_S3_BUCKET || 'my-testing-bucket-12345',
    S3_API_VERSION: process.env.S3_API_VERSION || '2006-03-01'
  },
  // in bytes
  FILE_UPLOAD_SIZE_LIMIT: process.env.FILE_UPLOAD_SIZE_LIMIT
    ? Number(process.env.FILE_UPLOAD_SIZE_LIMIT) : 50 * 1024 * 1024, // 50M
  CHALLENGES_API_URL: process.env.CHALLENGES_API_URL || 'http://localhost:4000/v5/challenges',
  GROUPS_API_URL: process.env.GROUPS_API_URL || 'http://api.topcoder-dev.com/v5/groups',
  // copilot resource role ids allowed to upload attachment
  COPILOT_RESOURCE_ROLE_IDS: process.env.COPILOT_RESOURCE_ROLE_IDS
    ? process.env.COPILOT_RESOURCE_ROLE_IDS.split(',') : ['10ba038e-48da-487b-96e8-8d3b99b6d18b'],

  // health check timeout in milliseconds
  HEALTH_CHECK_TIMEOUT: process.env.HEALTH_CHECK_TIMEOUT || 3000
}
