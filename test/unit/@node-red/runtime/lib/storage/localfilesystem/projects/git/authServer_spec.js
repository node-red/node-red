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
 **/

var net = require("net");
var path = require("path");
var os = require("os");
var should = require("should");
var sinon = require("sinon");
var child_process = require("child_process");
var fs = require("fs-extra");

var NR_TEST_UTILS = require("nr-test-utils");

var authServer = NR_TEST_UTILS.require("@node-red/runtime/lib/storage/localfilesystem/projects/git/authServer");


var sendPrompt = function(localPath, prompt) {
    return new Promise(function(resolve,reject) {
        var response;
        var socket = net.connect(localPath, function() {
            socket.on('data', function(data) { response = data; socket.end() });
            socket.on('end', function() {
                resolve(response);
            });
            socket.on('error',reject);
            socket.write(prompt+"\n", 'utf8');
        });
        socket.setEncoding('utf8');
    });
}


describe("localfilesystem/projects/git/authServer", function() {
    it("listens for user/pass prompts and returns provided auth", function(done) {
        authServer.ResponseServer({username: "TEST_USER", password: "TEST_PASS"}).then(function(rs) {
            sendPrompt(rs.path,"Username").then(function(response) {
                response.should.eql("TEST_USER");
                return sendPrompt(rs.path,"Password");
            }).then(function(response) {
                response.should.eql("TEST_PASS");
            }).then(() => {
                rs.close();
                done();
            }).catch(function(err) {
                rs.close();
                done(err);
            })

        })
    });

    it("listens for ssh prompts and returns provided auth", function(done) {
        authServer.ResponseSSHServer({passphrase: "TEST_PASSPHRASE"}).then(function(rs) {
            sendPrompt(rs.path,"The").then(function(response) {
                // TODO:
                response.should.eql("yes");
                return sendPrompt(rs.path,"Enter");
            }).then(function(response) {
                response.should.eql("TEST_PASSPHRASE");
            }).then(() => {
                rs.close();
                done();
            }).catch(function(err) {
                rs.close();
                done(err);
            })

        })
    })
});
