#!/usr/bin/env node
;(function() {
/**
 * Copyright 2014 IBM Corp.
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
 
var util = require("util");
var request = require("request");
var colors = require('colors');
var apiRequest = require("./lib/request");
var config = require("./lib/config");

var commands = {
    "target": function() {
        var target = process.argv[3];
        if (target) {
            if (!/^https?:\/\/.+/.test(target)) {
                console.warn("Invalid target url");
                return;
            }
            if (target.slice(-1) == "/") {
                target = target.slice(0,target.length-1);
            }
            var oldTarget = config.target;
            config.target = target;
        } else {
            console.log("Target: ".yellow+config.target);
        }
        
    },
    "nodes": function() {
        apiRequest('/nodes',{}).then(logNodeList).otherwise(logFailure);
    },
    "node": function() {
        apiRequest('/nodes/'+process.argv[3],{}).then(logNodeList).otherwise(logFailure);
    },
    "enable-node": function() {
        apiRequest('/nodes/'+process.argv[3],{
            method: "PUT",
            body: JSON.stringify({enabled:true})
        }).then(logNodeList).otherwise(logFailure);
    },
    "disable-node": function() {
        apiRequest('/nodes/'+process.argv[3],{
            method: "PUT",
            body: JSON.stringify({enabled:false})
        }).then(logNodeList).otherwise(logFailure);
    },
    "install": function() {
        apiRequest('/nodes',{
            method: "POST",
            body: JSON.stringify({module:process.argv[3]})
        }).then(logNodeList).otherwise(logFailure);
    },
    "remove": function() {
        apiRequest('/nodes/'+process.argv[3],{
            method: "DELETE"
        }).then(logNodeList).otherwise(logFailure);
    },
    "search": function() {
        var options = {
            method: "GET",
            url: 'https://registry.npmjs.org/-/_view/byKeyword?startkey=["node-red"]&amp;endkey=["node-red",{}]&amp;group_level=3' ,
            headers: {
                'Accept': 'application/json',
            }
        };
        request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var info = (JSON.parse(body)).rows;
                var filter = null;
                if (process.argv[3]) {
                    filter = new RegExp(process.argv[3]);
                }
                for (var i=0;i<info.length;i++) {
                    var n = info[i];
                    if (!filter || filter.test(n.key[1]) || filter.test(n.key[2])) {
                        console.log(n.key[1] + (" - "+ n.key[2]).grey);
                    }
                }
            } else if (error) {
                console.log(error.toString().red);
            } else {
                console.log((response.statusCode+": "+body).red);
            }
        });   
    }
}

function logNodeList(nodes) {
    if (!util.isArray(nodes)) {
        nodes = [nodes];
    }
    for (var i=0;i<nodes.length;i++) {
        var n = nodes[i];
        console.log(formatNodeInfo(n))
    }
}

function logFailure(msg) {
    console.log(msg.red);
}

function formatBoolean(v,c) {
    if (v) {
        return ("["+c+"]");
    } else {
        return ("[ ]");
    }
}

function formatNodeInfo(n) {
    var inError = n.hasOwnProperty("err");
    
    var str = formatBoolean(n.enabled,"X")+formatBoolean(n.loaded,"L")+" ";
    str += n.id;
    if (n.enabled && n.loaded) {
        str = str.green;
    } else if (n.enabled && n.err) {
        str = str.red;
    } else {
        str = str.yellow;
    }
    if (n.module) {
        str += " ["+n.module+"]";
    }
    str += " "+n.types.join(", ");
    if (n.err) {
        str+=" "+n.err.red;
    }
    return str;
}

if (commands[process.argv[2]]) {
    commands[process.argv[2]].call();
}


})();
