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
var sinon = require("sinon");

var NR_TEST_UTILS = require("nr-test-utils");
var comms = NR_TEST_UTILS.require("@node-red/runtime/lib/api/comms");
var events = NR_TEST_UTILS.require("@node-red/util/lib/events");

describe("runtime-api/comms", function() {
    describe("listens for events", function() {
        var messages = [];
        var clientConnection = {
            send: function(topic,data) {
                messages.push({topic,data})
            }
        }
        var eventHandlers = {};
        before(function(done) {
            sinon.stub(events,"removeListener").callsFake(function() {})
            sinon.stub(events,"on").callsFake(function(evt,handler) { eventHandlers[evt] = handler })
            comms.init({
                log: {
                    trace: function(){}
                }
            })
            comms.addConnection({client: clientConnection}).then(done);
        })
        after(function(done) {
            comms.removeConnection({client: clientConnection}).then(done);
            events.removeListener.restore();
            events.on.restore();
        })
        afterEach(function() {
            messages = [];
        })

        it('runtime events',function(){
            eventHandlers.should.have.property('runtime-event');
            eventHandlers['runtime-event']({
                id: "my-event",
                payload: "my-payload"
            })
            messages.should.have.length(1);
            messages[0].should.have.property("topic","notification/my-event");
            messages[0].should.have.property("data","my-payload")
        })
        it('status events',function(){
            eventHandlers.should.have.property('node-status');
            eventHandlers['node-status']({
                id: "my-event",
                status: {text:"my-status",badProperty:"should be filtered"}
            })
            messages.should.have.length(1);
            messages[0].should.have.property("topic","status/my-event");
            messages[0].should.have.property("data");
            messages[0].data.should.have.property("text","my-status");
            messages[0].data.should.not.have.property("badProperty");

        })
        it('comms events',function(){
            eventHandlers.should.have.property('runtime-event');
            eventHandlers['comms']({
                topic: "my-topic",
                data: "my-payload"
            })
            messages.should.have.length(1);
            messages[0].should.have.property("topic","my-topic");
            messages[0].should.have.property("data","my-payload")
        })
    });
    describe("manages connections", function() {
        var eventHandlers = {};
        var messages = [];
        var clientConnection1 = {
            send: function(topic,data) {
                messages.push({topic,data})
            }
        }
        var clientConnection2 = {
            send: function(topic,data) {
                messages.push({topic,data})
            }
        }
        before(function() {
            sinon.stub(events,"removeListener").callsFake(function() {})
            sinon.stub(events,"on").callsFake(function(evt,handler) { eventHandlers[evt] = handler })
            comms.init({
                log: {
                    trace: function(){}
                }
            })
        })
        after(function() {
            events.removeListener.restore();
            events.on.restore();
        })
        afterEach(function(done) {
            comms.removeConnection({client: clientConnection1}).then(function() {
                comms.removeConnection({client: clientConnection2}).then(done);
            });
            messages = [];
        })
        it('adds new connections',function(done){
            eventHandlers['comms']({
                topic: "my-topic",
                data: "my-payload"
            })
            messages.should.have.length(0);
            comms.addConnection({client: clientConnection1}).then(function() {
                eventHandlers['comms']({
                    topic: "my-topic",
                    data: "my-payload"
                })
                messages.should.have.length(1);
                comms.addConnection({client: clientConnection2}).then(function() {
                    eventHandlers['comms']({
                        topic: "my-topic",
                        data: "my-payload"
                    })
                    messages.should.have.length(3);
                    done();
                }).catch(done);
            });
        });
        it('removes connections',function(done){
            eventHandlers['comms']({
                topic: "my-topic",
                data: "my-payload"
            })
            messages.should.have.length(0);
            comms.addConnection({client: clientConnection1}).then(function() {
                comms.addConnection({client: clientConnection2}).then(function() {
                    eventHandlers['comms']({
                        topic: "my-topic",
                        data: "my-payload"
                    })
                    messages.should.have.length(2);
                    comms.removeConnection({client: clientConnection1}).then(function() {
                        eventHandlers['comms']({
                            topic: "my-topic",
                            data: "my-payload"
                        })
                        messages.should.have.length(3);
                        done();
                    });
                }).catch(done);
            });
        })
    })

    describe("subscriptions", function() {
        var messages = [];
        var clientConnection = {
            send: function(topic,data) {
                messages.push({topic,data})
            }
        }
        var clientConnection2 = {
            send: function(topic,data) {
                messages.push({topic,data})
            }
        }
        var eventHandlers = {};
        before(function() {
            sinon.stub(events,"removeListener").callsFake(function() {})
            sinon.stub(events,"on").callsFake(function(evt,handler) { eventHandlers[evt] = handler })
            comms.init({
                log: {
                    trace: function(){}
                }
            })
        })
        after(function() {
            events.removeListener.restore();
            events.on.restore();
        })
        afterEach(function(done) {
            messages = [];
            comms.removeConnection({client: clientConnection}).then(done);
        })

        it('subscribe triggers retained messages',function(done){
            eventHandlers['comms']({
                topic: "my-event",
                data: "my-payload",
                retain: true
            })
            messages.should.have.length(0);
            comms.addConnection({client: clientConnection}).then(function() {
                return comms.subscribe({client: clientConnection, topic: "my-event"}).then(function() {
                    messages.should.have.length(1);
                    messages[0].should.have.property("topic","my-event");
                    messages[0].should.have.property("data","my-payload");
                    done();
                });
            }).catch(done);
        })
        it('retains non-blank status message',function(done){
            eventHandlers['node-status']({
                id: "node1234",
                status: {text:"hello"}
            })
            messages.should.have.length(0);
            comms.addConnection({client: clientConnection}).then(function() {
                return comms.subscribe({client: clientConnection, topic: "status/#"}).then(function() {
                    messages.should.have.length(1);
                    messages[0].should.have.property("topic","status/node1234");
                    messages[0].should.have.property("data",{text:"hello", fill: undefined, shape: undefined});
                    done();
                });
            }).catch(done);
        })
        it('does not retain blank status message',function(done){
            eventHandlers['node-status']({
                id: "node1234",
                status: {}
            })
            messages.should.have.length(0);
            comms.addConnection({client: clientConnection}).then(function() {
                return comms.subscribe({client: clientConnection, topic: "status/#"}).then(function() {
                    messages.should.have.length(0);
                    done();
                });
            }).catch(done);
        })
        it('does not send blank status if first status',function(done){
            messages.should.have.length(0);
            comms.addConnection({client: clientConnection}).then(function() {
                return comms.subscribe({client: clientConnection, topic: "status/#"}).then(function() {
                    eventHandlers['node-status']({
                        id: "node5678",
                        status: {}
                    })
                    messages.should.have.length(0);
                    done()
                })
            }).catch(done);
        });
        it('sends blank status if replacing retained',function(done){
            eventHandlers['node-status']({
                id: "node5678",
                status: {text:"hello"}
            })
            messages.should.have.length(0);
            comms.addConnection({client: clientConnection}).then(function() {
                return comms.subscribe({client: clientConnection, topic: "status/#"}).then(function() {
                    messages.should.have.length(1);
                    eventHandlers['node-status']({
                        id: "node5678",
                        status: {}
                    })
                    messages.should.have.length(2);
                    done()
                })
            }).catch(done);
        });

        it('does not retain initial status blank message',function(done){
            eventHandlers['node-status']({
                id: "my-event",
                status: {}
            })
            messages.should.have.length(0);
            comms.addConnection({client: clientConnection}).then(function() {
                return comms.subscribe({client: clientConnection, topic: "my-event"}).then(function() {
                    messages.should.have.length(1);
                    messages[0].should.have.property("topic","my-event");
                    messages[0].should.have.property("data","my-payload");
                    done();
                });
            }).catch(done);
        })

        it('retains non-blank status message with parameters', function(done) {
            eventHandlers['node-status']({
                id: "node1234",
                status: {
                    text: "path.to.status.locale",
                    params: {
                        myParam0: "test"
                    }
                }
            });
            messages.should.have.length(0);
            comms.addConnection({client: clientConnection}).then(function() {
                return comms.subscribe({client: clientConnection, topic: "status/#"}).then(function() {
                    messages.should.have.length(1);
                    messages[0].should.have.property("topic","status/node1234");
                    messages[0].should.have.property("data",{text:"path.to.status.locale", fill: undefined, shape: undefined, params: { myParam0: "test"} });
                    done();
                });
            }).catch(done);
        });

        it('retained messages get cleared',function(done) {
            eventHandlers['comms']({
                topic: "my-event",
                data: "my-payload",
                retain: true
            })
            messages.should.have.length(0);
            comms.addConnection({client: clientConnection}).then(function() {
                return comms.subscribe({client: clientConnection, topic: "my-event"}).then(function() {
                    messages.should.have.length(1);
                    messages[0].should.have.property("topic","my-event");
                    messages[0].should.have.property("data","my-payload");
                    // Now we have a retained message, clear it
                    eventHandlers['comms']({
                        topic: "my-event",
                        data: "my-payload-cleared"
                    });
                    messages.should.have.length(2);
                    messages[1].should.have.property("topic","my-event");
                    messages[1].should.have.property("data","my-payload-cleared");
                    // Now add a second client and subscribe - no message should arrive
                    return comms.addConnection({client: clientConnection2}).then(function() {
                        return comms.subscribe({client: clientConnection2, topic: "my-event"}).then(function() {
                            messages.should.have.length(2);
                            done();
                        });
                    });
                });
            }).catch(done);
        });
    })

});
