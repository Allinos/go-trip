/**
 * Convert BigInt values to strings in an object (for JSON serialization)
 * @param {*} obj - Object with potential BigInt values
 * @returns {*} - Object with BigInts converted to strings
 */
const serializeBigInt = (obj) => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "bigint") {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }

  if (typeof obj === "object") {
    const result = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = serializeBigInt(obj[key]);
      }
    }
    return result;
  }

  return obj;
};

/**
 * Global BigInt JSON serialization fix
 * Call this once in your app.js/server.js
 */
const enableBigIntSerialization = () => {
  // Override BigInt prototype toJSON
  BigInt.prototype.toJSON = function () {
    return this.toString();
  };
};

module.exports = {
  serializeBigInt,
  enableBigIntSerialization,
};
