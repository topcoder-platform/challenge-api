const _ = require("lodash");

const axios = require("axios");
const config = require("config");
const HttpStatus = require("http-status-codes");
const m2mHelper = require("./m2m-helper");
const { hasAdminRole } = require("./role-helper");
const errors = require("./errors");

class ProjectHelper {
  /**
   * Get Project Details
   * @param {String} projectId the project id
   * @param {String} currentUser the user
   *
   * @returns {Promise<object>} the project details
   */
  async getProject(projectId, currentUser) {
    let token = await m2mHelper.getM2MToken();
    const url = `${config.PROJECTS_API_URL}/${projectId}`;
    try {
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (currentUser.isMachine || hasAdminRole(currentUser)) {
        return res.data;
      }
      if (
        _.get(res, "data.type") === "self-service" &&
        _.includes(config.SELF_SERVICE_WHITELIST_HANDLES, currentUser.handle.toLowerCase())
      ) {
        return res.data;
      }
      if (
        !_.find(
          _.get(res, "data.members", []),
          (m) => _.toString(m.userId) === _.toString(currentUser.userId)
        )
      ) {
        throw new errors.ForbiddenError(`You don't have access to project with ID: ${projectId}`);
      }
      return res.data;
    } catch (err) {
      if (_.get(err, "response.status") === HttpStatus.NOT_FOUND) {
        throw new errors.BadRequestError(`Project with id: ${projectId} doesn't exist`);
      } else {
        // re-throw other error
        throw err;
      }
    }
  }

  /**
   * This functions gets the default billing account for a given project id
   *
   * @param {Number} projectId The id of the project for which to get the default terms of use
   * @returns {Promise<Number>} The billing account ID
   */
  async getProjectBillingInformation(projectId) {
    const token = await m2mHelper.getM2MToken();
    const projectUrl = `${config.PROJECTS_API_URL}/${projectId}/billingAccount`;
    try {
      const res = await axios.get(projectUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let markup = _.get(res, "data.markup", null)
        ? _.toNumber(_.get(res, "data.markup", null))
        : null;

      if (markup && markup > 0) {
        markup = (markup * 100) / 10000;
      }
      return {
        billingAccountId: _.get(res, "data.tcBillingAccountId", null),
        markup,
      };
    } catch (err) {
      const responseCode = _.get(err, "response.status");

      if (responseCode === HttpStatus.NOT_FOUND) {
        return {
          billingAccountId: null,
          markup: null,
        };
      } else {
        throw err;
      }
    }
  }
}

module.exports = new ProjectHelper();
