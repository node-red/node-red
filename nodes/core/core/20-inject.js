/**
 * Copyright 2013, 2014 IBM Corp.
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

module.exports = function(RED) {
    var cron = require("cron");

    var settings = require(process.env.NODE_RED_HOME+"/red/red").settings;
    var holidaysList = settings.get('holidays') || [];
    var regOrder = null;

    function InjectNode(n) {
        RED.nodes.createNode(this,n);
        this.topic = n.topic;
        this.payload = n.payload;
        this.payloadType = n.payloadType;
        this.repeat = n.repeat;
        this.crontab = n.crontab;
        this.once = n.once;
        var node = this;
        this.interval_id = null;
        this.cronjob = [];

        // Convert something like 24/12/14 with format (D/M/Y) into {day: 24, month: 11, year: 2014}
        // Of course it could be solved somehow with regex, but strings are still faster
        function getDMY(date) {
            if (!regOrder) {
                regOrder = (settings.get('holidaysFormat') || 'd.m.y').toLowerCase().replace(/[^dmy]+/g, '').replace('dd', 'd').replace('mm', 'm').replace('yyyy', 'y').replace('yy', 'y');
            }
            var result = date.split(/[ .:-]/);
            var dmy = {day: 0, month: 0, year: -1};
            if (regOrder[0] == 'y') {
                dmy.year = result[0];
            } else
            if (regOrder[1] == 'y') {
                dmy.year = result[1];
            } else
            if (regOrder[2] == 'y') {
                dmy.year = result[2];
            }

            if (regOrder[0] == 'm') {
                dmy.month = result[0];
            } else
            if (regOrder[1] == 'm') {
                dmy.month = result[1];
            } else
            if (regOrder[2] == 'm') {
                dmy.month = result[2];
            }

            if (regOrder[0] == 'd') {
                dmy.day = result[0];
            } else
            if (regOrder[1] == 'd') {
                dmy.day = result[1];
            } else
            if (regOrder[2] == 'd') {
                dmy.day = result[2];
            }
            dmy.month = parseInt(dmy.month, 10) - 1; // Month [0-11]
            if (dmy.year == "0000") {
                dmy.year = -1;
            } else {
                dmy.year = parseInt(dmy.year, 10);
                if (dmy.year < 100) {
                    dmy.year += 2000;
                }
            }
            dmy.day = parseInt(dmy.day, 10);

            return dmy;
        }

        if (this.repeat && !isNaN(this.repeat) && this.repeat > 0) {
            this.repeat = this.repeat * 1000;
            this.log("repeat = "+this.repeat);
            this.interval_id = setInterval( function() {
                node.emit("input",{});
            }, this.repeat );
        } else if (this.crontab) {
            if (cron) {
                this.log("crontab = "+this.crontab);
                var holidays = false;
                // Remove holidays from crontab time. Holiday is week day 7.
                if (this.crontab.match(/0,6,7$/)) {
                    this.crontab = this.crontab.replace(/0,6,7$/, "0,6");
                    holidays = true;
                } else if (this.crontab.match(/0,6,7$/)) {
                    this.crontab = this.crontab.replace(/0,7$/, "0");
                    holidays = true;
                } else if (this.crontab.match(/ 7$/)) {
                    this.crontab = this.crontab.replace(/ 7$/, " *");
                    holidays = true;
                }

                if (this.crontab) {
                    // If normal job without holidays
                    if (!holidays || !holidaysList || !holidaysList.length) {
                        this.cronjob.push(new cron.CronJob(this.crontab,
                            function() {
                                node.emit("input",{});
                            },
                            null,true));
                    } else {
                        // Add as many jobs, as holidays in the list, because they all have different dates
                        for (var i = 0; i < holidaysList.length; i++) {
                            if (!holidaysList[i]) {
                                continue;
                            }

                            if (typeof holidaysList[i] == "string") {
                                holidaysList[i] = {"Unnamed": holidaysList[i]};
                            }
                            // Parse dates if not parsed
                            if (!holidaysList._date) {
                                for (var name in holidaysList[i]) {
                                    holidaysList[i]._date = getDMY(holidaysList[i][name]);
                                    break;
                                }
                            }

                            var crontab = this.crontab.split(' '); // seconds min hours date[1-31] month[0-11] daysOfWeek[0-6]
                            crontab[2] = holidaysList[i]._date.day;
                            crontab[3] = holidaysList[i]._date.month;

                            this.cronjob.push(new cron.CronJob(crontab.join(' '),
                                function () {
                                    var d = new Date();

                                    // Check if triggered date is in the list, because cron does not supports years
                                    for (var i = 0; i < holidaysList.length; i++) {
                                        if (holidaysList[i]._date.day   == d.getDate() &&
                                            holidaysList[i]._date.month == d.getMonth() &&
                                            (holidaysList[i]._date.year == -1 || holidaysList[i]._date.year == d.getFullYear())) {
                                            node.emit("input", {});
                                            break;
                                        }
                                    }
                                },
                                null, true));
                        }
                    }
                }
            } else {
                this.error("'cron' module not found");
            }
        }
    
        if (this.once) {
            setTimeout( function(){ node.emit("input",{}); }, 100);
        }
    
        this.on("input",function(msg) {
            var msg = {topic:this.topic};
            if ( (this.payloadType == null && this.payload == "") || this.payloadType == "date") {
                msg.payload = Date.now();
            } else if (this.payloadType == null || this.payloadType == "string") {
                msg.payload = this.payload;
            } else {
                msg.payload = "";
            }
            this.send(msg);
            msg = null;
        });
    }
    
    RED.nodes.registerType("inject",InjectNode);
    
    InjectNode.prototype.close = function() {
        if (this.interval_id != null) {
            clearInterval(this.interval_id);
            this.log("inject: repeat stopped");
        } else if (this.cronjob.length) {
            for (var i = 0; i < this.cronjob.length; i++) {
                this.cronjob[i].stop();
                delete this.cronjob[i];
            }
            this.log("inject: " + this.cronjob.length + " cronjob(s) stopped");
            this.cronjob = [];
        }
    }
    
    RED.httpAdmin.post("/inject/:id", function(req,res) {
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
}
