const _ = require("lodash");
const errors = require("./errors");
const helper = require("./helper");

const { hasAdminRole } = require("./role-helper");

class GroupHelper {
  /**
   * Ensure the user can access the groups being updated to
   * @param {Object} currentUser the user who perform operation
   * @param {Object} data the challenge data to be updated
   * @param {String} challenge the original challenge data
   */
  async ensureAcessibilityToModifiedGroups(currentUser, data, challenge) {
    const needToCheckForGroupAccess = !currentUser
      ? true
      : !currentUser.isMachine && !hasAdminRole(currentUser);
    if (!needToCheckForGroupAccess) {
      return;
    }
    const userGroups = await helper.getUserGroups(currentUser.userId);
    const userGroupsIds = _.map(userGroups, (group) => group.id);
    const updatedGroups = _.difference(
      _.union(challenge.groups, data.groups),
      _.intersection(challenge.groups, data.groups)
    );
    const filtered = updatedGroups.filter((g) => !userGroupsIds.includes(g));
    if (filtered.length > 0) {
      throw new errors.ForbiddenError(
        "ensureAcessibilityToModifiedGroups :: You don't have access to this group!"
      );
    }
  }
}

module.exports = new GroupHelper();
