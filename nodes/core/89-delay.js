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
function DelayNode(n) {
   RED.nodes.createNode(this,n);
   
   this.pauseType = n.pauseType;
   this.timeoutUnits = n.timeoutUnits;
   this.rateUnits = n.rateUnits;
   
   if (n.timeoutUnits == "milliseconds") {
     this.timeout = n.timout;
   } else if (n.timeoutUnits == "seconds") {
     this.timeout = n.timeout * 1000;
   } else if (n.timeoutUnits == "minutes") {
     this.timeout = n.timeout * (60 * 1000);
   } else if (n.timeoutUnits == "hours") {
     this.timeout = n.timeout * (60 * 60 * 1000);
   } else if (n.timeoutUnits == "days") {
     this.timeout = n.timeout * (24 * 60 * 60 * 1000);
   }
   
   if (n.rateUnits == "second") {
     this.rate = 1000/n.rate;
   } else if (n.rateUnits == "minute") {
     this.rate = (60 * 1000)/n.rate;
   } else if (n.rateUnits == "hour") {
     this.rate = (60 * 60 * 1000)/n.rate;
   } else if (n.rateUnits == "day") {
     this.rate = (24 * 60 * 60 * 1000)/n.rate;
   }
   
   this.name = n.name;
   this.idList = [];
   this.buffer = [];
   this.intervalID = -1;
   var node= this;
   
   if (this.pauseType == "delay") {
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
   } else if (this.pauseType == "rate") {
   
     this.on("input", function(msg) {
       if ( node.intervalID != -1) {
         node.buffer.push(msg);
         if (node.buffer.length > 1000) {
           node.warn(this.name + " buffer exceeded 1000 messages");
         }
       } else {
         node.send(msg);
         node.intervalID = setInterval(function() {
           if (node.buffer.length == 0) {
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
   }
}



// register node
RED.nodes.registerType("delay",DelayNode);

