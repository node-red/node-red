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
var lvldb = require('leveldb');

function LevelNode(n) {
	RED.nodes.createNode(this,n);
	this.dbname = n.db;
	lvldb.open(this.dbname, { create_if_missing: true }, onOpen);
	var node = this;
	function onOpen(err, db) {
		if (err) node.error(err);
		node.db = db;
	}
}
RED.nodes.registerType("leveldbase",LevelNode);


function LevelDBNodeIn(n) {
	RED.nodes.createNode(this,n);
	this.level = n.level;
	this.op = n.op;
	this.levelConfig = RED.nodes.getNode(this.level);

	if (this.levelConfig) {
		var node = this;
		node.on("input", function(msg) {
			if (typeof msg.topic === 'string') {
				node.levelConfig.db.get(msg.topic, function(err, value) {
					if (err) node.error(err);
					msg.payload = JSON.parse(value);
					delete msg.cmd;
					node.send(msg);
				});
			}
			else {
				if (typeof msg.topic !== 'string') node.error("msg.topic (the key is not defined");
			}
		});
	}
	else {
		this.error("LevelDB database name not configured");
	}
}
RED.nodes.registerType("leveldb in",LevelDBNodeIn);


function LevelDBNodeOut(n) {
	RED.nodes.createNode(this,n);
	this.level = n.level;
	this.levelConfig = RED.nodes.getNode(this.level);

	if (this.levelConfig) {
		var node = this;
		node.on("input", function(msg) {
			if (typeof msg.topic === 'string') {
				console.log(msg);
				if (msg.payload === null) {
					node.levelConfig.db.del(msg.topic);
				}
				else {
					node.levelConfig.db.put(msg.topic, JSON.stringify(msg.payload), function(err) {
						if (err) node.error(err);
					});
				}
			}
			else {
				if (typeof msg.topic !== 'string') node.error("msg.topic (the key is not defined");
			}
		});
	}
	else {
		this.error("LevelDB database name not configured");
	}
}
RED.nodes.registerType("leveldb out",LevelDBNodeOut);
