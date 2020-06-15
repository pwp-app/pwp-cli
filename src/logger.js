const log4js = require('log4js');
module.exports = (name) => {
    const logger = log4js.getLogger(name);
    logger.level = "debug";
    return logger;
};
