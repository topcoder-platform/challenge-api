/**
 * The configuration file.
 */
const _ = require("lodash");
require("dotenv").config();
module.exports = {
  READONLY: process.env.READONLY === "true" || false,
  LOG_LEVEL: process.env.LOG_LEVEL || "debug",
  PORT: process.env.PORT || 3000,
  // used to properly set the header response to api calls for services behind a load balancer
  API_BASE_URL: process.env.API_BASE_URL || `http://localhost:3000`,
  API_VERSION: process.env.API_VERSION || "v5",
  AUTH_SECRET: process.env.AUTH_SECRET || "mysecret",
  VALID_ISSUERS:
    process.env.VALID_ISSUERS ||
    '["https://api.topcoder-dev.com", "https://api.topcoder.com", "https://topcoder-dev.auth0.com/"]',

  // used to get M2M token
  AUTH0_URL: process.env.AUTH0_URL,
  AUTH0_PROXY_SERVER_URL: process.env.AUTH0_PROXY_SERVER_URL,
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE || "https://www.topcoder-dev.com",
  TOKEN_CACHE_TIME: process.env.TOKEN_CACHE_TIME,
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,

  // bus API config params
  BUSAPI_URL: process.env.BUSAPI_URL || "https://api.topcoder-dev.com/v5",
  KAFKA_ERROR_TOPIC: process.env.KAFKA_ERROR_TOPIC || "common.error.reporting",
  SCHEDULING_TOPIC: process.env.SCHEDULING_TOPIC || "challenge.notification.schedule.update",

  AMAZON: {
    // AWS_ACCESS_KEY_ID: process.env.AWS_FAKE_ID || 'FAKE_ACCESS_KEY',
    // AWS_SECRET_ACCESS_KEY: process.env.AWS_FAKE_KEY || 'FAKE_SECRET_ACCESS_KEY',
    AWS_REGION: process.env.AWS_REGION || "ap-northeast-1",
    S3_API_VERSION: process.env.S3_API_VERSION || "2006-03-01",
    BUCKET_WHITELIST: process.env.BUCKET_WHITELIST || "topcoder_01, topcoder_02",
  },

  // in bytes
  FILE_UPLOAD_SIZE_LIMIT: process.env.FILE_UPLOAD_SIZE_LIMIT
    ? Number(process.env.FILE_UPLOAD_SIZE_LIMIT)
    : 50 * 1024 * 1024, // 50M
  // TODO: change this to localhost
  SUBMISSIONS_API_URL:
    process.env.SUBMISSIONS_API_URL || "https://api.topcoder-dev.com/v5/submissions",
  MEMBERS_API_URL: process.env.MEMBERS_API_URL || "https://api.topcoder-dev.com/v5/members",
  RESOURCES_API_URL: process.env.RESOURCES_API_URL || "http://localhost:4000/v5/resources",
  // TODO: change this to localhost
  RESOURCE_ROLES_API_URL:
    process.env.RESOURCE_ROLES_API_URL || "http://api.topcoder-dev.com/v5/resource-roles",
  GROUPS_API_URL: process.env.GROUPS_API_URL || "http://localhost:4000/v5/groups",
  PROJECTS_API_URL: process.env.PROJECTS_API_URL || "http://localhost:4000/v5/projects",
  TERMS_API_URL: process.env.TERMS_API_URL || "http://localhost:4000/v5/terms",
  CUSTOMER_PAYMENTS_URL:
    process.env.CUSTOMER_PAYMENTS_URL || "https://api.topcoder-dev.com/v5/customer-payments",
  CHALLENGE_MIGRATION_APP_URL:
    process.env.CHALLENGE_MIGRATION_APP_URL || "https://api.topcoder.com/v5/challenge-migration",
  // copilot resource role ids allowed to upload attachment
  COPILOT_RESOURCE_ROLE_IDS: process.env.COPILOT_RESOURCE_ROLE_IDS
    ? process.env.COPILOT_RESOURCE_ROLE_IDS.split(",")
    : ["10ba038e-48da-487b-96e8-8d3b99b6d18b"],
  SUBMITTER_ROLE_ID: process.env.SUBMITTER_ROLE_ID || "732339e7-8e30-49d7-9198-cccf9451e221",

  MANAGER_ROLE_ID: process.env.MANAGER_ROLE_ID || "0e9c6879-39e4-4eb6-b8df-92407890faf1",
  OBSERVER_ROLE_ID: process.env.OBSERVER_ROLE_ID || "2a4dc376-a31c-4d00-b173-13934d89e286",
  CLIENT_MANAGER_ROLE_ID: process.env.OBSERVER_ROLE_ID || "9b2f1905-8128-42da-85df-ed64410f4781",

  // topgear billing accounts
  TOPGEAR_BILLING_ACCOUNTS_ID: process.env.TOPGEAR_BILLING_ACCOUNTS_ID
    ? process.env.TOPGEAR_BILLING_ACCOUNTS_ID.split(",")
    : [],

  // health check timeout in milliseconds
  HEALTH_CHECK_TIMEOUT: process.env.HEALTH_CHECK_TIMEOUT || 3000,

  SCOPES: {
    READ: process.env.SCOPE_CHALLENGES_READ || "read:challenges",
    CREATE: process.env.SCOPE_CHALLENGES_CREATE || "create:challenges",
    UPDATE: process.env.SCOPE_CHALLENGES_UPDATE || "update:challenges",
    DELETE: process.env.SCOPE_CHALLENGES_DELETE || "delete:challenges",
    ALL: process.env.SCOPE_CHALLENGES_ALL || "all:challenges",
    PAYMENT: process.env.SCOPE_PAYMENT || "create:payments",
  },

  DEFAULT_CONFIDENTIALITY_TYPE: process.env.DEFAULT_CONFIDENTIALITY_TYPE || "public",

  M2M_AUDIT_HANDLE: process.env.M2M_AUDIT_HANDLE || "tcwebservice",
  M2M_AUDIT_USERID: process.env.M2M_AUDIT_USERID || 22838965,

  FORUM_TITLE_LENGTH_LIMIT: process.env.FORUM_TITLE_LENGTH_LIMIT || 90,

  NEW_SELF_SERVICE_PROJECT_TYPE: process.env.NEW_SELF_SERVICE_PROJECT_TYPE || "self-service",

  AXIOS_RETRIES: process.env.AXIOS_RETRIES || 3,

  SENDGRID_TEMPLATES: {
    WORK_REQUEST_SUBMITTED: process.env.WORK_REQUEST_SUBMITTED || "",
    WORK_REQUEST_STARTED: process.env.WORK_REQUEST_STARTED || "",
    WORK_REQUEST_REDIRECTED: process.env.WORK_REQUEST_REDIRECTED || "",
    WORK_COMPLETED: process.env.WORK_COMPLETED || "",
  },

  EMAIL_FROM: process.env.EMAIL_FROM || "no-reply@topcoder.com",
  SELF_SERVICE_EMAIL_CC_ACCOUNTS: process.env.SELF_SERVICE_EMAIL_CC_ACCOUNTS
    ? _.map(process.env.SELF_SERVICE_EMAIL_CC_ACCOUNTS.split(","), (email) => ({ email }))
    : [{ email: "sathya.jayabal@gmail.com" }],
  SELF_SERVICE_WHITELIST_HANDLES: process.env.SELF_SERVICE_WHITELIST_HANDLES
    ? process.env.SELF_SERVICE_WHITELIST_HANDLES.split(",")
    : ["TCConnCopilot", "sstestcopilot"],
  SELF_SERVICE_APP_URL:
    process.env.SELF_SERVICE_APP_URL || "https://platform.topcoder-dev.com/self-service",
  ZENDESK_API_TOKEN: process.env.ZENDESK_API_TOKEN || "",
  ZENDESK_API_URL: process.env.ZENDESK_API_URL || "",
  ZENDESK_CUSTOM_FIELD_TAG_ID: process.env.ZENDESK_CUSTOM_FIELD_TAG_ID,
  ZENDESK_DEFAULT_PRIORITY: process.env.ZENDESK_DEFAULT_PRIORITY || "high",
  INTERNAL_CACHE_TTL: process.env.INTERNAL_CACHE_TTL || 1800,

  SKIP_PROJECT_ID_BY_TIMLINE_TEMPLATE_ID:
    process.env.SKIP_PROJECT_ID_BY_TIMLINE_TEMPLATE_ID || "517e76b0-8824-4e72-9b48-a1ebde1793a8",
};
