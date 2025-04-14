/**
 * This service provides operations of phases.
 */
const _ = require("lodash");
const Joi = require("joi");
const helper = require("../common/helper");
const logger = require("../common/logger");
const constants = require("../../app-constants");
const errors = require("../common/errors");

const prisma = require('../common/prisma').getClient()

/**
 * Search phases
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function searchPhases(criteria = {}) {
  const searchFilter = getSearchFilter(_.omit(criteria, ['page', 'perPage']))

  const page = criteria.page || 1;
  const perPage = criteria.perPage || 50;

  let records = await prisma.phase.findMany({
    where: searchFilter
  })
  records = _.map(records, r => _.omit(r, constants.auditFields))
  const total = records.length;
  const result = records.slice((page - 1) * perPage, page * perPage);

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

searchPhases.schema = {
  criteria: Joi.object().keys({
    page: Joi.page(),
    perPage: Joi.perPage().default(100),
    name: Joi.string(),
  }),
};

/**
 * Check phase with given name exists or not
 * @param {String} name phase name
 * @throws error if phase name exists in db
 */
async function checkName (name) {
  const existingByName = await prisma.phase.findMany({
    where: { name }
  })
  if (existingByName.length > 0) { throw new errors.ConflictError(`Phase with name: ${name} already exist`) }
}

/**
 * Create phase.
 * @param {Object} authUser auth user
 * @param {Object} phase the phase to created
 * @returns {Object} the created phase
 */
async function createPhase (authUser, phase) {
  await checkName(phase.name)
  phase.createdBy = authUser.userId
  phase.updatedBy = authUser.userId
  let ret = await prisma.phase.create({ data: phase })
  ret = _.omit(ret, constants.auditFields)
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengePhaseCreated, ret);
  return ret;
}

createPhase.schema = {
  authUser: Joi.any(),
  phase: Joi.object()
    .keys({
      name: Joi.string().required(),
      description: Joi.string(),
      isOpen: Joi.boolean().required(),
      duration: Joi.number().positive().required(),
    })
    .required(),
};

/**
 * Get phase
 * @param {String} phaseId the phase id
 * @returns {Object} the phase with given id
 */
async function getPhase(phaseId) {
  let ret = await prisma.phase.findUnique({ where: { id: phaseId } })
  if (!ret || _.isUndefined(ret.id)) {
    throw new errors.NotFoundError(`Phase with id: ${phaseId} doesn't exist`)
  }
  ret = _.omit(ret, constants.auditFields)
  return ret
}

getPhase.schema = {
  phaseId: Joi.id(),
};

/**
 * Update phase.
 * @param {Object} authUser auth user
 * @param {String} phaseId the phase id
 * @param {Object} data the phase data to be updated
 * @param {Boolean} isFull the flag indicate it is a fully update operation.
 * @returns {Object} the updated phase
 */
async function update (authUser, phaseId, data, isFull) {
  const phase = await getPhase(phaseId);
  if (data.name && data.name.toLowerCase() !== phase.name.toLowerCase()) {
    await checkName(data.name);
  }

  if (isFull) {
    // description is optional field, can be undefined
    if (_.isUndefined(data.description)) {
      data.description = null
    }
  }
  data.updatedBy = authUser.userId;
  let ret = await prisma.phase.update({
    where: { id: phaseId },
    data
  });
  ret = _.omit(ret, constants.auditFields);
  // post bus event
  await helper.postBusEvent(
    constants.Topics.ChallengePhaseUpdated,
    isFull ? ret : _.assignIn({ id: phaseId }, data)
  );
  return ret;
}

/**
 * Fully update phase.
 * @param {Object} authUser auth user
 * @param {String} phaseId the phase id
 * @param {Object} data the phase data to be updated
 * @returns {Object} the updated phase
 */
async function fullyUpdatePhase (authUser, phaseId, data) {
  return update(authUser, phaseId, data, true);
}

fullyUpdatePhase.schema = {
  authUser: Joi.any(),
  phaseId: Joi.id(),
  data: Joi.object()
    .keys({
      name: Joi.string().required(),
      description: Joi.string(),
      isOpen: Joi.boolean().required(),
      duration: Joi.number().positive().required(),
    })
    .required(),
};

/**
 * Partially update phase.
 * @param {Object} authUser auth user
 * @param {String} phaseId the phase id
 * @param {Object} data the phase data to be updated
 * @returns {Object} the updated phase
 */
async function partiallyUpdatePhase (authUser, phaseId, data) {
  return update(authUser, phaseId, data);
}

partiallyUpdatePhase.schema = {
  authUser: Joi.any(),
  phaseId: Joi.id(),
  data: Joi.object()
    .keys({
      name: Joi.string(),
      description: Joi.string(),
      isOpen: Joi.boolean(),
      duration: Joi.number().positive(),
    })
    .required(),
};

/**
 * Delete phase.
 * @param {String} phaseId the phase id
 * @returns {Object} the deleted phase
 */
async function deletePhase(phaseId) {
  let ret = await getPhase(phaseId)
  await prisma.phase.delete({ where: { id: phaseId } })
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengePhaseDeleted, ret);
  return ret;
}

deletePhase.schema = {
  phaseId: Joi.id(),
};

async function validatePhases(phases) {
  if (!phases || phases.length === 0) {
    return;
  }
  const searchPhasesResult = await searchPhases(); // get all phases
  const records = searchPhasesResult.result;
  const map = new Map();
  _.each(records, (r) => {
    map.set(r.id, r);
  });
  const invalidPhases = _.filter(phases, (p) => !map.has(p.phaseId));
  if (invalidPhases.length > 0) {
    throw new errors.BadRequestError(
      `The following phases are invalid: ${toString(invalidPhases)}`
    );
  }
}

module.exports = {
  searchPhases,
  createPhase,
  validatePhases,
  getPhase,
  fullyUpdatePhase,
  partiallyUpdatePhase,
  deletePhase,
};

logger.buildService(module.exports);
