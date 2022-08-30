import Joi from "joi";
const validator = (schema) => (payload) => schema.validate(payload);

const userSchema = Joi.object({
  name: Joi.string().required(),
});

const validateUser = validator(userSchema);

export { validateUser };
