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

  /**
   * Log that we had a invalid payload modification
   * @param {*} beforeValue
   * @param {*} afterValue
   * @param {*} location
   */
  logException(beforeValue, afterValue, location) {
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
  }

  /**
   * Ensures that the organization in the before matches the org in the after
   * If they are different then it attempts to set the organization back to the correct one
   * @param {*} after
   * @returns
   */
  ensureOrganizationNotModified(after) {
    variablesToCheck.forEach((location) => {
      const beforeValue = this.getValue(this.before, location);
      const afterValue = this.getValue(after, location);
      if (beforeValue !== afterValue) {
        this.logException(beforeValue, afterValue, location);

        // attempt to set the value back to its correct one
        after = this.setValue(after, location, beforeValue);

        if (!_.has(after, location, beforeValue)) {
          this.logger.error(`Cant set value as ${location} is no longer assessable in after`);
        }
      }
    });

    return after;
  }

  verify(after) {
    if (this.isValidBefore) {
      if (Array.isArray(after)) {
        const afterIndex = after.findIndex(msg => !!msg);
        after[afterIndex] = this.ensureOrganizationNotModified(after[afterIndex]);
        return after;
      }
      return this.ensureOrganizationNotModified(after);
    }
    console.log('Error while trying to verify variable changes, wasn\'t initted with correct object');
    return after;
  }
};
