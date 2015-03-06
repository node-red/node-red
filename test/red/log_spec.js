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
var should = require("should");

describe("red/log", function() {
    it('can be required without errors', function() {
        require("../../red/log");
    });

    var log = require("../../red/log");

    it('it can raise an error', function() {
        var m = {level:20, msg:"This is an error", type:"test", id:"12345", name:"ERROR" };
        var ret = log.error(m);
    });

    it('it can raise a trace', function() {
        var m = {level:60, msg:"This is a trace", type:"test", id:"12345", name:"TRACE" };
        var ret = log.trace(m);
    });

    it('it can raise a debug', function() {
        var m = {level:50, msg:"This is a debug", type:"test", id:"12345", name:"DEBUG" };
        var ret = log.debug(m);
    });
});
