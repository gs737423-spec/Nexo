"use strict";

const application = require("../server");

module.exports = (request, response) => {
  application.emit("request", request, response);
};
