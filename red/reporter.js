/**
 * Copyright 2015 IBM Corp.
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

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Log = require("./log");
var TEN_SECONDS_MILLIS = 10000;
var intervalID = null;
var settings;

var reporter = {
    init: function(userSettings) {
        settings = userSettings;
    },
    start : start,
    stop : stop
}

function start() {
    if(settings && settings.metricsOn && settings.metricsOn === true) {
        if(!intervalID) {
            intervalID = setInterval(function() {
                reportMetrics();
            }, TEN_SECONDS_MILLIS);
        }
    }
}

function stop() {
    if (intervalID !== null) {
        clearInterval(intervalID);
        intervalID = null;
    }
}

function reportMetrics() {
    var memUsage = process.memoryUsage();
    
    // only need to init these once per report
    var metrics = {};
    metrics.level = Log.METRIC;
    metrics.nodeid = null;
    metrics.msgid = null;
    
    //report it
    metrics.event = "runtime.memory.rss"
    metrics.metric = memUsage.rss;
    Log.log(metrics);
    
    metrics.event = "runtime.memory.heapTotal"
    metrics.metric = memUsage.heapTotal;
    Log.log(metrics);
    
    metrics.event = "runtime.memory.heapUsed"
    metrics.metric = memUsage.heapUsed;
    Log.log(metrics);
}

module.exports = reporter;
