/**
 * App bootstrap
 */
global.Promise = require("bluebird");
const Joi = require("joi");

Joi.optionalId = () => Joi.string().uuid();
Joi.id = () => Joi.optionalId().required();
Joi.page = () => Joi.number().integer().min(1).default(1);
Joi.perPage = () => Joi.number().integer().min(1).max(100).default(20);
Joi.fileSize = () => Joi.number().integer().min(0).default(0);
