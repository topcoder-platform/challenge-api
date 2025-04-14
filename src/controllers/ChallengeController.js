/**
 * Controller for challenge endpoints
 */
const HttpStatus = require("http-status-codes");
const service = require("../services/ChallengeService");
const helper = require("../common/helper");
const logger = require("../common/logger");

/**
 * Search challenges
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function searchChallenges(req, res) {
  let result = await service.searchChallenges(req.authUser, {
    ...req.query,
    ...req.body,
  });
  if (!result.total && req.query.legacyId) {
    // maybe the legacyId is roundId for mm challenge
    // mm challenge use projectId as legacyId
    try {
      logger.debug(`Staring to get mm challengeId`);
      const legacyId = await helper.getProjectIdByRoundId(req.query.legacyId);
      logger.debug(`Get mm challengeId successfully ${legacyId}`);
      result = await service.searchChallenges(req, req.authUser, {
        ...req.query,
        ...req.body,
        legacyId,
      });
      logger.debug(`Get mm challenge successfully`);
    } catch (e) {
      logger.debug(`Failed to get projectId  with error: ${e.message}`);
    }
  } else {
    if (req.query.legacyId) {
      logger.debug(`Skipped to get mm challenge`);
    }
  }
  helper.setResHeaders(req, res, result);
  res.send(result.result);
}

/**
 * Create challenge
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function createChallenge(req, res) {
  logger.debug(
    `createChallenge User: ${JSON.stringify(req.authUser)} - Body: ${JSON.stringify(req.body)}`
  );
  const result = await service.createChallenge(req.authUser, req.body, req.userToken);
  res.status(HttpStatus.CREATED).send(result);
}

/**
 * send notifications
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function sendNotifications(req, res) {
  const result = await service.sendNotifications(req.authUser, req.params.challengeId);
  res.status(HttpStatus.CREATED).send(result);
}

/**
 * Get challenge
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getChallenge(req, res) {
  const result = await service.getChallenge(
    req.authUser,
    req.params.challengeId,
    req.query.checkIfExists
  );
  res.send(result);
}

/**
 * Get challenge statistics
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getChallengeStatistics(req, res) {
  const result = await service.getChallengeStatistics(req.authUser, req.params.challengeId);
  res.send(result);
}

/**
 * Partially update challenge
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function updateChallenge(req, res) {
  logger.debug(
    `updateChallenge User: ${JSON.stringify(req.authUser)} - ChallengeID: ${
      req.params.challengeId
    } - Body: ${JSON.stringify(req.body)}`
  );
  const result = await service.updateChallenge(req.authUser, req.params.challengeId, req.body);
  res.send(result);
}

/**
 * Delete challenge
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function deleteChallenge(req, res) {
  logger.debug(
    `deleteChallenge User: ${JSON.stringify(req.authUser)} - ChallengeID: ${req.params.challengeId}`
  );
  const result = await service.deleteChallenge(req.authUser, req.params.challengeId);
  res.send(result);
}

/**
 * Advance phase
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function advancePhase(req, res) {
  res.send(await service.advancePhase(req, req.authUser, req.params.challengeId, req.body));
}

module.exports = {
  searchChallenges,
  createChallenge,
  getChallenge,
  updateChallenge,
  deleteChallenge,
  getChallengeStatistics,
  sendNotifications,
  advancePhase,
};
