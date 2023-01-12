/**
 * This service provides operations of timeline template.
 */

const { GRPC_CHALLENGE_SERVER_HOST, GRPC_CHALLENGE_SERVER_PORT } = process.env;

const {
  DomainHelper: { getScanCriteria, getLookupCriteria },
} = require("@topcoder-framework/lib-common");

const {
  TimelineTemplateDomain,
} = require("@topcoder-framework/domain-challenge");

const _ = require("lodash");
const Joi = require("joi");
const uuid = require("uuid/v4");
const helper = require("../common/helper");
const phaseHelper = require("../common/phase-helper");
// const logger = require('../common/logger')
const logger = require("../common/logger");
const constants = require("../../app-constants");
const { items } = require("joi/lib/types/array");

const timelineTemplateDomain = new TimelineTemplateDomain(
  GRPC_CHALLENGE_SERVER_HOST,
  GRPC_CHALLENGE_SERVER_PORT
);

/**
 * Search timeline templates.
 * @param {Object} criteria the search criteria
 * @returns {Promise<Object>} the search result
 */
async function searchTimelineTemplates(criteria) {
  const page = criteria.page || 1;
  const perPage = criteria.perPage || 50;
  // const list = await helper.scanAll("TimelineTemplate");
  console.log("Requested criteria", criteria);
  const scanCriteria = getScanCriteria(criteria);
  console.log(scanCriteria, "scanCriteria");
  const { items: list } = await timelineTemplateDomain.scan({
    scanCriteria,
  });

  console.log("List of items", list);

  const records = _.filter(list, (e) =>
    helper.partialMatch(criteria.name, e.name)
  );
  const total = records.length;
  const result = records.slice((page - 1) * perPage, page * perPage);

  return { total, page, perPage, result };
}

searchTimelineTemplates.schema = {
  criteria: Joi.object().keys({
    page: Joi.page(),
    perPage: Joi.perPage(),
    name: Joi.string(),
  }),
};

/**
 * Create timeline template.
 * @param {Object} timelineTemplate the timeline template to created
 * @returns {Object} the created timeline template
 */
async function createTimelineTemplate(timelineTemplate) {
  await helper.validateDuplicate(
    "TimelineTemplate",
    "name",
    timelineTemplate.name
  );
  await phaseHelper.validatePhases(timelineTemplate.phases);

  const ret = await helper.create(
    "TimelineTemplate",
    _.assign({ id: uuid() }, timelineTemplate)
  );
  // post bus event
  await helper.postBusEvent(constants.Topics.TimelineTemplateCreated, ret);
  return ret;
}

createTimelineTemplate.schema = {
  timelineTemplate: Joi.object()
    .keys({
      name: Joi.string().required(),
      description: Joi.string(),
      isActive: Joi.boolean().required(),
      phases: Joi.array()
        .items(
          Joi.object().keys({
            phaseId: Joi.id(),
            predecessor: Joi.optionalId(),
            defaultDuration: Joi.number().positive().required(),
          })
        )
        .min(1)
        .required(),
    })
    .required(),
};

/**
 * Get timeline template.
 * @param {String} timelineTemplateId the timeline template id
 * @returns {Object} the timeline template with given id
 */
async function getTimelineTemplate(timelineTemplateId) {
  return timelineTemplateDomain.lookup(
    getLookupCriteria("id", timelineTemplateId)
  );
}

getTimelineTemplate.schema = {
  timelineTemplateId: Joi.id(),
};

/**
 * Update timeline template.
 * @param {String} timelineTemplateId the timeline template id
 * @param {Object} data the timeline template data to be updated
 * @param {Boolean} isFull the flag indicate it is a fully update operation.
 * @returns {Object} the updated timeline template
 */
async function update(timelineTemplateId, data, isFull) {
  const timelineTemplate = await helper.getById(
    "TimelineTemplate",
    timelineTemplateId
  );

  if (
    data.name &&
    data.name.toLowerCase() !== timelineTemplate.name.toLowerCase()
  ) {
    await helper.validateDuplicate("TimelineTemplate", "name", data.name);
  }

  if (data.phases) {
    await phaseHelper.validatePhases(data.phases);
  }

  if (isFull) {
    // description is optional field, can be undefined
    timelineTemplate.description = data.description;
  }

  const ret = await helper.update(timelineTemplate, data);
  // post bus event
  await helper.postBusEvent(
    constants.Topics.TimelineTemplateUpdated,
    isFull ? ret : _.assignIn({ id: timelineTemplateId }, data)
  );
  return ret;
}

/**
 * Fully update timeline template.
 * @param {String} timelineTemplateId the timeline template id
 * @param {Object} data the timeline template data to be updated
 * @returns {Object} the updated timeline template
 */
async function fullyUpdateTimelineTemplate(timelineTemplateId, data) {
  return update(timelineTemplateId, data, true);
}

fullyUpdateTimelineTemplate.schema = {
  timelineTemplateId: Joi.id(),
  data: Joi.object()
    .keys({
      name: Joi.string().required(),
      description: Joi.string(),
      isActive: Joi.boolean().required(),
      phases: Joi.array()
        .items(
          Joi.object().keys({
            phaseId: Joi.id(),
            predecessor: Joi.optionalId(),
            defaultDuration: Joi.number().positive().required(),
          })
        )
        .min(1)
        .required(),
    })
    .required(),
};

/**
 * Partially update timeline template.
 * @param {String} timelineTemplateId the timeline template id
 * @param {Object} data the timeline template data to be updated
 * @returns {Object} the updated timeline template
 */
async function partiallyUpdateTimelineTemplate(timelineTemplateId, data) {
  return update(timelineTemplateId, data);
}

partiallyUpdateTimelineTemplate.schema = {
  timelineTemplateId: Joi.id(),
  data: Joi.object()
    .keys({
      name: Joi.string(),
      description: Joi.string(),
      isActive: Joi.boolean(),
      phases: Joi.array()
        .items(
          Joi.object().keys({
            phaseId: Joi.id(),
            predecessor: Joi.optionalId(),
            defaultDuration: Joi.number().positive().required(),
          })
        )
        .min(1),
    })
    .required(),
};

/**
 * Delete timeline template.
 * @param {String} timelineTemplateId the timeline template id
 * @returns {Object} the deleted timeline template
 */
async function deleteTimelineTemplate(timelineTemplateId) {
  const ret = await helper.getById("TimelineTemplate", timelineTemplateId);
  await ret.delete();
  // post bus event
  await helper.postBusEvent(constants.Topics.TimelineTemplateDeleted, ret);
  return ret;
}

deleteTimelineTemplate.schema = {
  timelineTemplateId: Joi.id(),
};

module.exports = {
  searchTimelineTemplates,
  createTimelineTemplate,
  getTimelineTemplate,
  fullyUpdateTimelineTemplate,
  partiallyUpdateTimelineTemplate,
  deleteTimelineTemplate,
};

logger.buildService(module.exports, {
  validators: { enabled: true },
  logging: { enabled: true },
  tracing: {
    enabled: true,
    annotations: ["id"],
    metadata: ["createdBy", "status"],
  },
});
