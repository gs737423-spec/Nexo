"use strict";

// Vercel's Node runtime expects a request handler at /api. The application
// already implements the full HTTP contract using Node's request/response
// objects, so forward the request to the existing server without opening a
// long-lived local listener.
const application = require("../server");

module.exports = (request, response) => {
  application.emit("request", request, response);
};
