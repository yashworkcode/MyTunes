const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT for a user
 * @param {string} id - MongoDB user _id
 * @returns {string} signed JWT
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

module.exports = generateToken;
