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
 
var should = require("should");
var when = require("when");
var sinon = require("sinon");

var fs = require('fs-extra');
var path = require('path');

var localfilesystem = require("../../../../../red/api/auth/tokens/localfilesystem.js");


describe("Tokens localfilesystem", function() {
    var userDir = path.join(__dirname,".testUserHome");
    beforeEach(function(done) {
        fs.remove(userDir,function(err) {
            fs.mkdir(userDir,done);
        });
    });
    afterEach(function(done) {
        fs.remove(userDir,done);
    });
    
    it("initialise when no session file exists",function(done) {
        localfilesystem.init({userDir:userDir}).then(function() {
            localfilesystem.get("1234").then(function(token) {
                should.not.exist(token);
                done();
            });
        });
    });
    
    it("initialises when session file exists", function(done) {
        var sessions = {"1234":{"user":"nol","client":"node-red-admin","scope":["*"],"accessToken":"1234"}};
        fs.writeFileSync(path.join(userDir,".sessions.json"),JSON.stringify(sessions),"utf8");

        localfilesystem.init({userDir:userDir}).then(function() {
            localfilesystem.get("1234").then(function(token) {
                token.should.eql(sessions['1234']);
                done();
            });
        });
    });
    
    it("writes new tokens to the session file",function(done) {
        var sessions = {"1234":{"user":"nol","client":"node-red-admin","scope":["*"],"accessToken":"1234"}};
        fs.writeFileSync(path.join(userDir,".sessions.json"),JSON.stringify(sessions),"utf8");

        localfilesystem.init({userDir:userDir}).then(function() {
            localfilesystem.create("5678",{
                user:"fred",
                client:"client",
                scope:["read"],
                accessToken:"5678"
            }).then(function() {
                var newSessions = JSON.parse(fs.readFileSync(path.join(userDir,".sessions.json"),"utf8"));
                newSessions.should.have.a.property("1234");
                newSessions.should.have.a.property("5678");
                done();
            });
        });
    });

    it("deletes tokens from the session file",function(done) {
        var sessions = {
            "1234":{"user":"nol","client":"node-red-admin","scope":["*"],"accessToken":"1234"},
            "5678":{"user":"fred","client":"client","scope":["read"],"accessToken":"5678"}
        };
        fs.writeFileSync(path.join(userDir,".sessions.json"),JSON.stringify(sessions),"utf8");

        localfilesystem.init({userDir:userDir}).then(function() {
            localfilesystem.delete("5678").then(function() {
                var newSessions = JSON.parse(fs.readFileSync(path.join(userDir,".sessions.json"),"utf8"));
                newSessions.should.have.a.property("1234");
                newSessions.should.not.have.a.property("5678");
                done();
            });
        });
    });
    
    
});
