/*
  Copyright 2013 IBM Corp.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

--
HTTP_generic.js
Performs a generic HTTP Request (PUT, GET, POST, DELETE)
User can set method, host, port, path, content-type and header/data request.
Example of header parameters:'foo:bar,param2:value,param3:value'
By Charalampos Doukas
*/

var RED = require("../../red/red");
var http = require("http");


// The main node definition - most things happen in here
function HTTP_Request(n) {      
    // Create a RED node
    RED.nodes.createNode(this,n);
    var msg = {};
    this.method = n.method;
    this.header = n.header;
    this.data = n.data;
    this.host = n.host;
    this.port = n.port;
    this.path = n.path;
    this.contenttype = n.contenttype;
    var node = this;


  this.on("input", function(msg){
	var options = {
  		host: node.host,
  		port: node.port,
  		path: node.path,
  		method: node.method,
		headers: {
          		'Content-Type': node.contenttype
         	}
	};

	var req = http.request(options, function(res) {
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
			var msg = {};
			msg.payload = chunk;
			node.send(msg);
                });
        });

        req.on('error', function(e) {
                console.log('problem with request: ' + e.message);
        });

	var tmp_head = node.header.split(',');
	for(var i = 0; i < tmp_head.length; i++)
	{
		var head_part = tmp_head[i].split(':');
		req.setHeader(head_part[0], head_part[1]);
	}

        // write data to request body
        req.write(node.data);
        req.end();


  });

}

// Register the node by name. This must be called before overriding any of the
// Node functions.
RED.nodes.registerType("HTTP_generic", HTTP_Request);


HTTP_Request.prototype.close = function() {
	// Called when the node is shutdown - eg on redeploy.
	// Allows ports to be closed, connections dropped etc.
	// eg: this.client.disconnect();
}

