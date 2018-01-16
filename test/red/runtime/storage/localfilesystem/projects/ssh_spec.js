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

var should = require("should");
var sinon = require("sinon");
var child_process = require('child_process');
var EventEmitter = require("events");

var ssh = require("../../../../../../red/runtime/storage/localfilesystem/projects/ssh")

describe("localfilesystem/projects/ssh", function() {

    afterEach(function() {
        child_process.spawn.restore();
    })

    it("invokes sshkeygen", function(done) {
        var command;
        var args;
        var opts;
        sinon.stub(child_process,"spawn", function(_command,_args,_opts) {
            _command = command;
            _args = args;
            _opts = opts;

            var e = new EventEmitter();
            e.stdout = new EventEmitter();
            e.stderr = new EventEmitter();
            setTimeout(function() {
                e.stdout.emit("data","result");
                e.emit("close",0);
            },50)
            return e;
        });

        ssh.generateKey({
            size: 123,
            location: 'location',
            comment: 'comment',
            password: 'password'
        }).then(function(output) {
            output.should.equal("result");
            done();
        }).catch(function(err) {
            done(err);
        })
    })

    it("reports passphrase too short", function(done) {
        var command;
        var args;
        var opts;
        sinon.stub(child_process,"spawn", function(_command,_args,_opts) {
            _command = command;
            _args = args;
            _opts = opts;

            var e = new EventEmitter();
            e.stdout = new EventEmitter();
            e.stderr = new EventEmitter();
            setTimeout(function() {
                e.stdout.emit("data","result");
                e.stderr.emit("data","passphrase is too short");
                e.emit("close",1);
            },5)
            return e;
        });

        ssh.generateKey({
            size: 123,
            location: 'location',
            comment: 'comment',
            password: 'password'
        }).then(function(output) {
            done(new Error("Error not thrown"));
        }).catch(function(err) {
            err.should.have.property("code","key_passphrase_too_short");
            done();
        })
    });

    it("reports key length too short", function(done) {
        var command;
        var args;
        var opts;
        sinon.stub(child_process,"spawn", function(_command,_args,_opts) {
            _command = command;
            _args = args;
            _opts = opts;

            var e = new EventEmitter();
            e.stdout = new EventEmitter();
            e.stderr = new EventEmitter();
            setTimeout(function() {
                e.stdout.emit("data","result");
                e.stderr.emit("data","Key must at least be 1024 bits");
                e.emit("close",1);
            },50)
            return e;
        });

        ssh.generateKey({
            size: 123,
            location: 'location',
            comment: 'comment',
            password: 'password'
        }).then(function(output) {
            done(new Error("Error not thrown"));
        }).catch(function(err) {
            err.should.have.property("code","key_length_too_short");
            done();
        })
    });


});
