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


describe('UDP out Node', function() {
    var port = 9200;

    before(function(done) {
        helper.startServer(done);
    });

    after(function(done) {
        helper.stopServer(done);
    });

    afterEach(function() {
        helper.unload();
    });

    function recvData(data, done) {
        var sock = dgram.createSocket('udp4');
        sock.on('message', function(msg, rinfo) {
            sock.close(done);
            msg.should.deepEqual(data);
        });
        sock.bind(port, '127.0.0.1');
        port++;
    }

    function checkSend(proto, val0, val1, decode, dest_in_msg, done) {
        var dst_ip = dest_in_msg ? undefined : "127.0.0.1";
        var dst_port = dest_in_msg ? undefined : port;
        var flow = [{id:"n1", type:"udp out",
                     addr:dst_ip, port:dst_port, iface: "",
                     ipv:proto, outport: "",
                     base64:decode, multicast:false,
                     wires:[] }];
        helper.load(udpNode, flow, function() {
            var n1 = helper.getNode("n1");
            var msg = {};
            if (decode) {
                msg.payload = Buffer.from("hello").toString('base64');
            }
            else {
                msg.payload = "hello";
            }
            if (dest_in_msg) {
                msg.ip = "127.0.0.1";
                msg.port = port;
            }
            recvData(val1, done);
            setTimeout(function() {
                n1.receive(msg);
            }, 200);
        });
    }

    it('should send IPv4 data', function(done) {
        checkSend('udp4', 'hello', Buffer.from('hello'), false, false, done);
    });

    it('should send IPv4 data (base64)', function(done) {
        checkSend('udp4', 'hello', Buffer.from('hello'), true, false, done);
    });

    it('should send IPv4 data with dest from msg', function(done) {
        checkSend('udp4', 'hello', Buffer.from('hello'), false, true, done);
    });

});
