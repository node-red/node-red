/**
 * Copyright 2014, 2015 IBM Corp.
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

var levels = {
    off:    1,
    fatal:  10,
    error:  20,
    warn:   30,
    info:   40,
    debug:  50,
    trace:  60,
    metric: 99
};

var levelNames = {
    10: "fatal",
    20: "error",
    30: "warn",
    40: "info",
    50: "debug",
    60: "trace",
    99: "metric"
};

var logHandlers = [];

var metricsEnabled = false;

var LogHandler = function(settings) {
    this.logLevel  = settings ? levels[settings.level]||levels.info : levels.info;
    this.metricsOn = settings ? settings.metrics||false : false;
    metricsEnabled = this.metricsOn;
    this.handler   = (settings && settings.handler) ? settings.handler(settings) : consoleLogger;
    this.on("log",function(msg) {
        if (this.shouldReportMessage(msg.level)) {
            this.handler(msg);
        }
    });
}
util.inherits(LogHandler, EventEmitter);

LogHandler.prototype.shouldReportMessage = function(msglevel) {
    return msglevel <= this.logLevel || (msglevel == log.METRIC && this.metricsOn);
}

var consoleLogger = function(msg) {
    if (msg.level == log.METRIC) {
        util.log("[metric] "+JSON.stringify(msg));
    } else {
        util.log("["+levelNames[msg.level]+"] "+(msg.type?"["+msg.type+":"+(msg.name||msg.id)+"] ":"")+msg.msg);
    }
}

var log = module.exports = {
    FATAL:  10,
    ERROR:  20,
    WARN:   30,
    INFO:   40,
    DEBUG:  50,
    TRACE:  60,
    METRIC: 99,

    init: function(settings) {
        logHandlers = [];
        var loggerSettings = {};
        if (settings.logging) {
            var keys = Object.keys(settings.logging);
            if (keys.length === 0) {
                log.addHandler(new LogHandler());
            } else {
                for (var i=0, l=keys.length; i<l; i++) {
                    var config = settings.logging[keys[i]];
                    loggerSettings = config || {};
                    if ((keys[i] === "console") || config.handler) {
                        log.addHandler(new LogHandler(loggerSettings));
                    }
                }
            }
        } else {
            log.addHandler(new LogHandler());
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
    },
    info: function(msg) {
        log.log({level:log.INFO,msg:msg});
    },
    warn: function(msg) {
        log.log({level:log.WARN,msg:msg});
    },
    error: function(msg) {
        log.log({level:log.ERROR,msg:msg});
    },
    trace: function(msg) {
        log.log({level:log.TRACE,msg:msg});
    },
    debug: function(msg) {
        log.log({level:log.DEBUG,msg:msg});
    },
    metric: function() {
        return metricsEnabled;
    }
}
