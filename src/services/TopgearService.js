/**
 * This service provides operations for Topgear.
 */
const _ = require("lodash");
const Joi = require("joi");
const moment = require("moment");
const config = require("config");
const { Client: SearchClient } = require("@opensearch-project/opensearch");

const logger = require("../common/logger");
const errors = require("../common/errors");
const constants = require("../../app-constants");

const searchClient = new SearchClient({
  node: config.CENTRAL_SEARCH_URL,
});

const indexName = "topgear_challenge";

/**
 * Get Topgear trending technologies.
 * @param {Object} currentUser The user who perform operation
 * @param {Object} criteria The search criteria
 */
async function getTechTrending(currentUser, criteria) {
  // Default to get trending technologies in 1 year, client can pass afterCompleteDate to override
  const result = await searchClient.search({
    index: indexName,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { "status.keyword": constants.challengeStatuses.Completed } },
            {
              range: {
                endDate: {
                  gte: criteria.afterCompleteDate
                    ? criteria.afterCompleteDate
                    : moment().subtract(1, "years").toISOString(),
                },
              },
            },
          ],
        },
      },
      aggs: {
        teches: {
          terms: {
            field: "tags.keyword",
            size: 100000,
          },
        },
      },
    },
  });

  const aggs = result.body.aggregations;
  const teches = [];

  _.forEach(_.get(aggs, "teches.buckets"), (bucket) => {
    teches.push({
      tech: bucket.key,
      count: bucket.doc_count,
    });
  });

  return teches.sort((a, b) => b.count - a.count);
}

getTechTrending.schema = {
  currentUser: Joi.any(),
  criteria: Joi.object({
    afterCompleteDate: Joi.date(),
  }).unknown(true),
};

/**
 * Get Topgear member badges.
 * @param {Object} currentUser The user who perform operation
 * @param {Object} criteria The search criteria
 */
