const PayloadValidator = require('../../nodes/PayloadValidator')
const orgEvent = require('./fixtures/data/orgEvent')
const sinon = require('sinon');
const assert = require('assert');

describe.only('Unit: PayloadValidator', () => {
  it('Should not log when no changes', () => {
    const beforeEvent = orgEvent('before');
    const payloadValidator = new PayloadValidator(beforeEvent);
    payloadValidator.verify(beforeEvent);
  });

  it('Should warn when org is overwritten', () => {
    const beforeEvent = orgEvent('before');
    errorLogStub = sinon.stub();
    appLogStub = sinon.stub();
    beforeEvent.logger.error = errorLogStub;
    beforeEvent.logger.app = {
      platform:{
        organization: appLogStub
      }
    };

    const payloadValidator = new PayloadValidator(beforeEvent);

    const modifiedEvent = orgEvent('after');

    payloadValidator.verify(modifiedEvent);
    assert(errorLogStub.callCount === 4)
    assert(appLogStub.callCount === 4)
    const [[log1], [log2], [log3], [log4]] = appLogStub.args
    assert(log1.details.message.includes('logger.metadata.organization'))
    assert(log2.details.message.includes('payload.system.organization'))
    assert(log3.details.message.includes('event.event.organization'))
    assert(log4.details.message.includes('event.event.token.contents.organization'))
  });


  it('Should warn when org is deleted', () => {
    const beforeEvent = orgEvent('before');
    errorLogStub = sinon.stub();
    appLogStub = sinon.stub();
    beforeEvent.logger.error = errorLogStub;
    beforeEvent.logger.app = {
      platform:{
        organization: appLogStub
      }
    };

    const payloadValidator = new PayloadValidator(beforeEvent);

    delete beforeEvent.logger.metadata.organization;
    delete beforeEvent.payload.system.organization;
    delete beforeEvent.event.event.organization;
    delete beforeEvent.event.event.token.contents.organization;
    payloadValidator.verify(beforeEvent);
    assert(errorLogStub.callCount === 4)
    assert(appLogStub.callCount === 4)
    const [[log1], [log2], [log3], [log4]] = appLogStub.args
    assert(log1.details.message.includes('logger.metadata.organization'))
    assert(log2.details.message.includes('payload.system.organization'))
    assert(log3.details.message.includes('event.event.organization'))
    assert(log4.details.message.includes('event.event.token.contents.organization'))
  });

  it('Should not die when error', () => {
    const beforeEvent = orgEvent('before');
    const payloadValidator = new PayloadValidator(beforeEvent);

    const modifiedEvent = orgEvent('after');

    payloadValidator.verify(modifiedEvent);
  });
});