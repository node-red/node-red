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

function InjectNode(n) {
	RED.nodes.createNode(this,n);
	this.topic = n.topic;
	this.payload = n.payload;
	this.repeat = n.repeat;
	this.once = n.once;
	var node = this;
	this.interval_id = null;

	if (this.repeat && !isNaN(this.repeat) && this.repeat > 0) {
		this.repeat = this.repeat * 1000;
		this.log("repeat = "+this.repeat);
		this.interval_id = setInterval( function() {
			node.emit("input",{});
		}, this.repeat );
	}

	if (this.once) {
		setTimeout( function(){ node.emit("input",{}); }, 50);
	}

	this.on("input",function(msg) {
		var msg = {topic:this.topic,payload:this.payload};
		if (msg.payload == "") { msg.payload = Date.now(); }
		this.send(msg);
		msg = null;
	});
}

RED.nodes.registerType("inject",InjectNode);

InjectNode.prototype.close = function() {
    if (this.interval_id != null) {
        clearInterval(this.interval_id);
        this.log("inject: repeat stopped");
    }
}

RED.app.post("/inject/:id", function(req,res) {
        var node = RED.nodes.getNode(req.params.id);
        if (node != null) {
            try {
                node.receive();
                res.send(200);
            } catch(err) {
                res.send(500);
                node.error("Inject failed:"+err);
                console.log(err.stack);
            }
        } else {
            res.send(404);
        }
});
