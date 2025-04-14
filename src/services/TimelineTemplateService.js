/**
 * This service provides operations of timeline template.
 */
const _ = require("lodash");
const Joi = require("joi");
const helper = require("../common/helper");
const logger = require("../common/logger");
const constants = require("../../app-constants");
const errors = require("../common/errors");

const PhaseService = require("./PhaseService");

const prisma = require('../common/prisma').getClient()

module.exports = {};

/**
 * Search timeline templates.
 * @param {Object} criteria the search criteria
 * @returns {Promise<Object>} the search result
 */
async function searchTimelineTemplates(criteria) {
  const searchFilter = getSearchFilter(_.omit(criteria, ['page', 'perPage']))

  const page = criteria.page || 1;
  const perPage = criteria.perPage || 50;
  let items = await prisma.timelineTemplate.findMany({
    where: searchFilter,
    include: { phases: true }
  })
  items = _.map(items, r => _.omit(r, constants.auditFields))
  items.forEach(item => {
    item.phases = _.map(item.phases, p => _.omit(p, constants.auditFields))
  })
  const total = items.length;
  const result = items.slice((page - 1) * perPage, page * perPage);

  return { total, page, perPage, result };
}

/**
 * Get prisma filter
 *
 * @param {Object} criteria search criteria
 * @returns filter used in prisma
 */
function getSearchFilter (criteria) {
  const ret = {}
  if (!_.isEmpty(criteria.name)) {
    ret.name = { equals: criteria.name }
  }
  return ret
}

searchTimelineTemplates.schema = {
  criteria: Joi.object().keys({
    page: Joi.page(),
    perPage: Joi.perPage(),
    name: Joi.string(),
  }),
};

/**
 * Check timeline template with given name exists or not
 * @param {String} name timeline template name
 * @throws error if timeline template name exists in db
 */
async function checkName (name) {
  const existingByName = await prisma.timelineTemplate.findMany({
    where: { name }
  })
  if (existingByName.length > 0) { throw new errors.ConflictError(`TimelineTemplate with name: ${name} already exist`) }
}

/**
 * Create timeline template.
 * @param {Object} authUser auth user
 * @param {Object} timelineTemplate the timeline template to created
 * @returns {Object} the created timeline template
 */
async function createTimelineTemplate (authUser, timelineTemplate) {
  await checkName(timelineTemplate.name)

  // Do not validate phases for now
  // await phaseHelper.validatePhases(timelineTemplate.phases);

  const phases = timelineTemplate.phases
  _.forEach(phases, p => {
    p.createdBy = authUser.userId
    p.updatedBy = authUser.userId
  })
  timelineTemplate.createdBy = authUser.userId
  timelineTemplate.updatedBy = authUser.userId
  timelineTemplate.phases = { create: phases }

  let ret = await prisma.timelineTemplate.create({
    data: timelineTemplate,
    include: { phases: true }
  })
  // remove audit fields
  ret = _.omit(ret, constants.auditFields)
  ret.phases = _.map(ret.phases, p => _.omit(p, constants.auditFields))
  // post bus event
  await helper.postBusEvent(constants.Topics.TimelineTemplateCreated, ret);
  return ret;
}

createTimelineTemplate.schema = {
  authUser: Joi.any(),
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
  let ret = await prisma.timelineTemplate.findUnique({
    where: { id: timelineTemplateId },
    include: { phases: true }
  })
  if (!ret || _.isUndefined(ret.id)) {
    throw new errors.NotFoundError(`TimelineTemplate with id: ${timelineTemplateId} doesn't exist`)
  }
  ret = _.omit(ret, constants.auditFields)
  ret.phases = _.map(ret.phases, p => _.omit(p, constants.auditFields))
  return ret
}

getTimelineTemplate.schema = {
  timelineTemplateId: Joi.id(),
};

