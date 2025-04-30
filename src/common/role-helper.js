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

/**
 * Check if the user has project manager role
 * @param {Object} authUser the user
 */
function hasProjectManagerRole(authUser) {
  if (authUser && authUser.roles) {
    for (const role of authUser.roles) {
      if (role.toLowerCase() === constants.UserRoles.ProjectManager.toLowerCase()) {
        return true;
      }
    }
  }
  return false;
}

module.exports = {
  hasAdminRole,
  hasProjectManagerRole,
};
