const { join } = require("pathe");

module.exports = require("node-gyp-build")(join(__dirname, "../.."));
module.exports.nodeTypeInfo = require("../../src/node-types.json");
