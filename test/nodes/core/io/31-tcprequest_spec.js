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
var tcpinNode = require("../../../../nodes/core/io/31-tcpin.js");


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
                    msg.should.have.property('payload', Buffer(val1));
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

    it('should send & recv data', function(done) {
        var flow = [{id:"n1", type:"tcp request", server:"localhost", port:port, out:"time", splitc: "0", wires:[["n2"]] },
                    {id:"n2", type:"helper"}];
	testTCP(flow, "foo", "ACK:foo", done)
    });

    it('should send & recv data when specified character received', function(done) {
        var flow = [{id:"n1", type:"tcp request", server:"localhost", port:port, out:"char", splitc: "0", wires:[["n2"]] },
                    {id:"n2", type:"helper"}];
	testTCP(flow, "foo0bar0", "ACK:foo0", done);
    });

    it('should send & recv data after fixed number of chars received', function(done) {
        var flow = [{id:"n1", type:"tcp request", server:"localhost", port:port, out:"count", splitc: "7", wires:[["n2"]] },
                    {id:"n2", type:"helper"}];
	testTCP(flow, "foo bar", "ACK:foo", done);
    });

    it('should send & receive, then keep connection', function(done) {
        var flow = [{id:"n1", type:"tcp request", server:"localhost", port:port, out:"sit", splitc: "5", wires:[["n2"]] },
                    {id:"n2", type:"helper"}];
	testTCP(flow, "foo", "ACK:foo", done);
    });

    it('should send & close', function(done) {
        var flow = [{id:"n1", type:"tcp request", server:"localhost", port:port, out:"sit", splitc: "5", wires:[["n2"]] },
                    {id:"n2", type:"helper"}];
	testTCP(flow, "foo", "ACK:foo", done);
    });

    it('should send & recv data to/from server:port from msg', function(done) {
        var flow = [{id:"n1", type:"tcp request", server:"", port:"", out:"time", splitc: "0", wires:[["n2"]] },
                    {id:"n2", type:"helper"}];
	testTCP(flow, {payload:"foo", host:"localhost", port:port}, "ACK:foo", done)
    });

});
