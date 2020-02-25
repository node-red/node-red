/**
 * Copyright JS Foundation and other contributors, http://js.foundation
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
 * @ignore
 **/

/**
 * Logging utilities
 * @mixin @node-red/util_log
 */

var util = require("util");
var EventEmitter = require("events").EventEmitter;

var i18n = require("./i18n");

var levels = {
    off:    1,
    fatal:  10,
    error:  20,
    warn:   30,
    info:   40,
    debug:  50,
    trace:  60,
    audit:  98,
    metric: 99
};

var levelNames = {
    10: "fatal",
    20: "error",
    30: "warn",
    40: "info",
    50: "debug",
    60: "trace",
    98: "audit",
    99: "metric"
};

var logHandlers = [];

var verbose;

var metricsEnabled = false;

var LogHandler = function(settings) {
    this.logLevel  = settings ? levels[settings.level]||levels.info : levels.info;
    this.metricsOn = settings ? settings.metrics||false : false;
    this.auditOn = settings ? settings.audit||false : false;

    metricsEnabled = metricsEnabled || this.metricsOn;

    this.handler   = (settings && settings.handler) ? settings.handler(settings) : consoleLogger;
    this.on("log",function(msg) {
        if (this.shouldReportMessage(msg.level)) {
            this.handler(msg);
        }
    });
}
util.inherits(LogHandler, EventEmitter);

LogHandler.prototype.shouldReportMessage = function(msglevel) {
    return (msglevel == log.METRIC && this.metricsOn) ||
           (msglevel == log.AUDIT && this.auditOn) ||
           msglevel <= this.logLevel;
}

var consoleLogger = function(msg) {
    if (msg.level == log.METRIC || msg.level == log.AUDIT) {
        util.log("["+levelNames[msg.level]+"] "+JSON.stringify(msg));
    } else {
        if (verbose && msg.msg && msg.msg.stack) {
            util.log("["+levelNames[msg.level]+"] "+(msg.type?"["+msg.type+":"+(msg.name||msg.id)+"] ":"")+msg.msg.stack);
        } else {
            var message = msg.msg;
            try {
                if (typeof message === 'object' && message !== null && message.toString() === '[object Object]' && message.message) {
                    message = message.message;
                }
            } catch(e){
                message = 'Exception trying to log: '+util.inspect(message);
            }
            
            util.log("["+levelNames[msg.level]+"] "+(msg.type?"["+msg.type+":"+(msg.name||msg.id)+"] ":"")+message);
        }
    }
}


var log = module.exports = {

    FATAL:  10,
    ERROR:  20,
    WARN:   30,
    INFO:   40,
    DEBUG:  50,
    TRACE:  60,
    AUDIT:  98,
    METRIC: 99,

    init: function(settings) {
        metricsEnabled = false;
        logHandlers = [];
        var loggerSettings = {};
        verbose = settings.verbose;
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

    /**
     * Add a log handler function
     * @memberof @node-red/util_log
     */
    addHandler: function(func) {
        logHandlers.push(func);
    },

    /**
     * Remove a log handler function
     * @memberof @node-red/util_log
     */
    removeHandler: function(func) {
        var index = logHandlers.indexOf(func);
        if (index > -1) {
            logHandlers.splice(index,1);
        }
    },

    /**
     * Log a message object
     * @memberof @node-red/util_log
     */
    log: function(msg) {
        msg.timestamp = Date.now();
        logHandlers.forEach(function(handler) {
            handler.emit("log",msg);
        });
    },

    /**
     * Log a message at INFO level
     * @memberof @node-red/util_log
     */
    info: function(msg) {
        log.log({level:log.INFO,msg:msg});
    },

    /**
     * Log a message at WARN level
     * @memberof @node-red/util_log
     */
    warn: function(msg) {
        log.log({level:log.WARN,msg:msg});
    },

    /**
     * Log a message at ERROR level
     * @memberof @node-red/util_log
     */
    error: function(msg) {
        log.log({level:log.ERROR,msg:msg});
    },

    /**
     * Log a message at TRACE level
     * @memberof @node-red/util_log
     */
    trace: function(msg) {
        log.log({level:log.TRACE,msg:msg});
    },

    /**
     * Log a message at DEBUG level
     * @memberof @node-red/util_log
     */
    debug: function(msg) {
        log.log({level:log.DEBUG,msg:msg});
    },

    /**
     * Check if metrics are enabled
     * @memberof @node-red/util_log
     */
    metric: function() {
        return metricsEnabled;
    },

    /**
     * Log an audit event.
     * @memberof @node-red/util_log
     */
    audit: function(msg,req) {
        msg.level = log.AUDIT;
        if (req) {
            msg.user = req.user;
            msg.path = req.path;
            msg.ip = req.ip || (req.headers && req.headers['x-forwarded-for']) || (req.connection && req.connection.remoteAddress) || undefined;
        }
        log.log(msg);
    }
}

/**
 * Perform a message catalog lookup.
 * @name _
 * @function
 * @memberof @node-red/util_log
 */
log["_"] = i18n._;
