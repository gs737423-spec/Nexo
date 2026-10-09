"use strict";

const application = require("../server");

module.exports = async (request, response) => {
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
