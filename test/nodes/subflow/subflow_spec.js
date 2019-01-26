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
var functionNode = require("nr-test-utils").require("@node-red/nodes/core/core/80-function.js");
var helper = require("node-red-node-test-helper");

// Notice:
// - nodes should have x, y, z property when defining subflow.

describe('subflow', function() {

    before(function(done) {
        helper.startServer(done);
    });

    after(function(done) {
        helper.stopServer(done);
    });

    afterEach(function() {
        helper.unload();
    });

    it('should define subflow', function(done) {
        var flow = [
            {id:"t1", type:"tab"},
            {id:"n1", z:"t1", type:"subflow:s1", wires:[["n2"]]},
            {id:"n2", z:"t1", type:"helper", wires:[]},
            // Subflow
            {id:"s1", type:"subflow", name:"Subflow", info:"",
             in:[{wires:[ {id:"s1-n1"} ]}],
             out:[{wires:[ {id:"s1-n1", port:0} ]}]},
            {id:"s1-n1", z:"s1", type:"function",
             func:"return msg;", wires:[]}
        ];
        helper.load(functionNode, flow, function() {
            done();
        });
    });

    it('should pass data to/from subflow', function(done) {
        var flow = [
            {id:"t0", type:"tab", label:"", disabled:false, info:""},
            {id:"n1", x:10, y:10, z:"t0", type:"subflow:s1", wires:[["n2"]]},
            {id:"n2", x:10, y:10, z:"t0", type:"helper", wires:[]},
            // Subflow
            {id:"s1", type:"subflow", name:"Subflow", info:"",
             in:[{
                 x:10, y:10,
                 wires:[ {id:"s1-n1"} ]
             }],
             out:[{
                 x:10, y:10,
                 wires:[ {id:"s1-n1", port:0} ]
             }]
            },
            {id:"s1-n1", x:10, y:10, z:"s1", type:"function",
             func:"msg.payload = msg.payload+'bar'; return msg;", wires:[]}
        ];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property("payload", "foobar");
                done();
            });
            n1.receive({payload:"foo"});
        });
    });

    it('should pass data to/from nested subflow', function(done) {
        var flow = [
            {id:"t0", type:"tab", label:"", disabled:false, info:""},
            {id:"n1", x:10, y:10, z:"t0", type:"subflow:s1", wires:[["n2"]]},
            {id:"n2", x:10, y:10, z:"t0", type:"helper", wires:[]},
            // Subflow1
            {id:"s1", type:"subflow", name:"Subflow1", info:"",
             in:[{
                 x:10, y:10,
                 wires:[ {id:"s1-n1"} ]
             }],
             out:[{
                 x:10, y:10,
                 wires:[ {id:"s1-n2", port:0} ]
             }]
            },
            {id:"s1-n1", x:10, y:10, z:"s1", type:"subflow:s2",
             wires:[["s1-n2"]]},
            {id:"s1-n2", x:10, y:10, z:"s1", type:"function",
             func:"msg.payload = msg.payload+'baz'; return msg;", wires:[]},
            // Subflow2
            {id:"s2", type:"subflow", name:"Subflow2", info:"",
             in:[{
                 x:10, y:10,
                 wires:[ {id:"s2-n1"} ]
             }],
             out:[{
                 x:10, y:10,
                 wires:[ {id:"s2-n1", port:0} ]
             }]
            },
            {id:"s2-n1", x:10, y:10, z:"s2", type:"function",
             func:"msg.payload=msg.payload+'bar'; return msg;", wires:[]}
        ];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property("payload", "foobarbaz");
                done();
            });
            n1.receive({payload:"foo"});
        });
    });

    it('should access env var of subflow template', function(done) {
        var flow = [
            {id:"t0", type:"tab", label:"", disabled:false, info:""},
            {id:"n1", x:10, y:10, z:"t0", type:"subflow:s1", wires:[["n2"]]},
            {id:"n2", x:10, y:10, z:"t0", type:"helper", wires:[]},
            // Subflow
            {id:"s1", type:"subflow", name:"Subflow", info:"",
             env: [
                 {name: "K", type: "T", value: "V",
                  info: {
                      name: "K",
                      label: "",
                      value: "V",
                      type: "T",
                      target_type: "env var",
                      "target": "K"
                  }}
             ],
             in:[{
                 x:10, y:10,
                 wires:[ {id:"s1-n1"} ]
             }],
             out:[{
                 x:10, y:10,
                 wires:[ {id:"s1-n1", port:0} ]
             }]
            },
            {id:"s1-n1", x:10, y:10, z:"s1", type:"function",
             func:"msg.V = env.get('K'); msg.T = env.get('K_type'); msg.I = env.get('K_info'); return msg;",
             wires:[]}
        ];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property("V", "V");
                    msg.should.have.property("T", "T");
                    msg.should.have.property("I");
                    done();
                }
                catch (e) {
                    console.log(e);
                    done(e);
                }
            });
            n1.receive({payload:"foo"});
        });
    });

    it('should access env var of subflow instance', function(done) {
        var flow = [
            {id:"t0", type:"tab", label:"", disabled:false, info:""},
            {id:"n1", x:10, y:10, z:"t0", type:"subflow:s1",
             env: [
                 {name: "K", type: "T", value: "V",
                  info: {
                      name: "K",
                      label: "",
                      value: "V",
                      type: "T",
                      target_type: "env var",
                      "target": "K"
                  }}
             ],
             wires:[["n2"]]},
            {id:"n2", x:10, y:10, z:"t0", type:"helper", wires:[]},
            // Subflow
            {id:"s1", type:"subflow", name:"Subflow", info:"",
             in:[{
                 x:10, y:10,
                 wires:[ {id:"s1-n1"} ]
             }],
             out:[{
                 x:10, y:10,
                 wires:[ {id:"s1-n1", port:0} ]
             }]
            },
            {id:"s1-n1", x:10, y:10, z:"s1", type:"function",
             func:"msg.V = env.get('K'); msg.T = env.get('K_type'); msg.I = env.get('K_info'); return msg;",
             wires:[]}
        ];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property("V", "V");
                    msg.should.have.property("T", "T");
                    msg.should.have.property("I");
                    done();
                }
                catch (e) {
                    console.log(e);
                    done(e);
                }
            });
            n1.receive({payload:"foo"});
        });
    });

    it('should overwrite env var of subflow template by env var of subflow instance', function(done) {
        var flow = [
            {id:"t0", type:"tab", label:"", disabled:false, info:""},
            {id:"n1", x:10, y:10, z:"t0", type:"subflow:s1",
             env: [
                 {name: "K", type: "T", value: "V",
                  info: {
                      name: "K",
                      label: "",
                      value: "V",
                      type: "T",
                      target_type: "env var",
                      "target": "K"
                  }}
             ],
             wires:[["n2"]]},
            {id:"n2", x:10, y:10, z:"t0", type:"helper", wires:[]},
            // Subflow
            {id:"s1", type:"subflow", name:"Subflow", info:"",
             env: [
                 {name: "K", type: "TT", value: "TV",
                  info: {
                      name: "K",
                      label: "",
                      value: "TV",
                      type: "TT",
                      target_type: "env var",
                      "target": "K"
                  }}
             ],
             in:[{
                 x:10, y:10,
                 wires:[ {id:"s1-n1"} ]
             }],
             out:[{
                 x:10, y:10,
                 wires:[ {id:"s1-n1", port:0} ]
             }]
            },
            {id:"s1-n1", x:10, y:10, z:"s1", type:"function",
             func:"msg.V = env.get('K'); msg.T = env.get('K_type'); msg.I = env.get('K_info'); return msg;",
             wires:[]}
        ];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property("V", "V");
                    msg.should.have.property("T", "T");
                    msg.should.have.property("I");
                    done();
                }
                catch (e) {
                    console.log(e);
                    done(e);
                }
            });
            n1.receive({payload:"foo"});
        });
    });

    it('should access env var of parent subflow template', function(done) {
        var flow = [
            {id:"t0", type:"tab", label:"", disabled:false, info:""},
            {id:"n1", x:10, y:10, z:"t0", type:"subflow:s1", wires:[["n2"]]},
            {id:"n2", x:10, y:10, z:"t0", type:"helper", wires:[]},
            // Subflow1
            {id:"s1", type:"subflow", name:"Subflow1", info:"",
             env: [
                 {name: "K", type: "T", value: "V",
                  info: {
                      name: "K",
                      label: "",
                      value: "V",
                      type: "T",
                      target_type: "env var",
                      "target": "K"
                  }}
             ],
             in:[{
                 x:10, y:10,
                 wires:[ {id:"s1-n1"} ]
             }],
             out:[{
                 x:10, y:10,
                 wires:[ {id:"s1-n2", port:0} ]
             }]
            },
            {id:"s1-n1", x:10, y:10, z:"s1", type:"subflow:s2",
             wires:[["s1-n2"]]},
            {id:"s1-n2", x:10, y:10, z:"s1", type:"function",
             func:"return msg;", wires:[]},
            // Subflow2
            {id:"s2", type:"subflow", name:"Subflow2", info:"",
             in:[{
                 x:10, y:10,
                 wires:[ {id:"s2-n1"} ]
             }],
             out:[{
                 x:10, y:10,
                 wires:[ {id:"s2-n1", port:0} ]
             }]
            },
            {id:"s2-n1", x:10, y:10, z:"s2", type:"function",
             func:"msg.V = env.get('K'); return msg;",
             wires:[]}
        ];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property("V", "V");
                done();
            });
            n1.receive({payload:"foo"});
        });
    });

    it('should access env var of parent subflow instance', function(done) {
        var flow = [
            {id:"t0", type:"tab", label:"", disabled:false, info:""},
            {id:"n1", x:10, y:10, z:"t0", type:"subflow:s1",
             env: [
                 {name: "K", type: "T", value: "V",
                  info: {
                      name: "K",
                      label: "",
                      value: "V",
                      type: "T",
                      target_type: "env var",
                      "target": "K"
                  }}
             ],
             wires:[["n2"]]},
            {id:"n2", x:10, y:10, z:"t0", type:"helper", wires:[]},
            // Subflow1
            {id:"s1", type:"subflow", name:"Subflow1", info:"",
             in:[{
                 x:10, y:10,
                 wires:[ {id:"s1-n1"} ]
             }],
             out:[{
                 x:10, y:10,
                 wires:[ {id:"s1-n2", port:0} ]
             }]
            },
            {id:"s1-n1", x:10, y:10, z:"s1", type:"subflow:s2",
             wires:[["s1-n2"]]},
            {id:"s1-n2", x:10, y:10, z:"s1", type:"function",
             func:"return msg;", wires:[]},
            // Subflow2
            {id:"s2", type:"subflow", name:"Subflow2", info:"",
             in:[{
                 x:10, y:10,
                 wires:[ {id:"s2-n1"} ]
             }],
             out:[{
                 x:10, y:10,
                 wires:[ {id:"s2-n1", port:0} ]
             }]
            },
            {id:"s2-n1", x:10, y:10, z:"s2", type:"function",
             func:"msg.V = env.get('K'); return msg;",
             wires:[]}
        ];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                msg.should.have.property("V", "V");
                done();
            });
            n1.receive({payload:"foo"});
        });
    });

});
