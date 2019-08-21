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


describe('TCP in Node', function() {
    var port = 9200;
    var server = undefined;
    var server_port = 9300;
    var reply_data = undefined;

    beforeEach(function(done) {
        startServer(done);
    });

    afterEach(function(done) {
        helper.unload();
        stopServer(done);
    });

    function sendArray(sock, array) {
        if(array.length > 0) {
            sock.write(array[0], function() {
                sendArray(sock, array.slice(1));
            });
        }
        else {
            sock.end();
        }
    }

    function startServer(done) {
        server_port += 1;
        server = stoppable(net.createServer(function(c) {
            sendArray(c, reply_data);
        })).listen(server_port, "localhost", function(err) {
            done(err);
        });
    }

    function stopServer(done) {
        server.stop(done);
    }

    function send(wdata) {
        var opt = {port:port, host:"localhost"};
        var client = net.createConnection(opt, function() {
            client.write(wdata[0], function() {
                client.end();
                if(wdata.length > 1) {
                    send(wdata.slice(1));
                }
            });
        });
    }

    function eql(v0, v1) {
        return((v0 === v1) || ((typeof v0) === 'object' && v0.equals(v1)));
    }

    function testTCP(flow, wdata, rdata, is_server, done) {
        if(is_server) {
            reply_data = wdata;
        }
        helper.load(tcpinNode, flow, function() {
            var n2 = helper.getNode("n2");
            var rcount = 0;
            n2.on("input", function(msg) {
                if(eql(msg.payload, rdata[rcount])) {
                    rcount++;
                }
                else {
                    should.fail();
                }
                if(rcount === rdata.length) {
                    done();
                }
            });
            if(!is_server) {
                send(wdata);
            }
        });
    }

    function testTCP0(flow, wdata, rdata, done) {
        testTCP(flow, wdata, rdata, false, done);
    }

    function testTCP1(flow, wdata, rdata, done) {
        testTCP(flow, wdata, rdata, true, done);
    }

    it('should recv data (Stream/Buffer)', function(done) {
        var flow = [{id:"n1", type:"tcp in", server:"server", host:"localhost", port:port, datamode:"stream", datatype:"buffer", newline:"", topic:"", base64:false, wires:[["n2"]] },
                    {id:"n2", type:"helper"}];
        testTCP0(flow, ["foo"], [Buffer("foo")], done);
    });

    it('should recv data (Stream/String/Delimiter:\\n)', function(done) {
        var flow = [{id:"n1", type:"tcp in", server:"server", host:"localhost", port:port, datamode:"stream", datatype:"utf8", newline:"\n", topic:"", base64:false, wires:[["n2"]] },
                    {id:"n2", type:"helper"}];
        testTCP0(flow, ["foo\nbar"], ["foo", "bar"], done);
    });

    it('should recv data (Stream/String/No delimiter)', function(done) {
        var flow = [{id:"n1", type:"tcp in", server:"server", host:"localhost", port:port, datamode:"stream", datatype:"utf8", newline:"", topic:"", base64:false, wires:[["n2"]] },
                    {id:"n2", type:"helper"}];
        testTCP0(flow, ["foo\nbar"], ["foo\nbar"], done);
    });

    it('should recv data (Stream/Base64)', function(done) {
        var flow = [{id:"n1", type:"tcp in", server:"server", host:"localhost", port:port, datamode:"stream", datatype:"base64", newline:"", topic:"", base64:false, wires:[["n2"]] },
                    {id:"n2", type:"helper"}];
        testTCP0(flow, ["foo"], [Buffer("foo").toString('base64')], done);
    });

    it('should recv data (Single/Buffer)', function(done) {
        var flow = [{id:"n1", type:"tcp in", server:"server", host:"localhost", port:port, datamode:"single", datatype:"buffer", newline:"", topic:"", base64:false, wires:[["n2"]] },
                    {id:"n2", type:"helper"}];
        testTCP0(flow, ["foo"], [Buffer("foo")], done);
    });

    it('should recv data (Single/String)', function(done) {
        var flow = [{id:"n1", type:"tcp in", server:"server", host:"localhost", port:port, datamode:"single", datatype:"utf8", newline:"\n", topic:"", base64:false, wires:[["n2"]] },
                    {id:"n2", type:"helper"}];
        testTCP0(flow, ["foo\nbar\nbaz"], ["foo\nbar\nbaz"], done);
    });

    it('should recv data (Stream/Base64)', function(done) {
        var flow = [{id:"n1", type:"tcp in", server:"server", host:"localhost", port:port, datamode:"single", datatype:"base64", newline:"", topic:"", base64:false, wires:[["n2"]] },
                    {id:"n2", type:"helper"}];
        testTCP0(flow, ["foo"], [Buffer("foo").toString('base64')], done);
    });

    it('should recv multiple data (Stream/Buffer)', function(done) {
        var flow = [{id:"n1", type:"tcp in", server:"server", host:"localhost", port:port, datamode:"stream", datatype:"buffer", newline:"", topic:"", base64:false, wires:[["n2"]] },
                    {id:"n2", type:"helper"}];
        testTCP0(flow, ["foo", "bar"], [Buffer("foo"), Buffer("bar")], done);
    });

    it('should recv multiple data (Stream/String/Delimiter:\\n)', function(done) {
        var flow = [{id:"n1", type:"tcp in", server:"server", host:"localhost", port:port, datamode:"stream", datatype:"utf8", newline:"\n", topic:"", base64:false, wires:[["n2"]] },
                    {id:"n2", type:"helper"}];
        testTCP0(flow, ["foo", "bar\nbaz"], ["foo", "bar", "baz"], done);
    });

    it('should recv multiple data (Stream/String/No delimiter)', function(done) {
        var flow = [{id:"n1", type:"tcp in", server:"server", host:"localhost", port:port, datamode:"stream", datatype:"utf8", newline:"", topic:"", base64:false, wires:[["n2"]] },
                    {id:"n2", type:"helper"}];
        testTCP0(flow, ["foo", "bar\nbaz"], ["foo", "bar\nbaz"], done);
    });

    it('should recv multiple data (Stream/Base64)', function(done) {
        var flow = [{id:"n1", type:"tcp in", server:"server", host:"localhost", port:port, datamode:"stream", datatype:"base64", newline:"", topic:"", base64:false, wires:[["n2"]] },
                    {id:"n2", type:"helper"}];
        var wdata = ["foo", "bar"];
        var rdata = wdata.map(function(x) {
            return Buffer(x).toString('base64');
        });
        testTCP0(flow,  wdata, rdata, done);
    });

    it('should connect & recv data (Stream/Buffer)', function(done) {
        var flow = [{id:"n1", type:"tcp in", server:"client", host:"localhost", port:server_port, datamode:"stream", datatype:"buffer", newline:"", topic:"", base64:false, wires:[["n2"]] },
                    {id:"n2", type:"helper"}];
        testTCP1(flow, ["foo"], [Buffer("foo")], done);
    });

    it('should connect & recv data (Stream/String/Delimiter:\\n)', function(done) {
        var flow = [{id:"n1", type:"tcp in", server:"client", host:"localhost", port:server_port, datamode:"stream", datatype:"utf8", newline:"\n", topic:"", base64:false, wires:[["n2"]] },
                    {id:"n2", type:"helper"}];
        testTCP1(flow, ["foo\nbar"], ["foo", "bar"], done);
    });

    it('should connect & recv data (Stream/String/No delimiter)', function(done) {
        var flow = [{id:"n1", type:"tcp in", server:"client", host:"localhost", port:server_port, datamode:"stream", datatype:"utf8", newline:"", topic:"", base64:false, wires:[["n2"]] },
                    {id:"n2", type:"helper"}];
        testTCP1(flow, ["foo\nbar"], ["foo\nbar"], done);
    });

    it('should connect & recv data (Stream/Base64)', function(done) {
        var flow = [{id:"n1", type:"tcp in", server:"client", host:"localhost", port:server_port, datamode:"stream", datatype:"base64", newline:"", topic:"", base64:false, wires:[["n2"]] },
                    {id:"n2", type:"helper"}];
        testTCP1(flow, ["foo"], [Buffer("foo").toString('base64')], done);
    });

    it('should connect & recv data (Single/Buffer)', function(done) {
        var flow = [{id:"n1", type:"tcp in", server:"client", host:"localhost", port:server_port, datamode:"single", datatype:"buffer", newline:"", topic:"", base64:false, wires:[["n2"]] },
                    {id:"n2", type:"helper"}];
        testTCP1(flow, ["foo"], [Buffer("foo")], done);
    });

    it('should connect & recv data (Single/String)', function(done) {
        var flow = [{id:"n1", type:"tcp in", server:"client", host:"localhost", port:server_port, datamode:"single", datatype:"utf8", newline:"\n", topic:"", base64:false, wires:[["n2"]] },
                    {id:"n2", type:"helper"}];
        testTCP1(flow, ["foo\nbar\nbaz"], ["foo\nbar\nbaz"], done);
    });

    it('should connect & recv data (Stream/Base64)', function(done) {
        var flow = [{id:"n1", type:"tcp in", server:"client", host:"localhost", port:server_port, datamode:"single", datatype:"base64", newline:"", topic:"", base64:false, wires:[["n2"]] },
                    {id:"n2", type:"helper"}];
        testTCP1(flow, ["foo"], [Buffer("foo").toString('base64')], done);
    });

});
