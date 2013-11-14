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

//Simple node to introduce a pause into a flow

//Require main module
var RED = require(process.env.NODE_RED_HOME+"/red/red");

var node;

function random() {
	var wait = node.randomFirst + (node.diff * Math.random());
	if (node.buffer.length > 0) {
		node.send(node.buffer.pop());
		node.randomID = setTimeout(random,wait);
	} else {
		node.randomID = -1;
	}
}

//main node definition
function DelayNode(n) {
	RED.nodes.createNode(this,n);

	this.pauseType = n.pauseType;
	this.timeoutUnits = n.timeoutUnits;
	this.randomUnits = n.randomUnits;
	this.rateUnits = n.rateUnits;

	if (n.timeoutUnits === "milliseconds") {
		this.timeout = n.timout;
	} else if (n.timeoutUnits === "seconds") {
		this.timeout = n.timeout * 1000;
	} else if (n.timeoutUnits === "minutes") {
		this.timeout = n.timeout * (60 * 1000);
	} else if (n.timeoutUnits === "hours") {
		this.timeout = n.timeout * (60 * 60 * 1000);
	} else if (n.timeoutUnits === "days") {
		this.timeout = n.timeout * (24 * 60 * 60 * 1000);
	}

	if (n.rateUnits === "second") {
		this.rate = 1000/n.rate;
	} else if (n.rateUnits === "minute") {
		this.rate = (60 * 1000)/n.rate;
	} else if (n.rateUnits === "hour") {
		this.rate = (60 * 60 * 1000)/n.rate;
	} else if (n.rateUnits === "day") {
		this.rate = (24 * 60 * 60 * 1000)/n.rate;
	}


	if (n.randomUnits === "milliseconds") {
		this.randomFirst = n.randomFirst;
		this.randomLast = n.randomLast;
	} else if (n.randomUnits === "seconds") {
		this.randomFirst = n.randomFirst * 1000;
		this.randomLast = n.randomLast * 1000;
	} else if (n.randomUnits === "minutes") {
		this.randomFirst = n.randomFirst * (60 * 1000);
		this.randomLast = n.randomLast * (60 * 1000);
	} else if (n.randomUnits === "hours") {
		this.randomFirst = n.randomFirst * (60 * 60 * 1000);
		this.randomLast = n.randomLast * (60 * 60 * 1000);
	} else if (n.randomUnits === "days") {
		this.randomFirst = n.randomFirst * (24 * 60 * 60 * 1000);
		this.randomLast = n.randomLast * (24 * 60 * 60 * 1000);
	}

	this.diff = this.randomLast - this.randomFirst;

	this.name = n.name;
	this.idList = [];
	this.buffer = [];
	this.intervalID = -1;
	this.randomID = -1;
	node= this;

	if (this.pauseType === "delay") {
		this.on("input", function(msg) {
			var node= this;
			var id;
			id = setTimeout(function(){
				node.idList.splice(node.idList.indexOf(id),1);
				node.send(msg);
			}, node.timeout);
			this.idList.push(id);
		});

		this.on("close", function() {
			for (var i=0; i<this.idList.length; i++ ) {
				clearTimeout(this.idList[i]);
			}
			this.idList = [];
		});
	} else if (this.pauseType === "rate") {

		this.on("input", function(msg) {
			if ( node.intervalID !== -1) {
				node.buffer.push(msg);
				if (node.buffer.length > 1000) {
					node.warn(this.name + " buffer exceeded 1000 messages");
				}
			} else {
				node.send(msg);
				node.intervalID = setInterval(function() {
					if (node.buffer.length === 0) {
						clearInterval(node.intervalID);
						node.intervalID = -1;
					}

					if (node.buffer.length > 0) {
						node.send(node.buffer.shift());
					}
				},node.rate);
			}
		});

		this.on("close", function() {
			clearInterval(this.intervalID);
			this.buffer = [];
		});
	} else if (this.pauseType === "random") {

		this.on("input",function(msg){
			node.buffer.push(msg);
			if (node.randomID === -1) {
				var wait = node.randomFirst + (node.diff * Math.random());
				node.randomID = setTimeout(random,wait);
			}
		});

		this.on("close", function (){
			if (this.randomID !== -1) {
				clearTimeout(node.randomID);
			}
		});
	}
}


//register node
RED.nodes.registerType("delay",DelayNode);

