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
var artnet = require("artnet-node");
var util = require("util");

function ArtNetOutNode(n) {
    RED.nodes.createNode(this,n);

    this.host = n.host;
    this.port = n.port;
    this.usemsg = n.usemsg;
    this.universe = n.universe;
    this.channel = n.channel;
    this.data = n.data;
    this.name = n.name

    var client = artnet.Client.createClient(this.host, this.port);

this.on("input",function(msg) {

    if (n.usemsg){
	client.UNIVERSE=(msg.topic);
	client.send(msg.payload);
    } else {
	client.UNIVERSE[1] = n.universe;
	var data = [];
	for (var i=0;i<512;i++){
	    data[i]=0;
	}
	data[n.channel]=n.data;
	console.log(n.universe);
	console.log(n.channel);
	console.log(n.data);
	console.log(data.join());
	client.send(data);
    }

});
}

RED.nodes.registerType("artnet out",ArtNetOutNode);
