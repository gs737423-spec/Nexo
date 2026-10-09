"use strict";

// Vercel's Node runtime expects a request handler at /api. The application
// already implements the full HTTP contract using Node's request/response
// objects, so forward the request to the existing server without opening a
// long-lived local listener.
const application = require("../server");

module.exports = async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  const forwardedPath = url.searchParams.get("__nexo_api_path");
  if (forwardedPath) {
    url.searchParams.delete("__nexo_api_path");
    const query = url.searchParams.toString();
    request.url = `/api/${forwardedPath.replace(/^\/+/, "")}${query ? `?${query}` : ""}`;
  }
  await new Promise((resolve, reject) => {
    const finish = () => {
      response.removeListener("finish", finish);
      response.removeListener("close", finish);
      resolve();
    };
    response.once("finish", finish);
    response.once("close", finish);
    try {
      application.emit("request", request, response);
    } catch (error) {
      response.removeListener("finish", finish);
      response.removeListener("close", finish);
      reject(error);
    }
  });
};
