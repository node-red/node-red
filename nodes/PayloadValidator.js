const clone = require('clone');

const variablesToCheck = [
  'logger.metadata.organization',
  'payload.system.organization',
  'event.event.organization',
  'event.event.token.contents.organization'
];

module.exports = class PayloadValidator {
  constructor(_before) {
    try {
      const before = clone(_before);
      const {
        logger,
        payload: {
          system: {
            bot,
            conversationId,
            organization,
            region
          }
        }
      } = before;
      this.before = before;
      this.logger = logger;
      this.bot = bot;
      this.conversationId = conversationId;
      this.organization = organization;
      this.region = region;
      this.isValidBefore = true;
    } catch (e) {
      console.log('Error while instantiating class with invalid object');
      console.log(e);
      this.isValidBefore = false;
    }
  }

  getValue(object, location) {
    return location.split('.').reduce((p, c) => (p && p[c]) || null, object);
  }

  verify(after) {
    if (this.isValidBefore) {
      try {
        variablesToCheck.forEach((location) => {
          if (this.getValue(this.before, location) !== this.getValue(after, location)) {
            const details = {
              message: `msg.${location} changed from "${this.getValue(this.before, location)}" to "${this.getValue(after, location)}" for bot "${this.bot}"`
            };
            this.logger.error(details.message);
            this.logger.app.platform.organization({
              srn: `srn:botnet:${this.region}:${this.organization}:bot:${this.bot}`,
              action: 'exception',
              actionType: 'invalid-payload-modification',
              details,
              conversationId: this.conversationId
            });
          }
        });
      } catch (e) {
        console.log('Error while trying to verify variable changes');
        console.log(e);
      }
    } else {
      console.log('Error while trying to verify variable changes, wasn\'t initted with correct object');
    }
  }
};
