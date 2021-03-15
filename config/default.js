/**
 * The configuration file.
 */

module.exports = {
  READONLY: process.env.READONLY === 'true' || false,
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  PORT: process.env.PORT || 3000,
  // used to properly set the header response to api calls for services behind a load balancer
  API_BASE_URL: process.env.API_BASE_URL || `http://localhost:3000`,
  API_VERSION: process.env.API_VERSION || 'v5',
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
  SCHEDULING_TOPIC: process.env.SCHEDULING_TOPIC || 'challenge.notification.schedule.update',

  AMAZON: {
    // AWS_ACCESS_KEY_ID: process.env.AWS_FAKE_ID || 'FAKE_ACCESS_KEY',
    // AWS_SECRET_ACCESS_KEY: process.env.AWS_FAKE_KEY || 'FAKE_SECRET_ACCESS_KEY',
    AWS_REGION: process.env.AWS_REGION || 'ap-northeast-1',
    IS_LOCAL_DB: process.env.IS_LOCAL_DB || true,
    DYNAMODB_URL: process.env.DYNAMODB_URL || 'http://localhost:8000',
    S3_API_VERSION: process.env.S3_API_VERSION || '2006-03-01',
    BUCKET_WHITELIST: process.env.BUCKET_WHITELIST || 'topcoder_01, topcoder_02'
  },

  ES: {
    // above AWS_REGION is used if we use AWS ES
    HOST: process.env.ES_HOST || 'localhost:9200',
    API_VERSION: process.env.ES_API_VERSION || '6.8',
    ES_INDEX: process.env.ES_INDEX || 'challenge',
    ES_TYPE: process.env.ES_TYPE || '_doc', // ES 6.x accepts only 1 Type per index and it's mandatory to define it
    ES_REFRESH: process.env.ES_REFRESH || 'true',
    TEMP_REINDEXING: process.env.TEMP_REINDEXING || true // if true, it won't delete the existing index when reindexing data
  },

  // in bytes
  FILE_UPLOAD_SIZE_LIMIT: process.env.FILE_UPLOAD_SIZE_LIMIT
    ? Number(process.env.FILE_UPLOAD_SIZE_LIMIT) : 50 * 1024 * 1024, // 50M
  RESOURCES_API_URL: process.env.RESOURCES_API_URL || 'http://localhost:4000/v5/resources',
  // TODO: change this to localhost
  RESOURCE_ROLES_API_URL: process.env.RESOURCE_ROLES_API_URL || 'http://api.topcoder-dev.com/v5/resource-roles',
  GROUPS_API_URL: process.env.GROUPS_API_URL || 'http://localhost:4000/v5/groups',
  PROJECTS_API_URL: process.env.PROJECTS_API_URL || 'http://localhost:4000/v5/projects',
  TERMS_API_URL: process.env.TERMS_API_URL || 'http://localhost:4000/v5/terms',
  V3_PROJECTS_API_URL: process.env.V3_PROJECTS_API_URL || 'http://localhost:4000/v3/direct/projects',
  // copilot resource role ids allowed to upload attachment
  COPILOT_RESOURCE_ROLE_IDS: process.env.COPILOT_RESOURCE_ROLE_IDS
    ? process.env.COPILOT_RESOURCE_ROLE_IDS.split(',') : ['10ba038e-48da-487b-96e8-8d3b99b6d18b'],
  SUBMITTER_ROLE_ID: process.env.SUBMITTER_ROLE_ID || '732339e7-8e30-49d7-9198-cccf9451e221',

  MANAGER_ROLE_ID: process.env.MANAGER_ROLE_ID || '0e9c6879-39e4-4eb6-b8df-92407890faf1',
  OBSERVER_ROLE_ID: process.env.OBSERVER_ROLE_ID || '2a4dc376-a31c-4d00-b173-13934d89e286',

  // health check timeout in milliseconds
  HEALTH_CHECK_TIMEOUT: process.env.HEALTH_CHECK_TIMEOUT || 3000,

  SCOPES: {
    READ: process.env.SCOPE_CHALLENGES_READ || 'read:challenges',
    CREATE: process.env.SCOPE_CHALLENGES_CREATE || 'create:challenges',
    UPDATE: process.env.SCOPE_CHALLENGES_UPDATE || 'update:challenges',
    DELETE: process.env.SCOPE_CHALLENGES_DELETE || 'delete:challenges',
    ALL: process.env.SCOPE_CHALLENGES_ALL || 'all:challenges'
  },

  DEFAULT_CONFIDENTIALITY_TYPE: process.env.DEFAULT_CONFIDENTIALITY_TYPE || 'public',

  M2M_AUDIT_HANDLE: process.env.M2M_AUDIT_HANDLE || 'tcwebservice'
}
