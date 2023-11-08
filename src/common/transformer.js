const _ = require("lodash");
const { compareVersions } = require("compare-versions");
const challengeService = require("../services/ChallengeService");

function transformData(data, fieldsToDelete) {
  if (!fieldsToDelete || !fieldsToDelete.length) {
    return data;
  }

  if (_.isArray(data)) {
    _.each(data, (item, index) => {
      data[index] = transformData(item, fieldsToDelete);
    });
  } else if (_.isObject(data)) {
    for (const field of fieldsToDelete) {
      delete data[field];
    }
    if (data.result) {
      data.result = transformData(data.result, fieldsToDelete);
    }
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

        // No transform need for this method
        if (!serviceConfig.methods.includes(methodName)) {
          return await method.apply(this, args.slice(1));
        }

        // args[0] is request, get version header
        const request = args[0];
        const apiVersion = request.headers["app-version"] || "1.0.0";

        const fieldsToDelete = [];
        _.each(serviceConfig.fieldsVersion, (version, field) => {
          // If input version less than required version, delete fields
          if (compareVersions(apiVersion, version) < 0) {
            fieldsToDelete.push(field);
          }
        });

        // Transform request body by deleting fields
        if (_.isArray(request.body) || _.isObject(request.body)) {
          transformData(request.body, fieldsToDelete);
        }

        const data = await method.apply(this, args.slice(1));

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