/**
 * Update timeline template.
 * @param {Object} authUser auth user
 * @param {String} timelineTemplateId the timeline template id
 * @param {Object} data the timeline template data to be updated
 * @param {Boolean} isFull the flag indicate it is a fully update operation.
 * @returns {Object} the updated timeline template
 */
async function update (authUser, timelineTemplateId, data, isFull) {
  const timelineTemplate = await getTimelineTemplate(timelineTemplateId)

  if (data.name && data.name.toLowerCase() !== timelineTemplate.name.toLowerCase()) {
    const existingByName = await prisma.timelineTemplate.findMany({
      where: { name: data.name }
    })

    if (existingByName.length > 1)
      throw new errors.ConflictError(`Timeline template with name ${data.name} already exists`);
    else if (existingByName.length === 1 && existingByName[0].id !== timelineTemplateId)
      throw new errors.ConflictError(`Timeline template with name ${data.name} already exists`);
  }

  if (data.phases) {
    await PhaseService.validatePhases(data.phases);
  }

  if (isFull) {
    // description is optional field, can be undefined
    if (_.isUndefined(data.description)) {
      data.description = null
    }
  } else {
    data = { ...timelineTemplate, ...data }
  }
  data.updatedBy = authUser.userId
  data.phases = {
    create: _.forEach(data.phases, p => {
      p.createdBy = authUser.userId
      p.updatedBy = authUser.userId
      delete p.timelineTemplateId
    })
  }
  let ret = await prisma.$transaction(async (tx) => {
    // remove old timelineTemplatePhase
    await tx.timelineTemplatePhase.deleteMany({ where: { timelineTemplateId } })
    // update data and create new phases
    return await tx.timelineTemplate.update({
      where: { id: timelineTemplateId },
      data,
      include: { phases: true }
    })
  })
  ret = _.omit(ret, constants.auditFields)
  ret.phases = _.map(ret.phases, p => _.omit(p, constants.auditFields))

  // post bus event
  await helper.postBusEvent(
    constants.Topics.TimelineTemplateUpdated,
    isFull ? ret : _.assignIn({ id: timelineTemplateId }, ret)
  );
  return ret
}

/**
 * Fully update timeline template.
 * @param {Object} authUser auth user
 * @param {String} timelineTemplateId the timeline template id
 * @param {Object} data the timeline template data to be updated
 * @returns {Object} the updated timeline template
 */
async function fullyUpdateTimelineTemplate (authUser, timelineTemplateId, data) {
  return update(authUser, timelineTemplateId, data, true)
}

fullyUpdateTimelineTemplate.schema = {
  authUser: Joi.any(),
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
 * @param {Object} authUser auth user
 * @param {String} timelineTemplateId the timeline template id
 * @param {Object} data the timeline template data to be updated
 * @returns {Object} the updated timeline template
 */
async function partiallyUpdateTimelineTemplate (authUser, timelineTemplateId, data) {
  return update(authUser, timelineTemplateId, data)
}

partiallyUpdateTimelineTemplate.schema = {
  authUser: Joi.any(),
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
  let ret = await getTimelineTemplate(timelineTemplateId)
  // TimelineTemplatePhase will be deleted with cascade
  await prisma.timelineTemplate.delete({ where: { id: timelineTemplateId } })
  // post bus event
  await helper.postBusEvent(constants.Topics.TimelineTemplateDeleted, ret)
  return ret
}

deleteTimelineTemplate.schema = {
  timelineTemplateId: Joi.id(),
};

module.exports.searchTimelineTemplates = searchTimelineTemplates;
module.exports.createTimelineTemplate = createTimelineTemplate;
module.exports.getTimelineTemplate = getTimelineTemplate;
module.exports.fullyUpdateTimelineTemplate = fullyUpdateTimelineTemplate;
module.exports.partiallyUpdateTimelineTemplate = partiallyUpdateTimelineTemplate;
module.exports.deleteTimelineTemplate = deleteTimelineTemplate;

logger.buildService(module.exports);
