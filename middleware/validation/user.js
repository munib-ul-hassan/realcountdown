const Joi = require('joi').extend(require('@joi/date'));

const agentSchemaStepOne = Joi.object({
    name: Joi.string().min(3).max(30),
    screenName: Joi.string(),
    email: Joi.string().email().lowercase(),
    password: Joi.string().pattern(
        new RegExp(
            '^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$'
        )
    ),
    professionalCategory: Joi.string(),
    professionalTitle: Joi.string(),
    phone: Joi.number(),
    brokeragePhone: Joi.number(),
});
const agentSchemaStepTwo = Joi.object({
    email: Joi.string().email().lowercase(),
    city: Joi.string().min(4),
    timeZone: Joi.string(),
    brokerageAddress: Joi.string(),
    primaryPhone: Joi.string(),
    brokeragePhone: Joi.number(),
});
const agentSchemaStepThree = Joi.object({
    email: Joi.string().email().lowercase(),
    state: Joi.string(),
    date: Joi.date().format('YYYY-MM-DD'),
    description: Joi.string(),
    license: Joi.string(),
    serviceAreas: Joi.string(),
    commision: Joi.number().integer().min(0).max(3),
    option: Joi.string(),
});
const agentSchemaStepFour = Joi.object({
    email: Joi.string().email().lowercase(),
    reviewOne: Joi.string(),
    reviewTwo: Joi.string(),
    reviewThree: Joi.string(),
});
const buyerSchema = Joi.object({
    name: Joi.string().min(3).max(30),
    email: Joi.string().email().lowercase().required(),
    password: Joi.string()
        .pattern(
            new RegExp(
                '^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$'
            )
        )
        .required(),
    zipCode: Joi.number(),
    license: Joi.number(),
    phone: Joi.number(),
    address: Joi.string(),
    type: Joi.string(),
});
// Seller Schema
const sellerSchema = Joi.object({
    name: Joi.string().min(3).max(30),
    email: Joi.string().email().lowercase().required(),
    password: Joi.string()
        .pattern(
            new RegExp(
                '^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$'
            )
        )
        .required(),
    zipCode: Joi.number(),
    license: Joi.string(),
    phone: Joi.number(),
    address: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
});
module.exports = {
    agentSchemaStepOne,
    agentSchemaStepTwo,
    agentSchemaStepThree,
    agentSchemaStepFour,
    buyerSchema,
    sellerSchema,
};
