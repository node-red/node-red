const sinon = require('sinon');
const assert = require('assert');
const PayloadValidator = require('../../nodes/PayloadValidator');
const orgEvent = require('./fixtures/data/orgEvent');

describe('Unit: PayloadValidator', () => {
  it('Should not log when no changes', () => {
    const nodeId = 'abc-id';
    const workerId = 'worker-id';
    const beforeEvent = orgEvent('before', workerId);
    const payloadValidator = new PayloadValidator(beforeEvent, `before-${workerId}-${nodeId}`);
    payloadValidator.verify(beforeEvent);
  });

  it('Should warn when org is overwritten and fix it', () => {
    const nodeId = 'abc-id';
    const workerId = 'worker-id';
    const beforeEvent = orgEvent('before', workerId);
    const errorLogStub = sinon.stub();
    const appLogStub = sinon.stub();
    beforeEvent.logger.error = errorLogStub;
    beforeEvent.logger.app = {
      platform: {
        organization: appLogStub
      }
    };

    const payloadValidator = new PayloadValidator(beforeEvent, `before-${workerId}-${nodeId}`);

    const modifiedEvent = orgEvent('after');

    const result = payloadValidator.verify(modifiedEvent);

    assert(errorLogStub.callCount === 4);
    assert(appLogStub.callCount === 4);
    const [[log1], [log2], [log3], [log4]] = appLogStub.args;
    assert(log1.details.message.includes('logger.metadata.organization'));
    assert.strictEqual(log1.details.nodeId, nodeId);
    assert.strictEqual(log1.details.workerId, workerId);
    assert(log2.details.message.includes('payload.system.organization'));
    assert.strictEqual(log2.details.nodeId, nodeId);
    assert.strictEqual(log2.details.workerId, workerId);
    assert(log3.details.message.includes('event.event.organization'));
    assert.strictEqual(log3.details.nodeId, nodeId);
    assert.strictEqual(log3.details.workerId, workerId);
    assert(log4.details.message.includes('event.event.token.contents.organization'));
    assert.strictEqual(log4.details.nodeId, nodeId);
    assert.strictEqual(log4.details.workerId, workerId);
    // deleting due to sinon funness
    delete result.logger.error;
    delete result.logger.app;
    delete beforeEvent.logger.error;
    delete beforeEvent.logger.app;
    assert.deepStrictEqual(result, beforeEvent);
  });

  it('Should warn when org is deleted and fix it', () => {
    const nodeId = 'abc-id';
    const workerId = 'worker-id';
    const beforeEvent = orgEvent('before', workerId);
    const errorLogStub = sinon.stub();
    const appLogStub = sinon.stub();
    beforeEvent.logger.error = errorLogStub;
    beforeEvent.logger.app = {
      platform: {
        organization: appLogStub
      }
    };

    const payloadValidator = new PayloadValidator(beforeEvent, `before-${workerId}-${nodeId}`);

    delete beforeEvent.logger.metadata.organization;
    delete beforeEvent.payload.system.organization;
    delete beforeEvent.event.event.organization;
    delete beforeEvent.event.event.token.contents.organization;
    const result = payloadValidator.verify(beforeEvent);
    assert(errorLogStub.callCount === 4);
    assert(appLogStub.callCount === 4);
    const [[log1], [log2], [log3], [log4]] = appLogStub.args;
    assert(log1.details.message.includes('logger.metadata.organization'));
    assert.strictEqual(log1.details.nodeId, nodeId);
    assert.strictEqual(log1.details.workerId, workerId);
    assert(log2.details.message.includes('payload.system.organization'));
    assert.strictEqual(log2.details.nodeId, nodeId);
    assert.strictEqual(log2.details.workerId, workerId);
    assert(log3.details.message.includes('event.event.organization'));
    assert.strictEqual(log3.details.nodeId, nodeId);
    assert.strictEqual(log3.details.workerId, workerId);
    assert(log4.details.message.includes('event.event.token.contents.organization'));
    assert.strictEqual(log4.details.nodeId, nodeId);
    assert.strictEqual(log4.details.workerId, workerId);

    // deleting due to sinon funness
    delete result.logger.error;
    delete result.logger.app;
    delete beforeEvent.logger.error;
    delete beforeEvent.logger.app;
    assert.deepStrictEqual(result, beforeEvent);
  });

  it('Should handle when after is an array and not find any issues', () => {
    const nodeId = 'abc-id';
    const workerId = 'worker-id';
    const beforeEvent = orgEvent('before', workerId);
    const errorLogStub = sinon.stub();
    const appLogStub = sinon.stub();
    beforeEvent.logger.error = errorLogStub;
    beforeEvent.logger.app = {
      platform: {
        organization: appLogStub
      }
    };

    const payloadValidator = new PayloadValidator(beforeEvent, `before-${workerId}-${nodeId}`);

    const after = orgEvent('before');
    const [result] = payloadValidator.verify([after]);
    // deleting due to sinon funness
    delete result.logger.error;
    delete result.logger.app;
    delete beforeEvent.logger.error;
    delete beforeEvent.logger.app;
    assert.deepStrictEqual(result, beforeEvent);
  });

  it('Should handle when after is an array', () => {
    const nodeId = 'abc-id';
    const workerId = 'worker-id';
    const beforeEvent = orgEvent('before', workerId);
    const errorLogStub = sinon.stub();
    const appLogStub = sinon.stub();
    beforeEvent.logger.error = errorLogStub;
    beforeEvent.logger.app = {
      platform: {
        organization: appLogStub
      }
    };

    const payloadValidator = new PayloadValidator(beforeEvent, `before-${workerId}-${nodeId}`);

    const modifiedEvent = orgEvent('before');
    modifiedEvent.logger.metadata.organization = 'after';
    const [result] = payloadValidator.verify([modifiedEvent]);
    assert(errorLogStub.callCount === 1);
    assert(appLogStub.callCount === 1);
    const [[log1]] = appLogStub.args;
    assert(log1.details.message.includes('logger.metadata.organization'));
    assert.strictEqual(log1.details.nodeId, nodeId);
    assert.strictEqual(log1.details.workerId, workerId);
    // deleting due to sinon funness
    delete result.logger.error;
    delete result.logger.app;
    delete beforeEvent.logger.error;
    delete beforeEvent.logger.app;
    assert.deepStrictEqual(result, beforeEvent);
  });

  it('Should handle when after is an array in something other than first position', () => {
    const nodeId = 'abc-id';
    const workerId = 'worker-id';
    const beforeEvent = orgEvent('before', workerId);
    const errorLogStub = sinon.stub();
    const appLogStub = sinon.stub();
    beforeEvent.logger.error = errorLogStub;
    beforeEvent.logger.app = {
      platform: {
        organization: appLogStub
      }
    };

    const payloadValidator = new PayloadValidator(beforeEvent, `before-${workerId}-${nodeId}`);

    const modifiedEvent = orgEvent('before');
    modifiedEvent.logger.metadata.organization = 'after';
    const [,, result] = payloadValidator.verify([null, null, modifiedEvent, null]);
    assert(errorLogStub.callCount === 1);
    assert(appLogStub.callCount === 1);
    const [[log1]] = appLogStub.args;
    assert(log1.details.message.includes('logger.metadata.organization'));
    assert.strictEqual(log1.details.nodeId, nodeId);
    assert.strictEqual(log1.details.workerId, workerId);
    // deleting due to sinon funness
    delete result.logger.error;
    delete result.logger.app;
    delete beforeEvent.logger.error;
    delete beforeEvent.logger.app;
    assert.deepStrictEqual(result, beforeEvent);
  });

  it('Should not die when error', () => {
    const beforeEvent = orgEvent('before');
    const payloadValidator = new PayloadValidator(beforeEvent);

    const modifiedEvent = orgEvent('after');

    payloadValidator.verify(modifiedEvent);
  });

  it('Should not die with initiating the class with bad object', () => {
    const payloadValidator = new PayloadValidator({});
  });

  it('Should not die with initiating the class with bad object and then calling verify', () => {
    const payloadValidator = new PayloadValidator({});
    payloadValidator.verify({});
  });

  describe('Get Value', () => {
    let payloadValidator;
    before(() => {
      const event = orgEvent('event');
      payloadValidator = new PayloadValidator(event);
    });
    it('Should set a root level variable', () => {
      const location = 'hello';
      const value = 'world';
      const object = {
        [location]: value
      };
      const result = payloadValidator.getValue(object, location);
      assert.strictEqual(result, value);
    });

    it('Should set a nested variable', () => {
      const value = 'world';
      const object = {
        should: {
          have: {
            hello: value
          }
        }
      };
      const location = 'should.have.hello';

      const result = payloadValidator.getValue(object, location);
      assert.strictEqual(result, value);
    });
  });

  describe('Set Value', () => {
    let payloadValidator;
    before(() => {
      const event = orgEvent('event');
      payloadValidator = new PayloadValidator(event);
    });
    it('Should set a root level variable', () => {
      const object = {};
      const location = 'hello';
      const value = 'world';
      const result = payloadValidator.setValue(object, location, value);
      assert.strictEqual(result[location], value);
    });

    it('Should set a nested variable', () => {
      const object = {};
      const location = 'should.set.hello';
      const value = 'world';
      const result = payloadValidator.setValue(object, location, value);
      assert.strictEqual(result.should.set.hello, value);
    });
  });
});
