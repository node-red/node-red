/**
 * Copyright 2013 IBM Corp.
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

var RED = require(process.env.NODE_RED_HOME+"/red/red");
var util = require("util");
var parseString = require('xml2js').parseString;
var gotEyes = false;
try {
    var eyes = require("eyes");
    gotEyes = true;
} catch(e) {
    util.log("[73-parsexml.js] Note: Module 'eyes' not installed. (not needed, but useful)");
}

function Xml2jsNode(n) {
    RED.nodes.createNode(this,n);
    this.useEyes = n.useEyes;
    var node = this;
    this.on("input", function(msg) {
        try {
            parseString(msg.payload, {strict:true,async:true}, function (err, result) {
            //parseString(msg.payload, {strict:false,async:true}, function (err, result) {
                if (err) { node.error(err); }
                else {
                    msg.payload = result;
                    node.send(msg);
                    if (node.useEyes == true) {
                        if (gotEyes == true) { eyes.inspect(msg); }
                        else { node.log(JSON.stringify(msg)); }
                    }
                }
            });
        }
        catch(e) { util.log("[73-parsexml.js] "+e); }
    });
}
RED.nodes.registerType("xml2js",Xml2jsNode);
