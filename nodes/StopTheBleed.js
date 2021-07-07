const clone = require('clone');

const variablesToCheck = [
  'logger.metadata.organization',
  'payload.system.organization',
  'event.event.organization',
  'event.event.token.contents.organization'
];

module.exports = class StopTheBleed {
  constructor(_before) {
    const before = clone(_before);
    const {
      logger, 
      payload: {
        system: {
          bot, conversationId, organization, region
        }
      }
    } = before;
    this.before = before;
    this.logger = logger;
    this.bot = bot;
    this.conversationId = conversationId;
    this.organization = organization;
    this.region = region;
  }

  verify(after) {
    try {
      variablesToCheck.forEach((location) => {
        const getValue = (object) => location.split('.').reduce((p, c) => (p && p[c]) || null, object);
        if (getValue(this.before) !== getValue(after)) {
          const details = {
            message: `msg.${location} changed from "${getValue(this.before)}" to "${getValue(after)}" for bot "${this.bot}"`
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
  }
};
