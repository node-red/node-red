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
var functionNode = require("nr-test-utils").require("@node-red/nodes/core/function/10-function.js");
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
                 {name: "K", type: "str", value: "V"}
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
             func:"msg.V = env.get('K'); return msg;",
             wires:[]}
        ];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property("V", "V");
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
                 {name: "K", type: "str", value: "V"}
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
             func:"msg.V = env.get('K'); return msg;",
             wires:[]}
        ];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property("V", "V");
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

    it('should access last env var with same name', function(done) {
        var flow = [
            {id:"t0", type:"tab", label:"", disabled:false, info:""},
            {id:"n1", x:10, y:10, z:"t0", type:"subflow:s1",
             env: [
                 {name: "K", type: "str", value: "V0"},
                 {name: "X", type: "str", value: "VX"},
                 {name: "K", type: "str", value: "V1"}
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
             func:"msg.V = env.get('K'); return msg;",
             wires:[]}
        ];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property("V", "V1");
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

    it('should access typed value of env var', function(done) {
        var flow = [
            { id: "t0", type: "tab", label: "", disabled: false, info: "" },
            {
                id: "n1", x: 10, y: 10, z: "t0", type: "subflow:s1",
                env: [
                    { name: "KN", type: "num", value: "100" },
                    { name: "KB", type: "bool", value: "true" },
                    { name: "KJ", type: "json", value: "[1,2,3]" },
                    { name: "Kb", type: "bin", value: "[65,65]" },
                    { name: "Ke", type: "env", value: "KS" },
                    { name: "Kj", type: "jsonata", value: "1+2" },
                ],
                wires: [["n2"]]
            },
            { id: "n2", x: 10, y: 10, z: "t0", type: "helper", wires: [] },
            // Subflow
            {
                id: "s1", type: "subflow", name: "Subflow", info: "",
                in: [{ x: 10, y: 10, wires: [{ id: "s1-n1" }] }],
                out: [{ x: 10, y: 10, wires: [{ id: "s1-n1", port: 0 }] }],
                env: [{ name: "KS", type: "str", value: "STR" }]
            },
            {
                id: "s1-n1", x: 10, y: 10, z: "s1", type: "function",
                func: "msg.VE = env.get('Ke'); msg.VS = env.get('KS'); msg.VN = env.get('KN'); msg.VB = env.get('KB'); msg.VJ = env.get('KJ'); msg.Vb = env.get('Kb'); msg.Vj = env.get('Kj'); return msg;",
                wires: []
            }
        ];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property("VS", "STR");
                    msg.should.have.property("VN", 100);
                    msg.should.have.property("VB", true);
                    msg.should.have.property("VJ", [1,2,3]);
                    msg.should.have.property("Vb");
                    should.ok(msg.Vb instanceof Buffer);
                    msg.should.have.property("VE","STR");
                    msg.should.have.property("Vj",3);
                    done();
                }
                catch (e) {
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
                 {name: "K", type: "str", value: "V"}
             ],
             wires:[["n2"]]},
            {id:"n2", x:10, y:10, z:"t0", type:"helper", wires:[]},
            // Subflow
            {id:"s1", type:"subflow", name:"Subflow", info:"",
             env: [
                 {name: "K", type: "str", value: "TV"}
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
             func:"msg.V = env.get('K'); return msg;",
             wires:[]}
        ];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property("V", "V");
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
                 {name: "K", type: "str", value: "V"},
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
                 {name: "K", type: "str", value: "V"}
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

    it('should access env var of tab', function(done) {
        var flow = [
            {id:"t0", type:"tab", label:"", disabled:false, info:"", env: [
                {name: "K", type: "str", value: "V"}
            ]},
            {id:"n1", x:10, y:10, z:"t0", type:"subflow:s1", wires:[["n2"]]},
            {id:"n2", x:10, y:10, z:"t0", type:"helper", wires:[]},
            // Subflow
            {id:"s1", type:"subflow", name:"Subflow", info:"", env: [],
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
             func:"msg.V = env.get('K'); return msg;",
             wires:[]}
        ];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property("V", "V");
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

    it('should access env var of group', function(done) {
        var flow = [
            {id:"t0", type:"tab", label:"", disabled:false, info:""},
            {id:"g1", z:"t0", type:"group", env:[
                {name: "K", type: "str", value: "V"}
            ]},
            {id:"n1", x:10, y:10, z:"t0", g:"g1", type:"subflow:s1", wires:[["n2"]]},
            {id:"n2", x:10, y:10, z:"t0", type:"helper", wires:[]},
            // Subflow
            {id:"s1", type:"subflow", name:"Subflow", info:"", env: [],
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
             func:"msg.V = env.get('K'); return msg;",
             wires:[]}
        ];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property("V", "V");
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

    it('should access env var of nested group', function(done) {
        var flow = [
            {id:"t0", type:"tab", label:"", disabled:false, info:""},
            {id:"g1", z:"t0", type:"group", env:[
                {name: "K", type: "str", value: "V"}
            ]},
            {id:"g2", z:"t0", g:"g1", type:"group", env:[]},
            {id:"n1", x:10, y:10, z:"t0", g:"g2", type:"subflow:s1", wires:[["n2"]]},
            {id:"n2", x:10, y:10, z:"t0", type:"helper", wires:[]},
            // Subflow
            {id:"s1", type:"subflow", name:"Subflow", info:"", env: [],
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
             func:"msg.V = env.get('K'); return msg;",
             wires:[]}
        ];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property("V", "V");
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

    it('should access NR_NODE_PATH env var within subflow instance', function(done) {
        var flow = [
            {id:"t0", type:"tab", label:"", disabled:false, info:""},
            {id:"n1", x:10, y:10, z:"t0", type:"subflow:s1",
             env: [], wires:[["n2"]]},
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
             func:"msg.payload = env.get('NR_NODE_PATH'); return msg;",
             wires:[]}
        ];
        helper.load(functionNode, flow, function() {
            var n1 = helper.getNode("n1");
            var n2 = helper.getNode("n2");
            n2.on("input", function(msg) {
                try {
                    msg.should.have.property("payload", "t0/n1/s1-n1");
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


});
