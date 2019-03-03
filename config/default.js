/**
 * The configuration file.
 */

module.exports = {
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  PORT: process.env.PORT || 3000,
  AUTH_SECRET: process.env.AUTH_SECRET || 'mysecret',
  VALID_ISSUERS: process.env.VALID_ISSUERS || '["https://api.topcoder-dev.com", "https://api.topcoder.com", "https://topcoder-dev.auth0.com/"]',
  DYNAMODB: {
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || 'FAKE_ACCESS_KEY',
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || 'FAKE_SECRET_ACCESS_KEY',
    AWS_REGION: process.env.AWS_REGION || 'eu-central-1',
    IS_LOCAL: process.env.IS_LOCAL || true,
    URL: process.env.DYNAMODB_URL || 'http://localhost:7777'
  }
}
