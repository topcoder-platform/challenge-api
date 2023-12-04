/**
 * Controller for Topgear.
 */
const service = require("../services/TopgearService");

/**
 * Get Topgear trending technologies.
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getTechTrending(req, res) {
  const result = await service.getTechTrending(req.authUser, {
    ...req.query,
    ...req.body,
  });
  res.send(result);
}

/**
 * Get Topgear member badges.
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function getMemberBadges(req, res) {
  const result = await service.getMemberBadges(req.authUser, {
    ...req.query,
    ...req.body,
  });
  res.send(result);
}

/**
 * Search Topgear challenges.
 * @param {Object} req the request
 * @param {Object} res the response
 */
async function searchChallenges(req, res) {
  const result = await service.searchChallenges(req.authUser, {
    ...req.query,
    ...req.body,
  });
  if (result.cursor) {
    res.header("X-Cursor", result.cursor);
  }
  res.send(result.challenges);
}

module.exports = {
  getTechTrending,
  getMemberBadges,
  searchChallenges,
};
