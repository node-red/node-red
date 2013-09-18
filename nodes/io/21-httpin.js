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
var util = require("util");

function HTTPIn(n) {
	RED.nodes.createNode(this,n);
	this.url = n.url;
	this.method = n.method;

	var node = this;
	this.callback = function(req,res) {
		node.send({req:req,res:res});
	}
	if (this.method == "get") {
		RED.app.get(this.url,this.callback);
	} else if (this.method == "post") {
		RED.app.post(this.url,this.callback);
	} else if (this.method == "put") {
		RED.app.put(this.url,this.callback);
	} else if (this.method == "delete") {
		RED.app.delete(this.url,this.callback);
	}
}

RED.nodes.registerType("http in",HTTPIn);

HTTPIn.prototype.close = function() {
    console.log(RED.app.routes[this.method]);
	var routes = RED.app.routes[this.method];
	for (var i in routes) {
		if (routes[i].path == this.url) {
			routes.splice(i,1);
			break;
		}
	}
    console.log(RED.app.routes[this.method]);
}

