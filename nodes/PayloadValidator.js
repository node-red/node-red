const clone = require('clone');
const _ = require('lodash');

const variablesToCheck = [
  'logger.metadata.organization',
  'payload.system.organization',
  'event.event.organization',
  'event.event.token.contents.organization'
];

module.exports = class PayloadValidator {
  constructor(_before, id) {
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
        },
        event: {
          workers: [{ id: workerId }]
        }
      } = before;
      this.before = before;
      this.logger = logger;
      this.bot = bot;
      this.conversationId = conversationId;
      this.organization = organization;
      this.region = region;
      this.workerId = workerId.split(':::')[0];
      this.nodeId = id.split(`${organization}-${this.workerId}-`)[1];
      this.isValidBefore = true;
    } catch (e) {
      console.log('Error while instantiating class with invalid object for');
      console.log(e);
      this.isValidBefore = false;
    }
  }

  /**
   * Gets the value at the given location in the given object
   *
   * @param {*} object
   * @param {*} location
   * @returns
   */
  getValue(object, location) {
    return _.get(object, location);
  }

  /**
   * Sets the value at the given location in the given object to the given value
   *
   * @param {*} object
   * @param {*} location
   * @param {*} value
   * @returns
   */
  setValue(object, location, value) {
    return _.set(object, location, value);
  }

  check(_after) {
    let after = _after;
    try {
      variablesToCheck.forEach((location) => {
        const beforeValue = this.getValue(this.before, location);
        const afterValue = this.getValue(after, location);
        if (beforeValue !== afterValue) {
          const details = {
            message: `msg.${location} changed from "${beforeValue}" to "${afterValue}" for bot "${this.bot}"`,
            nodeId: this.nodeId,
            workerId: this.workerId
          };
          this.logger.error(details.message);
          this.logger.app.platform.organization({
            srn: `srn:botnet:${this.region}:${this.organization}:bot:${this.bot}`,
            action: 'exception',
            actionType: 'invalid-payload-modification',
            details,
            conversationId: this.conversationId
          });

  
          after = this.setValue(after, location, beforeValue);
            
          if (!_.has(after, location, beforeValue)) {
            throw new Error(`Cant set value as ${location} is no longer present in after`);
          }
        }
      });
    } catch (e) {
      console.log('Error while trying to verify variable changes');
      console.log(e);
    }
    return after;
  }

  verify(_after) {
    const after = _after;
    if (this.isValidBefore) {
      if (Array.isArray(after)) {
        const afterIndex = after.findIndex((msg) => !!msg);
        after[afterIndex] = this.check(after[afterIndex]);
        return after;
      }
      return this.check(after);
    }
    console.log('Error while trying to verify variable changes, wasn\'t initted with correct object');
    return after;
  }
};
