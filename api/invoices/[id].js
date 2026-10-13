"use strict";

const application = require("../../server");

module.exports = async (request, response) => {
  const id = String(request.query?.id || "").replace(/[^0-9]/g, "");
  request.url = `/api/invoices/${id}`;
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
