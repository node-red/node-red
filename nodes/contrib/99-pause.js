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
function PauseNode(n) {
   RED.nodes.createNode(this,n);
   
   this.timeout = n.timeout * 1000;
   this.name = n.name
   
   this.on("input", function(msg) {
       var node= this;
       setTimeout(function(){node.send(msg);}, node.timeout);
   });
}

// register node
RED.nodes.registerType("pause",PauseNode);

