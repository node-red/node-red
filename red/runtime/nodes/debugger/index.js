/**
 * Copyright 2016 IBM Corp.
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

var readline = require('readline');
var rl;

var runtime;
var components;

var breakpoints = {};

var enabled = false;

function enable() {
    enabled = true;
}
function disable() {
    enabled = false;
}

function formatNode(n) {
    return n.id+" ["+n.type+"]"+(n.name?" "+n.name:"");
}
function listNodes() {
    var flowIds = runtime.nodes.listFlows();
    flowIds.forEach(function(id) {
        var flow = runtime.nodes.getFlow(id);
        console.log(flow.id+" [flow]"+(flow.label?" "+flow.label:""));
        if (flow.subflows) {
            flow.subflows.forEach(function(sf) {
                console.log("  - "+formatNode(sf));
                sf.configs.forEach(function(n) {
                    console.log("     - "+formatNode(n));
                })
                sf.nodes.forEach(function(n) {
                    console.log("     - "+formatNode(n));
                })

            })
        }
        if (flow.configs) {
            flow.configs.forEach(function(n) {
                console.log("  - "+formatNode(n));
            })
        }
        if (flow.nodes) {
            flow.nodes.forEach(function(n) {
                console.log("  - "+formatNode(n));
            })
        }

    })
}
function listNode(id) {
    console.log(id);
    var node = runtime.nodes.getNode(id);
    if (node) {
        console.log(node);
    }
}
function listFlows() {
}

function handleAddBreakpoint(args) {
    var valid = false;
    var bp = {};
    if (args.length > 0) {
        bp.node = args[0];
        valid = true;
        if (args.length > 1) {
            if (args[1]==='i' || args[1]==='o') {
                bp.type = args[1];
                if (args.length > 2) {
                    bp.index = args[2];
                }
            } else {
                valid = false;
            }
        }
    }
    if (valid) {
        var id = addBreakpoint(bp);
        console.log("Added breakpoint",id?id:"");
    } else {
        console.log("break <nodeid> [i|o] <index>");
    }
}

function handleRemoveBreakpoint(args) {
    if (args.length === 0) {
        breakpoints = {};
        console.log("Cleared all breakpoints");
        return;
    }
    if (args.length === 1 && breakpoints.hasOwnProperty(args[0])) {
        delete breakpoints[args[0]];
        console.log("Cleared all breakpoints on node",args[0]);
        return;
    }
    if (args.length === 2 && breakpoints.hasOwnProperty(args[0]) && (args[1] === 'i' || args[1] === 'o')) {
        var c = Object.keys(breakpoints[args[0]][args[1]]).length;
        breakpoints[args[0]][args[1]] = {};
        breakpoints[args[0]].c -= c;
        if (breakpoints[args[0]].c === 0) {
            delete breakpoints[args[0]];
        }
        console.log("Cleared all",(args[1]==='i'?'input':'output'),"breakpoints on node",args[0]);
        return;
    }
    if (args.length === 3 && breakpoints.hasOwnProperty(args[0]) && (args[1] === 'i' || args[1] === 'o')) {
        var id = args.join(":");
        if (removeBreakpoint(args.join(":"))) {
            console.log("Cleared breakpoint",id);
        }
    }
}
function handleInfo(args) {
    if (args[0] === 'breakpoints') {
        console.log(breakpoints);
    }
}
function init(_runtime,_components) {
    runtime = _runtime;
    components = _components;
    breakpoints = {};


    enabled = true;

    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'nrdb> '
    });
    rl.on('line', function(input) {
        input = input.trim();
        var parts = input.split(/\s+/);
        var cmd = parts[0];
        var args = parts.slice(1)

        switch(cmd) {
            case 'pause':
            case 'p':
                console.log("pausing");
                components.router.pause();
                break;
            case 'continue':
            case 'c':
                console.log("resuming");
                components.router.resume();
                break;
            case 'nodes': listNodes(); break;
            case 'flows': listFlows(); break;
            case 'node': if (args.length === 1) { listNode(args[0]); } break;
            case 'break': handleAddBreakpoint(args); break;
            case 'delete': handleRemoveBreakpoint(args); break;
            case 'info': handleInfo(args); break;
        }
        var m = /^node\s+([^\s]+)$/.exec(input);
        if (m) {
            listNode(m[1]);
        }
        rl.prompt();
    }).on('close', function() {
        console.log("exiting nrdb");
        runtime.stop().then(function() {
            process.exit(0);
        });
    })
    rl.setPrompt('nrdb> ');
    rl.prompt();

}

/*
 * {
 *    node: id,
 *    type: 'i/o',
 *    index: 0
 * }
 */
function addBreakpoint(bp) {
    if (!bp.hasOwnProperty('node')) {
        return;
    }
    var node = runtime.nodes.getNode(bp.node);
    if (!node || !node._config.hasOwnProperty('wires')) {
        return;
    }

    if (!bp.hasOwnProperty('type')) {
        addBreakpoint({node:bp.node,type:'i'});
        addBreakpoint({node:bp.node,type:'o'});
    } else if (!bp.hasOwnProperty('index')) {
        if (bp.type === 'i') {
            addBreakpoint({node:bp.node,type:'i',index:0});
        } else {
            for (var i=0;i<node._config.wires.length;i++) {
                addBreakpoint({node:bp.node,type:'o',index:i});
            }
        }
        return;
    } else {
        breakpoints[bp.node] = breakpoints[bp.node] || {c:0,i:{},o:{}};
        if (!breakpoints[bp.node][bp.type][bp.index]) {
            breakpoints[bp.node][bp.type][bp.index] = true;
            breakpoints[bp.node].c++;
        }
        return bp.node+":"+bp.type+":"+bp.index;
    }
}
function removeBreakpoint(id) {
    var m = /^(.+):([io]):(\d+)$/.exec(id);
    if (m) {
        var node = m[1];
        var portType = m[2];
        var portIndex = m[3];
        if (breakpoints[node]) {
            delete breakpoints[node][portType][portIndex];
            breakpoints[node].c--;
            if (breakpoints[node].c === 0) {
                delete breakpoints[node];
            }
            return true;
        }
    }
    return false;
}

function getBreakpoints() {
    return breakpoints;
}

function checkSendEvent(evt) {
    return (enabled && (
        (breakpoints.hasOwnProperty(evt.sourceNode.id) && breakpoints[evt.sourceNode.id].o[evt.sourcePort]) ||
        (breakpoints.hasOwnProperty(evt.destinationNode.id) && breakpoints[evt.destinationNode.id].i[evt.destinationPort])
    ));
}

module.exports = {
    init:init,
    enable: enable,
    disable: disable,
    addBreakpoint:addBreakpoint,
    removeBreakpoint: removeBreakpoint,
    getBreakpoints: getBreakpoints,
    checkSendEvent: checkSendEvent
}
