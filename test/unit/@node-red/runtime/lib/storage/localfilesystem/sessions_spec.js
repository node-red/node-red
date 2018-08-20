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
var fs = require('fs-extra');
var path = require('path');

var NR_TEST_UTILS = require("nr-test-utils");
var localfilesystemSessions = NR_TEST_UTILS.require("@node-red/runtime/lib/storage/localfilesystem/sessions");

describe('storage/localfilesystem/sessions', function() {
    var userDir = path.join(__dirname,".testUserHome");
    beforeEach(function(done) {
        fs.remove(userDir,function(err) {
            fs.mkdir(userDir,done);
        });
    });
    afterEach(function(done) {
        fs.remove(userDir,done);
    });
    it('should handle non-existent sessions', function(done) {
        var sessionsFile = path.join(userDir,".sessions.json");

        localfilesystemSessions.init({userDir:userDir});
        fs.existsSync(sessionsFile).should.be.false();
        localfilesystemSessions.getSessions().then(function(sessions) {
            sessions.should.eql({});
            done();
        }).catch(function(err) {
            done(err);
        });
    });

    it('should handle corrupt sessions', function(done) {
        var sessionsFile = path.join(userDir,".sessions.json");
        fs.writeFileSync(sessionsFile,"[This is not json","utf8");
        localfilesystemSessions.init({userDir:userDir});
        fs.existsSync(sessionsFile).should.be.true();
        localfilesystemSessions.getSessions().then(function(sessions) {
            sessions.should.eql({});
            done();
        }).catch(function(err) {
            done(err);
        });
    });

    it('should handle sessions', function(done) {
        var sessionsFile = path.join(userDir,".sessions.json");

        localfilesystemSessions.init({userDir:userDir});
        fs.existsSync(sessionsFile).should.be.false();

        var sessions = {"abc":{"type":"creds"}};

        localfilesystemSessions.saveSessions(sessions).then(function() {
            fs.existsSync(sessionsFile).should.be.true();
            localfilesystemSessions.getSessions().then(function(_sessions) {
                _sessions.should.eql(sessions);
                done();
            }).catch(function(err) {
                done(err);
            });
        }).catch(function(err) {
            done(err);
        });
    });
});
