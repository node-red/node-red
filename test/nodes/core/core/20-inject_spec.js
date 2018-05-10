/**
 * Copyright JS Foundation and other contributors, http://js.foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

var should = require("should");
var injectNode = require("../../../../nodes/core/core/20-inject.js");
var helper = require("node-red-node-test-helper");

describe('inject node', function() {

    before(function(done) {
        helper.startServer(done);
    });

    after(function(done) {
        helper.stopServer(done);
    });

    afterEach(function() {
        helper.unload();
    });

    it('should inject once with default delay property', function(done) {
        helper.load(injectNode, [{id:"n1", type:"inject", topic: "t1",
                    payload:"",payloadType:"date",
                    once: true, wires:[["n2"]] },
                    {id:"n2", type:"helper"}],
                  function() {
                    var n1 = helper.getNode("n1");
                    n1.should.have.property('onceDelay', 100);
                    done();
                  });
    });

    it('should inject once with default delay', function(done) {
        var timestamp = new Date();
        timestamp.setSeconds(timestamp.getSeconds() + 1);

        helper.load(injectNode, [{id:"n1", type:"inject", topic: "t1",
                    payload:"",payloadType:"date",
                    once: true, wires:[["n2"]] },
                   {id:"n2", type:"helper"}],
                  function() {
                      var n2 = helper.getNode("n2");
                      n2.on("input", function(msg) {
                          try {
                              msg.should.have.property('topic', 't1');
                              msg.should.have.property('payload');
                              should(msg.payload).be.lessThan(timestamp.getTime());
                              done();
                          } catch(err) {
                              done(err);
                          }
                      });
                  });
    });

    it('should inject once with 500 msec. delay', function(done) {
        helper.load(injectNode, [{id:"n1", type:"inject", topic: "t1",
                    payload:"",payloadType:"date",
                    once: true, onceDelay: 0.5, wires:[["n2"]] },
                    {id:"n2", type:"helper"}],
                  function() {
                    var n1 = helper.getNode("n1");
                    n1.should.have.property('onceDelay', 500);
                    done();
                  });
    });

  it('should inject once with delay of two seconds', function(done) {
        this.timeout(2700); // have to wait for the inject with delay of two seconds

        var timestamp = new Date();
        timestamp.setSeconds(timestamp.getSeconds() + 1);

        helper.load(injectNode, [{id:"n1", type:"inject", topic: "t1",
                    payload:"",payloadType:"date",
                    once: true, onceDelay: 2, wires:[["n2"]] },
                    {id:"n2", type:"helper"}],
                  function() {
                    var n2 = helper.getNode("n2");
                    n2.on("input", function(msg) {
                      msg.should.have.property('topic', 't1');
                      should(msg.payload).be.greaterThan(timestamp.getTime());
                      done();
                    });
                  });
    });

    it('should inject repeatedly', function(done) {

        helper.load(injectNode, [{id:"n1", type:"inject",
                    payload:"payload", topic: "t2",
                    repeat: 0.2, wires:[["n2"]] },
                   {id:"n2", type:"helper"}],
                  function() {
                      var n2 = helper.getNode("n2");
                      var count = 0;
                      n2.on("input", function(msg) {
                          msg.should.have.property('topic', 't2');
                          msg.should.have.property('payload', 'payload');
                          count += 1;
                          if (count > 2) {
                              helper.clearFlows().then(function() {
                                  done();
                              });
                          }
                      });
                  });
    });

    it('should inject once with delay of two seconds and repeatedly', function(done) {
        var timestamp = new Date();
        timestamp.setSeconds(timestamp.getSeconds() + 1);

        helper.load(injectNode, [{id:"n1", type:"inject", topic: "t1",
                        payload:"",payloadType:"date", repeat: 0.2,
                        once: true, onceDelay: 1.2, wires:[["n2"]] },
                        {id:"n2", type:"helper"}],
                    function() {
                        var n2 = helper.getNode("n2");
                        var count = 0;
                        n2.on("input", function(msg) {
                            msg.should.have.property('topic', 't1');
                            should(msg.payload).be.greaterThan(timestamp.getTime());
                            count += 1;
                            if (count > 2) {
                                helper.clearFlows().then(function() {
                                    done();
                                });
                            }
                        });
                    });
    });

    it('should inject with cron', function(done) {
        helper.load(injectNode, [{id:"n1", type:"inject",
                    payloadType:"date", topic: "t3",
                    crontab: "* * * * * *", wires:[["n3"]] },
                   {id:"n3", type:"helper"}],
                  function() {
                      var n3 = helper.getNode("n3");
                      n3.on("input", function(msg) {
                          msg.should.have.property('topic', 't3');
                          msg.should.have.property('payload').be.a.Number();
                          helper.clearFlows().then(function() {
                              done();
                          });
                      });
                  });
    });

    describe('post', function() {
        it('should inject message', function(done) {
            helper.load(injectNode,
                        [{id:"n1", type:"inject",
                          payloadType:"str", topic: "t4",payload:"hello",
                          wires:[["n4"]] },
                         { id:"n4", type:"helper"}], function() {
                             var n4 = helper.getNode("n4");
                             n4.on("input", function(msg) {
                                 msg.should.have.property('topic', 't4');
                                 msg.should.have.property('payload', 'hello');
                                 helper.clearFlows().then(function() {
                                     done();
                                 });
                             });
                             helper.request()
                                 .post('/inject/n1')
                                 .expect(200).end(function(err) {
                                     if (err) {
                                         return helper.clearFlows()
                                             .then(function () {
                                                 done(err);
                                             });
                                     }
                                 });
                         });
        });

        it('should fail for invalid node', function(done) {
            helper.request().post('/inject/invalid').expect(404).end(done);
        });
    });
});
