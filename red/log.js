/**
 * Copyright 2014 IBM Corp.
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

var util = require("util");
var EventEmitter = require("events").EventEmitter;

var logHandlers = [];

var ConsoleLogHandler = new EventEmitter();
ConsoleLogHandler.on("log",function(msg) {
        util.log("["+msg.level+"] ["+msg.type+":"+(msg.name||msg.id)+"] "+msg.msg);
});

var log = module.exports = {
    addHandler: function(func) {
        logHandlers.push(func);
    },
    
    log: function(msg) {
        for (var i in logHandlers) {
            logHandlers[i].emit("log",msg);
        }
    }
}

log.addHandler(ConsoleLogHandler);
