const _ = require("lodash");
const moment = require("moment");

const SRMScheduleKeyMappings = _.reduce(
  [
    "roundId",
    "name",
    "shortName",
    "contestName",
    "roundType",
    "status",
    "registrationStartTime",
    "registrationEndTime",
    "codingStartTime",
    "codingEndTime",
    "intermissionStartTime",
    "intermissionEndTime",
    "challengeStartTime",
    "challengeEndTime",
    "systestStartTime",
    "systestEndTime",
  ],
  (acc, field) => ({ ...acc, [_.toLower(field)]: field }),
  {}
);

/**
 * Get schedule query
 * @param {Object} filter the query filter
 * @param {Array<String>} filter.statuses the statues
 * @param {Date} filter.registrationStartTimeAfter the start of the registration time
 * @param {Date} filter.registrationStartTimeBefore the end of the registration time
 */
function getSRMScheduleQuery(filter) {
  const statuses = _.join(
    _.map(filter.statuses, (s) => `'${_.toUpper(s)}'`),
    ","
  );
  const registrationTimeFilter = `reg.start_time >= ${moment(
    filter.registrationStartTimeAfter
  ).format("yyyy-MM-DD HH:mm:ss")}${
    filter.registrationStartTimeBefore
      ? ` AND reg.start_time <= ${moment(filter.registrationStartTimeBefore).format(
          "yyyy-MM-DD HH:mm:ss"
        )}`
      : ""
  }`;

  const query = `SELECT 
  FIRST 50
  r.round_id AS roundId
  , r.name AS name
  , r.short_name AS shortName
  , c.name AS contestName
  , rt.round_type_desc AS roundType
  , r.status AS status
  , reg.start_time AS registrationStartTime
  , reg.end_time AS registrationEndTime
  , coding.start_time AS codingStartTime
  , coding.end_time AS codingEndTime
  , intermission.start_time AS intermissionStartTime
  , intermission.end_time AS intermissionEndTime
  , challenge.start_time AS challengeStartTime
  , challenge.end_time AS challengeEndTime
  , systest.start_time AS systestStartTime
  , systest.end_time AS systestEndTime
  FROM  
  informixoltp:contest AS c
  INNER JOIN informixoltp:round AS r ON r.contest_id = c.contest_id
  INNER JOIN informixoltp:round_type_lu AS rt ON rt.round_type_id = r.round_type_id
  LEFT JOIN informixoltp:round_segment AS reg ON reg.round_id = r.round_id AND reg.segment_id = 1
  LEFT JOIN informixoltp:round_segment AS coding ON coding.round_id = r.round_id AND coding.segment_id = 2
  LEFT JOIN informixoltp:round_segment AS intermission ON intermission.round_id = r.round_id AND intermission.segment_id = 3
  LEFT JOIN informixoltp:round_segment AS challenge ON challenge.round_id = r.round_id AND challenge.segment_id = 4
  LEFT JOIN informixoltp:round_segment AS systest ON systest.round_id = r.round_id AND systest.segment_id = 5
  WHERE  
  r.round_type_id in (1,2,10) AND
  UPPER(r.status) in (${statuses}) AND 
  ${registrationTimeFilter}
  ORDER BY 
  reg.start_time DESC`;
  return query;
}

function convertSRMScheduleQueryOutput(queryOutput) {
  return transformDatabaseResponse(queryOutput, SRMScheduleKeyMappings);
}

function transformDatabaseResponse(databaseResponse, keyMappings) {
  const transformedData = [];

  if (databaseResponse && databaseResponse.rows && Array.isArray(databaseResponse.rows)) {
    databaseResponse.rows.forEach((row) => {
      const record = {};
      if (row.fields && Array.isArray(row.fields)) {
        row.fields.forEach((field) => {
          const lowercaseKey = field.key.toLowerCase();
          const mappedKey = keyMappings[lowercaseKey] || lowercaseKey;
          record[mappedKey] = field.value;
        });
      }
      transformedData.push(record);
    });
  }
  return transformedData;
}

module.exports = {
  getSRMScheduleQuery,
  convertSRMScheduleQueryOutput,
};
