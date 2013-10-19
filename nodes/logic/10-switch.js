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

var operators = {
    'eq':function(a,b) { return a == b; },
    'neq':function(a,b) { return a != b; },
    'lt':function(a,b) { return a < b; },
    'lte':function(a,b) { return a <= b; },
    'gt':function(a,b) { return a > b; },
    'gte':function(a,b) { return a >= b; },
    'btwn':function(a,b,c) { return a >= b && a <= c; },
    'cont':function(a,b) { return (a+"").indexOf(b) != -1; },
    'regex': function(a,b) { return (a+"").match(new RegExp(b)); },
    'true': function(a) { return a === true; },
    'false': function(a) { return a === false; },
    'null': function(a) { return a === null; },
    'nnull': function(a) { return a !== null; }
};


function SwitchNode(n) {
	RED.nodes.createNode(this,n);
	
	this.rules = n.rules;
	this.property = n.property;
	
	var propertyParts = n.property.split(".");
	
	var node = this;
	
	this.on('input',function(msg) {
	      var onward = [];
	      var prop = propertyParts.reduce(function(obj,i) {
	          return obj[i]
	      },msg);
	      for (var i=0;i<node.rules.length;i+=1) {
	          var rule = node.rules[i];
	          if (operators[rule.t](prop,rule.v,rule.v2)) {
	              onward.push(msg);
	          } else {
	              onward.push(null);
	          }
	      }
	      this.send(onward);
	});
}

RED.nodes.registerType("switch",SwitchNode);

