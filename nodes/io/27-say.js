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

var RED = require("../../red/red");
var say = require("say");
var util = require("util");

function SayOutNode(n) {
    RED.nodes.createNode(this,n);

    this.voice = n.voice;
    this.speech = n.speech;
    this.name = n.name

this.on("input",function(msg) {

    try {speech = eval(n.speech);
	if (say.speaker) {
	    say.speak(n.voice,eval(n.speech));
	} else {
	    if (process.platform=="darwin"){		
	        this.error("say command not installed. Please install and restart node-red.");
	    } else {
	        this.error("festival not installed. Please install and restart node-red.");
	    }
        }
    } 
    catch(err){
	console.log(((n.name)?("At "+n.name):"At unnamed say out node")+", Speech String error: "+err);
    }
});
}

if (process.platform=="darwin"||"linux"){
	RED.nodes.registerType("say out",SayOutNode);
}
