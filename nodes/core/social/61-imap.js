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
var Imap = require('imap');
var util = require('util');
var oldmail = {};

try {
	var emailkey = RED.settings.email || require(process.env.NODE_RED_HOME+"/../emailkeys.js");
} catch(err) {
	throw new Error("Failed to load Email credentials");
}

var imap = new Imap({
	user: emailkey.user,
	password: emailkey.pass,
	host: emailkey.server||"imap.gmail.com",
	port: emailkey.port||"993",
	secure: true
});

function fail(err) {
	util.log('[imap] : ' + err);
}

function openInbox(cb) {
	imap.connect(function(err) {
		if (err) fail(err);
		imap.openBox('INBOX', true, cb);
	});
}

function ImapNode(n) {
	RED.nodes.createNode(this,n);
	this.name = n.name;
	this.repeat = n.repeat * 1000;
	var node = this;
	this.interval_id = null;

	if (this.repeat && !isNaN(this.repeat) && this.repeat > 0) {
		this.log("repeat = "+this.repeat);
		this.interval_id = setInterval( function() {
			node.emit("input",{});
		}, this.repeat );
	}

	this.on("input", function(msg) {
		openInbox(function(err, mailbox) {
		  if (err) fail(err);
		  imap.seq.fetch(mailbox.messages.total + ':*', { struct: false },
			{ headers: ['from', 'subject'],
			  body: true,
			  cb: function(fetch) {
				fetch.on('message', function(msg) {
				  //node.log('Saw message no. ' + msg.seqno);
				  var pay = {};
				  var body = '';
				  msg.on('headers', function(hdrs) {
					pay.from = hdrs.from[0];
					pay.topic = hdrs.subject[0];
				  });
				  msg.on('data', function(chunk) {
					body += chunk.toString('utf8');
				  });
				  msg.on('end', function() {
					pay.payload = body;
					if ((pay.topic !== oldmail.topic)|(pay.payload !== oldmail.payload)) {
						oldmail = pay;
						//node.log("From: "+pay.from);
						node.log("Subj: "+pay.topic);
						//node.log("Body: "+pay.payload);
						node.send(pay);
					}
				  });
				});
			  }
			}, function(err) {
				if (err) node.log("Err : "+err);
				//node.log("Done fetching messages.");
				imap.logout();
			}
		  );
		});

	});

	this.on("close", function() {
 		if (this.interval_id != null) {
        	clearInterval(this.interval_id);
    	}
	});
}

RED.nodes.registerType("imap",ImapNode);
