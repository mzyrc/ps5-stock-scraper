module.exports = class Logger {
  constructor(logger) {
    this.logger = logger;
  }

  info(name, message) {
    this.logger.log({
      level: 'info',
      label: name,
      message: message
    });
  }

  error(name, message) {
    this.logger.log({
      level: 'error',
      label: name,
      message: message
    });
  }
}
