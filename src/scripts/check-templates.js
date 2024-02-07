const _ = require("lodash");
const axios = require("axios");
const TEMPLATE_ID = "2d0807fa-ece1-4328-a260-76f5f6b559e0"; // RUX challenge
// const TEMPLATE_ID = '7ebf1c69-f62f-4d3a-bdfb-fe9ddb56861c' // dev challenge
// const TEMPLATE_ID = 'd4201ca4-8437-4d63-9957-3f7708184b07' // design with checkpoint
async function main() {
  let res;
  res = await axios.get("http://api.topcoder-dev.com/v5/timeline-templates");
  const template = _.find(res.data, (entry) => entry.id === TEMPLATE_ID);
  res = await axios.get("http://api.topcoder-dev.com/v5/challenge-phases");
  const phases = res.data;
  _.each(template.phases, (phase) => {
    const phaseInstance = _.find(phases, (p) => p.id === phase.phaseId);
    const pred = phase.predecessor ? _.find(phases, (p) => p.id === phase.predecessor) : null;
    console.log(
      `Phase Length: ${phase.defaultDuration / 60 / 60} hrs \t ${phaseInstance.name} - Depends on ${
        pred ? pred.name : "nothing"
      }`
    );
  });
}
main();
