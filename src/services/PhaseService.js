/**
 * This service provides operations of phases.
 */
const { GRPC_CHALLENGE_SERVER_HOST, GRPC_CHALLENGE_SERVER_PORT } = process.env;

const { PhaseDomain } = require("@topcoder-framework/domain-challenge");

const {
  DomainHelper: { getScanCriteria, getLookupCriteria },
} = require("@topcoder-framework/lib-common");

const _ = require("lodash");
const Joi = require("joi");
const helper = require("../common/helper");
const logger = require("../common/logger");
const constants = require("../../app-constants");
const errors = require("../common/errors");

const phaseDomain = new PhaseDomain(GRPC_CHALLENGE_SERVER_HOST, GRPC_CHALLENGE_SERVER_PORT);

/**
 * Search phases
 * @param {Object} criteria the search criteria
 * @returns {Object} the search result
 */
async function searchPhases(criteria = {}) {
  const scanCriteria = getScanCriteria(_.omit(criteria, ["page", "perPage"]));

  const page = criteria.page || 1;
  const perPage = criteria.perPage || 50;

  const { items: list } = await phaseDomain.scan({
    criteria: scanCriteria,
  });

  const total = list.length;
  const result = list.slice((page - 1) * perPage, page * perPage);

  return { total, page, perPage, result };
}

searchPhases.schema = {
  criteria: Joi.object().keys({
    page: Joi.page(),
    perPage: Joi.perPage().default(100),
    name: Joi.string(),
  }),
};

/**
 * Create phase.
 * @param {Object} phase the phase to created
 * @returns {Object} the created phase
 */
async function createPhase(phase) {
  const { items: existingByName } = await phaseDomain.scan({
    criteria: getScanCriteria({ name: phase.name }),
  });
  if (existingByName.length > 0)
    throw new errors.ConflictError(`Phase with name ${phase.name} already exists`);
  const ret = await phaseDomain.create(phase);
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengePhaseCreated, ret);
  return ret;
}

createPhase.schema = {
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
  return phaseDomain.lookup(getLookupCriteria("id", phaseId));
}

getPhase.schema = {
  phaseId: Joi.id(),
};

/**
 * Update phase.
 * @param {String} phaseId the phase id
 * @param {Object} data the phase data to be updated
 * @param {Boolean} isFull the flag indicate it is a fully update operation.
 * @returns {Object} the updated phase
 */
async function update(phaseId, data, isFull) {
  const phase = await getPhase(phaseId);

  if (data.name && data.name.toLowerCase() !== phase.name.toLowerCase()) {
    const { items } = await phaseDomain.scan({
      criteria: getScanCriteria({ name: data.name }),
    });
    if (items.length > 0)
      throw new errors.ConflictError(`Phase with name ${phase.name} already exists`);
  }

  if (isFull) {
    // description is optional field, can be undefined
    phase.description = data.description;
  }
  const { items } = await phaseDomain.update({
    filterCriteria: getScanCriteria({ id: phaseId }),
    updateInput: data,
  });
  // post bus event
  await helper.postBusEvent(
    constants.Topics.ChallengePhaseUpdated,
    isFull ? items[0] : _.assignIn({ id: phaseId }, data)
  );
  return items[0];
}

/**
 * Fully update phase.
 * @param {String} phaseId the phase id
 * @param {Object} data the phase data to be updated
 * @returns {Object} the updated phase
 */
async function fullyUpdatePhase(phaseId, data) {
  return update(phaseId, data, true);
}

fullyUpdatePhase.schema = {
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
 * @param {String} phaseId the phase id
 * @param {Object} data the phase data to be updated
 * @returns {Object} the updated phase
 */
async function partiallyUpdatePhase(phaseId, data) {
  return update(phaseId, data);
}

partiallyUpdatePhase.schema = {
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
  const { items } = await phaseDomain.delete(getLookupCriteria("id", phaseId));
  // post bus event
  await helper.postBusEvent(constants.Topics.ChallengePhaseDeleted, items[0]);
  return items[0];
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
