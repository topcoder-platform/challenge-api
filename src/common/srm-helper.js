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

const PracticeProblemsKeyMappings = _.reduce(
  [
    "problemId",
    "componentId",
    "roomId",
    "roundId",
    "divisionId",
    "problemName",
    "problemType",
    "difficulty",
    "status",
    "points",
    "myPoints",
  ],
  (acc, field) => ({ ...acc, [_.toLower(field)]: field }),
  {}
);

/**
 * Get schedule query
 * @param {Object} filter the query filter
 * @param {Array<String>} filter.statuses the statues
 * @param {Date} filter.registrationStartTimeAfter the start of the registration time
 * @param {Date=} filter.registrationStartTimeBefore the end of the registration time
 */
function getSRMScheduleQuery(filter) {
  const statuses = _.join(
    _.map(filter.statuses, (s) => `'${_.toUpper(s)}'`),
    ","
  );
  const registrationTimeFilter = `reg.start_time >= '${moment(
    filter.registrationStartTimeAfter
  ).format("yyyy-MM-DD HH:mm:ss")}'${
    filter.registrationStartTimeBefore
      ? ` AND reg.start_time <= '${moment(filter.registrationStartTimeBefore).format(
          "yyyy-MM-DD HH:mm:ss"
        )}'`
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

/**
 * Get schedule query
 * @param {Object} criteria the query criteria
 * @param {String} criteria.userId the user id
 * @param {String} criteria.sortBy the sort field
 * @param {String} criteria.sortOrder the sort order
 * @param {Number} criteria.page the sort order
 * @param {Number} criteria.perPage the sort order
 * @param {String=} criteria.difficulty the sort order
 * @param {String=} criteria.status the sort order
 * @param {Number=} criteria.pointsLowerBound the sort order
 * @param {Number=} criteria.pointsUpperBound the statues
 * @param {String=} criteria.problemName the start of the registration time
 */
function getPracticeProblemsQuery(criteria) {
  const offset = (criteria.page - 1) * criteria.perPage;
  let sortBy = criteria.sortBy;
  if (criteria.sortBy === "problemId") {
    sortBy = "p.problem_id";
  } else if (criteria.sortBy === "problemName") {
    sortBy = "p.name";
  } else if (criteria.sortBy === "problemType") {
    sortBy = "ptl.problem_type_desc";
  } else if (criteria.sortBy === "points") {
    sortBy = "rc.points";
  } else if (criteria.sortBy === "difficulty") {
    sortBy = "p.proposed_difficulty_id";
  } else if (criteria.sortBy === "status") {
    sortBy = "pcs.status_id";
  } else if (criteria.sortBy === "myPoints") {
    sortBy = "pcs.point";
  }
  const filters = [];
  if (criteria.difficulty) {
    if (criteria.difficulty === "easy") {
      filters.push(`p.proposed_difficulty_id=1`);
    } else if (criteria.difficulty === "medium") {
      filters.push(`p.proposed_difficulty_id=2`);
    } else if (criteria.difficulty === "hard") {
      filters.push(`p.proposed_difficulty_id=3`);
    }
  }
  if (criteria.status) {
    if (criteria.status === "new") {
      filters.push("NVL(pcs.status_id, 0) < 120");
    } else if (criteria.status === "viewed") {
      filters.push("pcs.status_id >= 120 AND pcs.status_id != 150");
    } else if (criteria.status === "solved") {
      filters.push("pcs.status_id = 150");
    }
  }
  if (criteria.pointsLowerBound) {
    filters.push(`rc.points >= ${criteria.pointsLowerBound}`);
  }
  if (criteria.pointsUpperBound) {
    filters.push(`rc.points <= ${criteria.pointsUpperBound}`);
  }
  if (criteria.problemName) {
    filters.push(
      `lower(p.name) like '%${_.toLower(_.replace(criteria.problemName, /[^a-z0-9]/gi, ""))}%'`
    );
  }

  const query = `SELECT
  SKIP ${offset}
  FIRST ${criteria.perPage}
    p.problem_id AS problemId
  , c.component_id AS componentId
  , ro.room_id AS roomId
  , rc.round_id AS roundId
  , rc.division_id AS divisionId
  , p.name AS problemName
  , ptl.problem_type_desc AS problemType
  , CASE WHEN (p.problem_type_id = 1 AND p.proposed_difficulty_id = 1) THEN 'Easy'::nvarchar(50)
         WHEN (p.problem_type_id = 1 AND p.proposed_difficulty_id = 2) THEN 'Medium'::nvarchar(50)
         WHEN (p.problem_type_id = 1 AND p.proposed_difficulty_id = 3) THEN 'Hard'::nvarchar(50)
      END AS difficulty
  , rc.points AS points
  , CASE WHEN NVL(pcs.status_id, 0) < 120 THEN 'New'::nvarchar(50)
         WHEN pcs.status_id = 150 THEN 'Solved'::nvarchar(50)
         WHEN pcs.status_id >= 120 AND pcs.status_id != 150 THEN 'Viewed'::nvarchar(50)
      END AS status
  , NVL(pcs.points, 0) AS myPoints
  FROM informixoltp:problem p
  INNER JOIN informixoltp:problem_type_lu ptl ON ptl.problem_type_id = p.problem_type_id
  INNER JOIN informixoltp:component c ON c.problem_id = p.problem_id
  INNER JOIN informixoltp:round_component rc ON rc.component_id = c.component_id
  INNER JOIN informixoltp:round r ON r.round_id = rc.round_id AND r.status = 'A' AND r.round_type_id = 3
  INNER JOIN informixoltp:room ro ON ro.round_id = rc.round_id AND ro.room_type_id = 3
  LEFT  JOIN informixoltp:component_state pcs ON pcs.round_id = rc.round_id AND pcs.component_id = c.component_id AND pcs.coder_id = ${
    criteria.userId
  }
  WHERE ${_.join(filters, " AND ")}
  ORDER BY ${sortBy} ${criteria.sortOrder}
  `;
  return query;
}

function convertSRMScheduleQueryOutput(queryOutput) {
  return transformDatabaseResponse(queryOutput, SRMScheduleKeyMappings);
}

function convertPracticeProblemsQueryOutput(queryOutput) {
  return transformDatabaseResponse(queryOutput, PracticeProblemsKeyMappings);
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
  getPracticeProblemsQuery,
  convertPracticeProblemsQueryOutput,
};
