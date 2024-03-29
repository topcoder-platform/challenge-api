/**
 * Migrate Data from Dynamo DB to ES
 */

const config = require("config");
const logger = require("../common/logger");
const helper = require("../common/helper");
const models = require("../models");
const _ = require("lodash");

const esClient = helper.getESClient();

async function indexChallenge(challenge) {
  console.log("Indexing challenge", challenge.id);
  try {
    await esClient.update({
      index: config.get("ES.ES_INDEX"),
      type: config.get("ES.OPENSEARCH") == "false" ? config.get("ES.ES_TYPE") : undefined,
      id: challenge.id,
      body: { doc: challenge, doc_as_upsert: true },
    });
  } catch (err) {
    console.log("Error indexing challenge", challenge.id, err);
  }
}

/*
 * Migrate records from DB to ES
 */
async function migrateRecords() {
  let results = await models["Challenge"].scan().exec();
  let lastKey = results.lastKey;

  for (const challenge of results) {
    await indexChallenge(challenge);
  }

  while (!_.isUndefined(results.lastKey)) {
    const results = await models["Challenge"].scan().startAt(lastKey).exec();
    for (const challenge of results) {
      await indexChallenge(challenge);
    }

    lastKey = results.lastKey;
  }
}

migrateRecords()
  .then(() => {
    logger.info("Done");
    process.exit();
  })
  .catch((err) => {
    logger.logFullError(err);
    process.exit(1);
  });
