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
 
// Simple node to introduce a pause into a flow

// Require main module
var RED = require("../../red/red");


// main node definition
function RateLimitNode(n) {
   RED.nodes.createNode(this,n);
   this.buffer = [];
   this.timeout = 1000/n.rate;
   this.name = n.name
   
   var node= this
   
   this.intervalID = setInterval(function() {
      if (node.buffer.length > 0) {
         node.send(node.buffer.shift());
      }
   },this.timeout);
   
   this.on("input", function(msg) {
       this.buffer.push(msg);
       if (this.buffer.length > 1000) {
         this.warn(this.name + " buffer exceeded 1000 messages");
       }
   });
}

// register node
RED.nodes.registerType("rateLimit",RateLimitNode);

RateLimitNode.prototype.close = function() {
   clearInterval(this.intervalID);
   this.buffer = [];
}

