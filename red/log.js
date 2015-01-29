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

var logLevel;
var metricsOn;

var levels = {
    "fatal" : 10,
    "error" : 20,
    "warn" : 30,
    "info" : 40,
    "debug" : 50,
    "trace" : 60
}

var logHandlers = [];

var ConsoleLogHandler = new EventEmitter();
ConsoleLogHandler.on("log",function(msg) {
    if ((msg.level === 'metric')) {
        if (metricsOn) {
            util.log("["+msg.level+"] ["+msg.event+":"+ msg.nodeid+":"+ msg.msguuid+"]"+metrics);
        }
    } else if (shouldReportMessage(msg.level)) {
        util.log("["+msg.level+"] ["+msg.type+":"+(msg.name||msg.id)+"] "+msg.msg);
    }
});

function shouldReportMessage(msglevel) {
    if (((msglevel === 'fatal') && (logLevel === 10)) ||
            ((msglevel === 'error') && (logLevel >= 20)) ||
            ((msglevel === 'warn') && (logLevel >= 30)) ||
            ((msglevel === 'info') && (logLevel >= 40)) ||
            ((msglevel === 'debug') && (logLevel >= 50)) ||
            ((msglevel === 'trace') && (logLevel === 60))) {
        return true;
    }
    return false;
}


var log = module.exports = {
        
    init: function(settings) {
        if (settings.logLevel) {
            var levelNames = Object.keys(levels);
            levelNames.forEach(function(levelName) {
                if (levelName === settings.logLevel) {
                   logLevel =levels[levelName];
                }
            });
        } 
        if (!logLevel) {
            // handles case if someone has put in garbage for the log level
            logLevel = 40;
        }
        if (settings.metricsOn) {
            metricsOn = settings.metricsOn
        } else {
            metricsOn = false;
        }
    },
        
    addHandler: function(func) {
        logHandlers.push(func);
    },
    
    log: function(msg) {
        msg.timestamp = Date.now();
        logHandlers.forEach(function(handler) {
            handler.emit("log",msg);
        });
    }
}

log.addHandler(ConsoleLogHandler);
