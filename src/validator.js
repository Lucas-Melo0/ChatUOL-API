import Joi from "joi";
const validator = (schema) => (payload) => schema.validate(payload);

const userSchema = Joi.object({
  name: Joi.string().required(),
});

const messageSchema = Joi.object({
  to: Joi.string().required(),
  text: Joi.string().required(),
  type: Joi.string()
    .required()
    .pattern(/^private_message|message/),
});

const validateUser = validator(userSchema);
const validateMessage = validator(messageSchema);

export { validateUser, validateMessage };
