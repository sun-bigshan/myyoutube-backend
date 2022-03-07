/* eslint valid-jsdoc: "off" */

'use strict';
const secret = require('./secret');

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = exports = {};

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1646124033712_6935';

  // add your middleware config here
  config.middleware = [
    'errorHandler',
  ];

  // add your user config here
  const userConfig = {
    // myAppName: 'egg',
  };

  config.mongoose = {
    client: {
      url: secret.mongoConfig.url,
      options: {},
      // mongoose global plugins, expected a function or an array of function and options
      plugins: [],
    },
  };

  config.security = {
    csrf: {
      enable: false,
    },
  };

  config.jwt = {
    secret: 'f32f7ccd-b8f7-a027-4540-8bdc8b362383',
    expiresIn: '1d',
  };

  config.cors = {
    origin: '*',
  };

  return {
    ...config,
    ...userConfig,
  };
};
