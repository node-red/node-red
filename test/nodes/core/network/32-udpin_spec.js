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

var dgram = require("dgram");
var should = require("should");
var helper = require("node-red-node-test-helper");
var udpNode = require("nr-test-utils").require("@node-red/nodes/core/network/32-udp.js");


describe('UDP in Node', function() {
    var port = 9100;

    before(function(done) {
        helper.startServer(done);
    });

    after(function(done) {
        helper.stopServer(done);
    });

    afterEach(function() {
        helper.unload();
    });

    function sendIPv4(msg) {
        var sock = dgram.createSocket('udp4');
        sock.send(msg, 0, msg.length, port, "127.0.0.1", function(msg) {
            sock.close();
        });
    }

    function checkRecv(dt, proto, val0, val1, done) {
        var flow = [{id:"n1", type:"udp in",
                     group: "", multicast:false,
                     port:port, ipv:proto,
                     datatype: dt, iface: "",
                     wires:[["n2"]] },
                    {id:"n2", type:"helper"}];
        helper.load(udpNode, flow, function() {
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    var ip = ((proto === 'udp6') ? '::ffff:':'') +'127.0.0.1';
                    msg.should.have.property('ip', ip);
                    msg.should.have.property('port');
                    msg.should.have.property('payload');
                    msg.payload.should.deepEqual(val1);
                    done();
                } catch(err) {
                    done(err);
                }
            });
            sendIPv4(val0);
        });
    }
    
    it('should recv IPv4 data (Buffer)', function(done) {
        checkRecv('buffer', 'udp4', 'hello', Buffer('hello'), done);
    });

    it('should recv IPv4 data (String)', function(done) {
        checkRecv('utf8', 'udp4', 'hello', 'hello', done);
    });

    it('should recv IPv4 data (base64)', function(done) {
        checkRecv('base64', 'udp4', 'hello', Buffer('hello').toString('base64'), done);
    });

    it('should recv IPv6 data (Buffer)', function(done) {
        checkRecv('buffer', 'udp6', 'hello', Buffer('hello'), done);
    });

    it('should recv IPv6 data (String)', function(done) {
        checkRecv('utf8', 'udp6', 'hello', 'hello', done);
    });

    it('should recv IPv6 data (base64)', function(done) {
        checkRecv('base64', 'udp6', 'hello', Buffer('hello').toString('base64'), done);
    });

});
