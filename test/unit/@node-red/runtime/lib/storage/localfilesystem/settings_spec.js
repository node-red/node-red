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

var localfilesystemSettings = NR_TEST_UTILS.require("@node-red/runtime/lib/storage/localfilesystem/settings");

describe('storage/localfilesystem/settings', function() {
    var userDir = path.join(__dirname,".testUserHome");
    beforeEach(function(done) {
        fs.remove(userDir,function(err) {
            fs.mkdir(userDir,done);
        });
    });
    afterEach(function(done) {
        fs.remove(userDir,done);
    });

    it('should handle non-existent settings', function(done) {
        var settingsFile = path.join(userDir,".settings.json");

        localfilesystemSettings.init({userDir:userDir});
        fs.existsSync(settingsFile).should.be.false();
        localfilesystemSettings.getSettings().then(function(settings) {
            settings.should.eql({});
            done();
        }).catch(function(err) {
            done(err);
        });
    });

    it('should handle corrupt settings', function(done) {
        var settingsFile = path.join(userDir,".config.json");
        fs.writeFileSync(settingsFile,"[This is not json","utf8");
        localfilesystemSettings.init({userDir:userDir});
        fs.existsSync(settingsFile).should.be.true();
        localfilesystemSettings.getSettings().then(function(settings) {
            settings.should.eql({});
            done();
        }).catch(function(err) {
            done(err);
        });
    });

    it('should handle settings', function(done) {
        var settingsFile = path.join(userDir,".config.json");

        localfilesystemSettings.init({userDir:userDir});
        fs.existsSync(settingsFile).should.be.false();

        var settings = {"abc":{"type":"creds"}};

        localfilesystemSettings.saveSettings(settings).then(function() {
            fs.existsSync(settingsFile).should.be.true();
            localfilesystemSettings.getSettings().then(function(_settings) {
                _settings.should.eql(settings);
                done();
            }).catch(function(err) {
                done(err);
            });
        }).catch(function(err) {
            done(err);
        });
    });
});
