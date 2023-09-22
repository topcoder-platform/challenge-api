const _ = require("lodash");
const config = require("config");
const m2mAuth = require("tc-core-library-js").auth.m2m;

class M2MHelper {
  static m2m = null;

  constructor() {
    M2MHelper.m2m = m2mAuth(
      _.pick(config, ["AUTH0_URL", "AUTH0_AUDIENCE", "TOKEN_CACHE_TIME", "AUTH0_PROXY_SERVER_URL"])
    );
  }
  /**
   * Get M2M token.
   * @returns {Promise<String>} the M2M token
   */
  getM2MToken() {
    return M2MHelper.m2m.getMachineToken(config.AUTH0_CLIENT_ID, config.AUTH0_CLIENT_SECRET);
  }
}

module.exports = new M2MHelper();
