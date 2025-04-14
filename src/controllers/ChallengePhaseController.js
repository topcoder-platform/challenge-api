/**
 * Controller for challenge phase endpoints
 */
const HttpStatus = require("http-status-codes");
const service = require("../services/PhaseService");
const helper = require("../common/helper");

/**
 * Search phases
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function searchPhases(req, res) {
  const result = await service.searchPhases(req.query);
  helper.setResHeaders(req, res, result);
  res.send(result.result);
}

/**
 * Create phase
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function createPhase(req, res) {
  const result = await service.createPhase(req.authUser, req.body);
  res.status(HttpStatus.CREATED).send(result);
}

/**
 * Get phase
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getPhase(req, res) {
  const result = await service.getPhase(req.params.challengePhaseId);
  res.send(result);
}

/**
 * Fully update phase
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function fullyUpdatePhase(req, res) {
  const result = await service.fullyUpdatePhase(req.authUser, req.params.challengePhaseId, req.body);
  res.send(result);
}

/**
 * Partially update phase
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function partiallyUpdatePhase(req, res) {
  const result = await service.partiallyUpdatePhase(req.authUser, req.params.challengePhaseId, req.body);
  res.send(result);
}

/**
 * Delete phase
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function deletePhase(req, res) {
  const result = await service.deletePhase(req.params.challengePhaseId);
  res.send(result);
}

module.exports = {
  searchPhases,
  createPhase,
  getPhase,
  fullyUpdatePhase,
  partiallyUpdatePhase,
  deletePhase,
};
