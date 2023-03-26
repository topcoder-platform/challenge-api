const constants = require("../../app-constants");

/**
 * Check if the user has admin role
 * @param {Object} authUser the user
 */
function hasAdminRole(authUser) {
  if (authUser && authUser.roles) {
    for (const role of authUser.roles) {
      if (role.toLowerCase() === constants.UserRoles.Admin.toLowerCase()) {
        return true;
      }
    }
  }
  return false;
}

module.exports = {
  hasAdminRole,
};