async function getMemberBadges(currentUser, criteria) {
  // Default to get member badges in 1 year, client can pass afterCompleteDate to override
  const result = await searchClient.search({
    index: indexName,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { "status.keyword": constants.challengeStatuses.Completed } },
            {
              range: {
                endDate: {
                  gte: criteria.afterCompleteDate
                    ? criteria.afterCompleteDate
                    : moment().subtract(1, "years").toISOString(),
                },
              },
            },
          ],
        },
      },
      aggs: {
        wins: {
          terms: {
            field: "winners.userId",
            size: 1000000,
          },
        },
        submissions: {
          terms: {
            field: "submissions.memberId",
            size: 1000000,
          },
        },
        resources: {
          nested: {
            path: "resources",
          },
          aggs: {
            registrants: {
              filter: {
                term: {
                  "resources.roleId": config.SUBMITTER_ROLE_ID,
                },
              },
              aggs: {
                count: {
                  multi_terms: {
                    terms: [
                      {
                        field: "resources.memberId",
                      },
                      {
                        field: "resources.memberHandle.keyword",
                      },
                    ],
                    size: 1000000,
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const aggs = result.body.aggregations;
  const members = new Map();

  _.forEach(_.get(aggs, "resources.registrants.count.buckets"), (bucket) => {
    const memberId = `${bucket.key[0]}`;
    const memberHandle = bucket.key[1];

    members.set(memberId, { memberId, memberHandle, challenges: bucket.doc_count });
  });

  _.forEach(_.get(aggs, "submissions.buckets"), (bucket) => {
    const memberId = `${bucket.key}`;
    const member = members.get(memberId);
    if (member) {
      member.submissions = bucket.doc_count;
    }
  });

  _.forEach(_.get(aggs, "wins.buckets"), (bucket) => {
    const memberId = `${bucket.key}`;
    const member = members.get(memberId);
    if (member) {
      member.wins = bucket.doc_count;
    }
  });

  return Array.from(members.values()).sort((a, b) => b.challenges - a.challenges);
}

getMemberBadges.schema = {
  currentUser: Joi.any(),
  criteria: Joi.object({
    afterCompleteDate: Joi.date(),
  }).unknown(true),
};

/**
 * Search Topgear challenges
 * @param {Object} currentUser The user who perform operation
 * @param {Object} criteria The search criteria
 */
async function searchChallenges(currentUser, criteria) {
  if (criteria.includeAll) {
    // When include all data, max size window, and no need cursor
    criteria.size = 10000;
    delete criteria.cursor;
  } else if (criteria.cursor) {
    // Decode base64 cursor
    try {
      criteria.cursor = JSON.parse(Buffer.from(criteria.cursor, "base64").toString("utf8"));
    } catch (err) {
      throw new errors.BadRequestError("Bad cursor");
    }
  }

  const should = [];

  // Default to find Active/Completed challenges
  if (!criteria.status || !criteria.status.length) {
    criteria.status = [constants.challengeStatuses.Active, constants.challengeStatuses.Completed];
  }

  if (criteria.status.includes(constants.challengeStatuses.Active)) {
    const activeFilter = {
      bool: {
        filter: [],
      },
    };
    should.push(activeFilter);

    // Default to find Active challenges in 90 days, client can pass afterActiveDate to override
    activeFilter.bool.filter.push({
      term: { "status.keyword": constants.challengeStatuses.Active },
    });
    activeFilter.bool.filter.push({
      range: {
        startDate: {
          gte: criteria.afterActiveDate || moment().subtract(90, "days").toISOString(),
        },
      },
    });

    delete criteria.afterActiveDate;
    criteria.status = _.filter(criteria.status, (s) => s !== constants.challengeStatuses.Active);
  }

  if (criteria.status.includes(constants.challengeStatuses.Completed)) {
    const completeFilter = {
      bool: {
        filter: [],
      },
    };
    should.push(completeFilter);

    // Default to find Completed challenges in 90 days, client can pass afterCompleteDate to override
    completeFilter.bool.filter.push({
      term: { "status.keyword": constants.challengeStatuses.Completed },
    });
    completeFilter.bool.filter.push({
      range: {
        endDate: {
          gte: criteria.afterCompleteDate || moment().subtract(90, "days").toISOString(),
        },
      },
    });

    delete criteria.afterCompleteDate;
    criteria.status = _.filter(criteria.status, (s) => s !== constants.challengeStatuses.Completed);
  }

  if (criteria.status.length) {
    for (const status of criteria.status) {
      should.push({ match_phrase: { status: status } });
    }
  }

  const filters = [];
  if (criteria.afterActiveDate) {
    filters.push({ range: { startDate: { gte: criteria.afterActiveDate } } });
  }
  if (criteria.afterCompleteDate) {
    filters.push({ range: { endDate: { gte: criteria.afterCompleteDate } } });
  }

  const must = [];
  if (criteria.name) {
    must.push({
      match: {
        name: {
          query: criteria.name,
          operator: "and",
        },
      },
    });
  }
  if (criteria.createdBy) {
    must.push({
      match: {
        createdBy: {
          query: criteria.createdBy,
          operator: "and",
        },
      },
    });
  }

  const query = {
    bool: {},
  };

  if (should.length) {
    query.bool.minimum_should_match = 1;
    query.bool.should = should;
  }
  if (filters.length) {
    query.bool.filter = filters;
  }
  if (must.length) {
    query.bool.must = must;
  }

  const { challenges, cursor } = await scroll(
    query,
    criteria.size,
    criteria.includeAll,
    criteria.cursor
  );

  for (const challenge of challenges) {
    challenge.registrants = [];
    challenge.reviewers = [];

    const resources = challenge.resources || [];
    for (const resource of resources) {
      if (resource.roleId === config.SUBMITTER_ROLE_ID) {
        challenge.registrants.push({
          memberId: resource.memberId,
          memberHandle: resource.memberHandle,
          submitInd: false,
        });
      } else if (
        resource.roleId === config.REVIEWER_RESOURCE_ROLE_ID ||
        resource.roleId === config.ITERATIVE_REVIEWER_RESOURCE_ROLE_ID
      ) {
        challenge.reviewers.push({
          memberId: resource.memberId,
          memberHandle: resource.memberHandle,
        });
      }
    }

    const submissions = challenge.submissions || [];

    submissions.sort(
      (a, b) => moment(b.submittedDate).valueOf() - moment(a.submittedDate).valueOf()
    );

    for (const registrant of challenge.registrants) {
      const submission = submissions.find((sub) => `${sub.memberId}` === `${registrant.memberId}`);
      if (submission) {
        registrant.submitInd = true;
        registrant.submittedDate = submission.submittedDate;
        registrant.review = submission.review;
      }
    }

    delete challenge.resources;
    delete challenge.submissions;
  }

  return { challenges, cursor };
}

searchChallenges.schema = {
  currentUser: Joi.any(),
  criteria: Joi.object({
    name: Joi.string(),
    createdBy: Joi.string(),
    status: Joi.array().items(Joi.string().valid(_.values(constants.challengeStatuses))),
    afterActiveDate: Joi.date(),
    afterCompleteDate: Joi.date(),
    includeAll: Joi.boolean().default(false),
    cursor: Joi.string().base64({ paddingRequired: false }),
    size: Joi.number().integer().min(1).max(10000).default(1000),
  }).unknown(true),
};

const includeFields = [
  "id",
  "directProjectId",
  "name",
  "status",
  "created",
  "createdBy",
  "startDate",
  "endDate",
  "scheduledEndDate",
  "tags",
  "groups",
  "winners",
  "payments",
  "resources",
  "submissions.memberId",
  "submissions.submittedDate",
  "submissions.review.scoreCardId",
  "submissions.review.score",
];

async function scroll(query, size, includeAll, cursor) {
  console.info("Topgear query:", JSON.stringify(query, null, 2));
  console.info(
    `size: ${size}, includeAll: ${includeAll}` +
      (cursor ? `, cursor: ${JSON.stringify(cursor)}` : "")
  );

  const startTime = new Date().getTime();

  const allHits = [];

  while (true) {
    const result = await searchClient.search({
      index: indexName,
      size,
      timeout: "10s",
      body: {
        query,
        _source: {
          includes: includeFields,
        },
        sort: [
          {
            created: "desc",
          },
          {
            id: "desc",
          },
        ],
        ...(cursor ? { search_after: cursor } : {}),
      },
    });

    const hits = _.get(result, "body.hits.hits");

    if (!hits || !hits.length) {
      cursor = null;
      break;
    } else {
      for (const hit of hits) {
        allHits.push(hit._source);
      }
      if (hits.length < size) {
        cursor = null;
        break;
      } else {
        cursor = hits[hits.length - 1].sort;
      }
    }

    if (!includeAll) {
      break;
    }
  }

  console.info(
    `Search Topgear challenges finishes, count: ${allHits.length}, time spent: ${
      (new Date().getTime() - startTime) / 1000
    }s`
  );

  return {
    challenges: allHits,
    cursor: cursor ? Buffer.from(JSON.stringify(cursor), "utf8").toString("base64") : null,
  };
}

module.exports = {
  getTechTrending,
  getMemberBadges,
  searchChallenges,
};

logger.buildService(module.exports);
