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
var express = require('express');
var fs = require("fs");
var events = require("../events");
var path = require("path");
var util = require("util");

var redNodes = require("../nodes");
var settings = require("../settings");

module.exports = {
    get: function(req,res) {
        res.json(redNodes.getFlows());
    },
    post: function(req,res) {
        var flows = req.body;
        redNodes.setFlows(flows).then(function() {
            res.send(204);
        }).otherwise(function(err) {
            util.log("[red] Error saving flows : "+err);
            res.send(500,err.message);
        });
    }
}
