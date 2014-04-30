/**
 * Copyright 2013 IBM Corp.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

var RED = require(process.env.NODE_RED_HOME + "/red/red");
var nodemailer = require("nodemailer");

function EmailNode(n) {
	RED.nodes.createNode(this, n);
	this.topic = n.topic;
	this.name = n.name;

	var node = this;
	this.on("input", function(msg) {
		// node.log("email :",this.id,this.topic," received",msg.payload);
		if (msg != null) {

			nodemailer.createTransport("SMTP", {
				service : msg.service||n.service,
				auth : {
					user : msg.user || n.user,
					pass : msg.pass || n.pass
				}
			}).sendMail({
				from : msg.user || n.user, // sender address
				to : msg.name || node.name, // comma separated list of receivers
				subject : msg.topic, // Subject line
				text : msg.payload
			// plaintext body
			}, function(error, response) {
				if (error) {
					node.error(error);
				} else {
					node.log("Message sent: " + response.message);
				}
			});

		}
	});
}

RED.nodes.registerType("email", EmailNode);
