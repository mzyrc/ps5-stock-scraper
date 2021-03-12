module.exports = class NotificationService {
  constructor(notifier) {
    this.notifier = notifier;
  }

  async publish(message, channel) {
    const params = {
      Message: message,
      TopicArn: channel
    };

    await this.notifier.publish(params).promise()
  }
}
