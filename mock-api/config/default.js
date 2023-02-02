/**
 * The default configuration file.
 */

module.exports = {
  PORT: process.env.PORT || 4000,

  AMAZON: {
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || 'FAKE_ACCESS_KEY',
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || 'FAKE_SECRET_ACCESS_KEY',
    AWS_REGION: process.env.AWS_REGION || 'ap-northeast-1',
    IS_LOCAL_DB: process.env.IS_LOCAL_DB ? process.env.IS_LOCAL_DB === 'true' : true,
    DYNAMODB_URL: process.env.DYNAMODB_URL || 'http://localhost:8000'
  },

  ES: {
    ES_REFRESH: process.env.ES_REFRESH || 'true'
  },
};
