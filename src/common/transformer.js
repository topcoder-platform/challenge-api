const _ = require("lodash");
const { compareVersions } = require("compare-versions");
const challengeService = require("../services/ChallengeService");

function transformData(data, fieldsToDelete) {
  if (!fieldsToDelete || !fieldsToDelete.length) {
    return data;
  }

  if (_.isArray(data)) {
    return data.map((item) => transformData(item, fieldsToDelete));
  } else if (_.isObject(data)) {
    const clonedData = { ...data };
    for (const field of fieldsToDelete) {
      delete clonedData[field];
    }
    if (clonedData.result) {
      clonedData.result = transformData(clonedData.result, fieldsToDelete);
    }
    return clonedData;
  }

  return data;
}

function transformServices() {
  _.each(services, (service, serviceName) => {
    const serviceConfig = servicesConfig[serviceName];
    if (!serviceConfig) {
      return;
    }

    _.each(service, (method, methodName) => {
      service[methodName] = async function () {
        const args = Array.prototype.slice.call(arguments);
        const data = await method.apply(this, args.slice(1));

        // No transform need for this method
        if (!serviceConfig.methods.includes(methodName)) {
          return data;
        }

        // args[0] is request, get version header
        const apiVersion = args[0].headers["challenge-api-version"] || "1.0.0";

        const fieldsToDelete = [];
        _.each(serviceConfig.fieldsVersion, (version, field) => {
          // If input version less than required version, delete fields from response
          if (compareVersions(apiVersion, version) < 0) {
            fieldsToDelete.push(field);
          }
        });

        // Transform response data by deleting fields
        return transformData(data, fieldsToDelete);
      };
      service[methodName].params = ["req", ...method.params];
    });
  });
}

// Define the version config for services
const servicesConfig = {
  challengeService: {
    methods: ["searchChallenges", "getChallenge", "createChallenge", "updateChallenge"],
    fieldsVersion: {
      skills: "1.1.0",
      payments: "2.0.0",
    },
  },
};

// Define the services to export
const services = {
  challengeService,
};

// Transform services before export
transformServices();

module.exports = services;
