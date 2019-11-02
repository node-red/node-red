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

var net = require("net");
var should = require("should");
var stoppable = require('stoppable');
var helper = require("node-red-node-test-helper");
var tcpinNode = require("nr-test-utils").require("@node-red/nodes/core/network/31-tcpin.js");
var RED = require("nr-test-utils").require("node-red/lib/red.js");


describe('TCP Request Node', function() {
    var server = undefined;
    var port = 9000;

    function startServer(done) {
        port += 1;
        server = stoppable(net.createServer(function(c) {
            c.on('data', function(data) {
                var rdata = "ACK:"+data.toString();
                c.write(rdata);
            });
            c.on('error', function(err) {
                startServer(done);
            });
        })).listen(port, "127.0.0.1", function(err) {
            done();
        });
    }

    before(function(done) {
        startServer(done);
    });

    after(function(done) {
        server.stop(done);
    });

    afterEach(function() {
        helper.unload();
    });

    function testTCP(flow, val0, val1, done) {
        helper.load(tcpinNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    if (typeof val1 === 'object') {
                        msg.should.have.properties(Object.assign({}, val1, {payload: Buffer(val1.payload)}));
                    } else {
                        msg.should.have.property('payload', Buffer(val1));
                    }
                    done();
                } catch(err) {
                    done(err);
                }
            });
            if((typeof val0) === 'object') {
                n1.receive(val0);
            } else {
                n1.receive({payload:val0});
            }
        });
    }

    function testTCPMany(flow, values, result, done) {
        helper.load(tcpinNode, flow, () => {
            const n1 = helper.getNode("n1");
            const n2 = helper.getNode("n2");
            n2.on("input", msg => {
                try {
                    if (typeof result === 'object') {
                        msg.should.have.properties(Object.assign({}, result, {payload: Buffer(result.payload)}));
                    } else {
                        msg.should.have.property('payload', Buffer(result));
                    }
                    done();
                } catch(err) {
                    done(err);
                }
            });
            values.forEach(value => {
                n1.receive(typeof value === 'object' ? value : {payload: value});
            });
        });
    }

    describe('single message', function () {
        it('should send & recv data', function(done) {
            var flow = [{id:"n1", type:"tcp request", server:"localhost", port:port, out:"time", splitc: "0", wires:[["n2"]] },
            {id:"n2", type:"helper"}];
            testTCP(flow, {
                payload: 'foo',
                topic: 'bar'
            }, {
                payload: 'ACK:foo',
                topic: 'bar'
            }, done);
        });

        it('should retain complete message', function(done) {
            var flow = [{id:"n1", type:"tcp request", server:"localhost", port:port, out:"time", splitc: "0", wires:[["n2"]] },
            {id:"n2", type:"helper"}];
            testTCP(flow, {
                payload: 'foo',
                topic: 'bar'
            }, {
                payload: 'ACK:foo',
                topic: 'bar'
            }, done);
        });

        it('should send & recv data when specified character received', function(done) {
            var flow = [{id:"n1", type:"tcp request", server:"localhost", port:port, out:"char", splitc: "0", wires:[["n2"]] },
            {id:"n2", type:"helper"}];
            testTCP(flow, {
                payload: 'foo0bar0',
                topic: 'bar'
            }, {
                payload: 'ACK:foo0',
                topic: 'bar'
            }, done);
        });

        it('should send & recv data after fixed number of chars received', function(done) {
            var flow = [{id:"n1", type:"tcp request", server:"localhost", port:port, out:"count", splitc: "7", wires:[["n2"]] },
            {id:"n2", type:"helper"}];
            testTCP(flow, {
                payload: 'foo bar',
                topic: 'bar'
            }, {
                payload: 'ACK:foo',
                topic: 'bar'
            }, done);
        });

        it('should send & receive, then keep connection', function(done) {
            var flow = [{id:"n1", type:"tcp request", server:"localhost", port:port, out:"sit", splitc: "5", wires:[["n2"]] },
            {id:"n2", type:"helper"}];
            testTCP(flow, {
                payload: 'foo',
                topic: 'bar'
            }, {
                payload: 'ACK:foo',
                topic: 'bar'
            }, done);
        });

        it('should send & recv data to/from server:port from msg', function(done) {
            var flow = [{id:"n1", type:"tcp request", server:"", port:"", out:"time", splitc: "0", wires:[["n2"]] },
            {id:"n2", type:"helper"}];
            testTCP(flow, {
                payload: "foo",
                host: "localhost",
                port: port
            }, {
                payload: "ACK:foo",
                host: 'localhost',
                port: port
            }, done);
        });
    });

    describe('many messages', function () {
        it('should send & recv data', function(done) {
            var flow = [{id:"n1", type:"tcp request", server:"localhost", port:port, out:"time", splitc: "0", wires:[["n2"]] },
                        {id:"n2", type:"helper"}];
            testTCPMany(flow, [{
                payload: 'f',
                topic: 'bar'
            }, {
                payload: 'o',
                topic: 'bar'
            }, {
                payload: 'o',
                topic: 'bar'
            }], {
                payload: 'ACK:foo',
                topic: 'bar'
            }, done);
        });

        it('should send & recv data when specified character received', function(done) {
            var flow = [{id:"n1", type:"tcp request", server:"localhost", port:port, out:"char", splitc: "0", wires:[["n2"]] },
                        {id:"n2", type:"helper"}];
            testTCPMany(flow, [{
                payload: "foo0",
                topic: 'bar'
            }, {
                payload: "bar0",
                topic: 'bar'
            }], {
                payload: "ACK:foo0",
                topic: 'bar'
            }, done);
        });

        it('should send & recv data after fixed number of chars received', function(done) {
            var flow = [{id:"n1", type:"tcp request", server:"localhost", port:port, out:"count", splitc: "7", wires:[["n2"]] },
                        {id:"n2", type:"helper"}];
            testTCPMany(flow, [{
                payload: "fo",
                topic: 'bar'
            }, {
                payload: "ob",
                topic: 'bar'
            }, {
                payload: "ar",
                topic: 'bar'
            }], {
                payload: "ACK:foo",
                topic: 'bar'
            }, done);
        });

        it('should send & receive, then keep connection', function(done) {
            var flow = [{id:"n1", type:"tcp request", server:"localhost", port:port, out:"sit", splitc: "5", wires:[["n2"]] },
                        {id:"n2", type:"helper"}];
            testTCPMany(flow, [{
                payload: "foo",
                topic: 'bar'
            }, {
                payload: "bar",
                topic: 'bar'
            }, {
                payload: "baz",
                topic: 'bar'
            }], {
                payload: "ACK:foobarbaz",
                topic: 'bar'
            }, done);
        });

        it('should send & recv data to/from server:port from msg', function(done) {
            var flow = [{id:"n1", type:"tcp request", server:"", port:"", out:"time", splitc: "0", wires:[["n2"]] },
                        {id:"n2", type:"helper"}];
            testTCPMany(flow, [{
                    payload: "f",
                    host: "localhost",
                    port: port
                },
                {
                    payload: "o",
                    host: "localhost",
                    port: port
                },
                {
                    payload: "o",
                    host: "localhost",
                    port: port
                }
            ], {
                payload: "ACK:foo",
                host: 'localhost',
                port: port
            }, done);
        });

        it('should limit the queue size', function (done) {
            RED.settings.tcpMsgQueueSize = 10;
            var flow = [{id:"n1", type:"tcp request", server:"localhost", port:port, out:"sit", splitc: "5", wires:[["n2"]] },
                        {id:"n2", type:"helper"}];
            // create one more msg than is allowed
            const msgs = new Array(RED.settings.tcpMsgQueueSize + 1).fill('x');
            const expected = msgs.slice(0, -1);
            testTCPMany(flow, msgs, "ACK:" + expected.join(''), done);
        });

        it('should only retain the latest message', function(done) {
            var flow = [{id:"n1", type:"tcp request", server:"localhost", port:port, out:"time", splitc: "0", wires:[["n2"]] },
                        {id:"n2", type:"helper"}];
            testTCPMany(flow, [{
                payload: 'f',
                topic: 'bar'
            }, {
                payload: 'o',
                topic: 'baz'
            }, {
                payload: 'o',
                topic: 'quux'
            }], {
                payload: 'ACK:foo',
                topic: 'quux'
            }, done);
        });
    });
});
