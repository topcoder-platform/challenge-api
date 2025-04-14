/**
 * Controller for challenge type endpoints
 */
const HttpStatus = require("http-status-codes");
const service = require("../services/ChallengeTypeService");
const helper = require("../common/helper");

/**
 * Search challenge types
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function searchChallengeTypes(req, res) {
  const result = await service.searchChallengeTypes(req.query);
  helper.setResHeaders(req, res, result);
  res.send(result.result);
}

/**
 * Create challenge type
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function createChallengeType(req, res) {
  const result = await service.createChallengeType(req.authUser, req.body);
  res.status(HttpStatus.CREATED).send(result);
}

/**
 * Get challenge type
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getChallengeType(req, res) {
  const result = await service.getChallengeType(req.params.challengeTypeId);
  res.send(result);
}

/**
 * Fully update challenge type
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function fullyUpdateChallengeType(req, res) {
  const result = await service.fullyUpdateChallengeType(req.authUser, req.params.challengeTypeId, req.body);
  res.send(result);
}

/**
 * Partially update challenge type
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function partiallyUpdateChallengeType(req, res) {
  const result = await service.partiallyUpdateChallengeType(req.authUser, req.params.challengeTypeId, req.body);
  res.send(result);
}

/**
 * Delete challenge type
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function deleteChallengeType(req, res) {
  const result = await service.deleteChallengeType(req.params.challengeTypeId);
  res.send(result);
}

module.exports = {
  searchChallengeTypes,
  createChallengeType,
  getChallengeType,
  fullyUpdateChallengeType,
  partiallyUpdateChallengeType,
  deleteChallengeType,
};
