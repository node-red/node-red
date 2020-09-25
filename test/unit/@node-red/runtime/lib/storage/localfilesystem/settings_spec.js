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

const should = require("should");
const fs = require('fs-extra');
const path = require('path');

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
        var settingsFile = path.join(userDir,".config.json");
        localfilesystemSettings.init({userDir:userDir}).then(function() {
            fs.existsSync(settingsFile).should.be.false();
            return localfilesystemSettings.getSettings();
        }).then(function(settings) {
            settings.should.eql({});
            done();
        }).catch(err => { done(err)});
    });

    it('should migrate single config.json to multiple files', function(done) {
        var settingsFile = path.join(userDir,".config.json");
        fs.writeFileSync(settingsFile,JSON.stringify({
            nodes:{a:1},
            _credentialSecret: "foo",
            users:{b:2},
            projects: {c:3}
        }),"utf8");

        async function checkFile(sectionName, expectedContents) {
            const file = path.join(userDir,".config."+sectionName+".json");
            fs.existsSync(file).should.be.true();
            var contents = await fs.readFile(file,'utf8');
            var data = JSON.parse(contents);
            data.should.eql(expectedContents)
        }

        localfilesystemSettings.init({userDir:userDir}).then(async function() {
            // (For now) leave the old settings file in place
            fs.existsSync(settingsFile).should.be.true();
            await checkFile("nodes",{a:1})
            await checkFile("users",{b:2})
            await checkFile("projects",{c:3})
            await checkFile("runtime",{_credentialSecret:"foo"})
            done();
        }).catch(err => { done(err)});
    });

    it('should load separate settings file', async function() {
        await fs.writeFile( path.join(userDir,".config.nodes.json"),JSON.stringify({a:1}),"utf8");
        await fs.writeFile( path.join(userDir,".config.users.json"),JSON.stringify({b:2}),"utf8");
        await fs.writeFile( path.join(userDir,".config.projects.json"),JSON.stringify({c:3}),"utf8");
        await fs.writeFile( path.join(userDir,".config.runtime.json"),JSON.stringify({_credentialSecret:"foo"}),"utf8");

        return localfilesystemSettings.init({userDir:userDir})
            .then(localfilesystemSettings.getSettings)
            .then(settings => {
                settings.should.eql({
                    nodes:{a:1},
                    _credentialSecret: "foo",
                    users:{b:2},
                    projects: {c:3}
                })
        })
    });

    it('should write only the files that need writing', async function() {
        await fs.writeFile( path.join(userDir,".config.nodes.json"),JSON.stringify({a:1}),"utf8");
        await fs.writeFile( path.join(userDir,".config.users.json"),JSON.stringify({b:2}),"utf8");
        await fs.writeFile( path.join(userDir,".config.projects.json"),JSON.stringify({c:3}),"utf8");
        await fs.writeFile( path.join(userDir,".config.runtime.json"),JSON.stringify({_credentialSecret:"foo"}),"utf8");

        const fsStatNodes = await fs.stat(path.join(userDir,".config.nodes.json"))
        const fsStatUsers = await fs.stat(path.join(userDir,".config.users.json"))
        const fsStatProjects = await fs.stat(path.join(userDir,".config.projects.json"))
        const fsStatRuntime = await fs.stat(path.join(userDir,".config.runtime.json"))

        return localfilesystemSettings.init({userDir:userDir}).then(function() {
            return new Promise(res => {
                setTimeout(function() {
                    res();
                },10)
            });
        }).then(() => {
            return localfilesystemSettings.saveSettings({
                nodes:{d:4},
                _credentialSecret: "bar",
                users:{b:2},
                projects: {c:3}
            })
        }).then(async function() {

            const newFsStatNodes = await fs.stat(path.join(userDir,".config.nodes.json"))
            const newFsStatUsers = await fs.stat(path.join(userDir,".config.users.json"))
            const newFsStatProjects = await fs.stat(path.join(userDir,".config.projects.json"))
            const newFsStatRuntime = await fs.stat(path.join(userDir,".config.runtime.json"))

            // Not changed
            newFsStatUsers.mtimeMs.should.eql(fsStatUsers.mtimeMs);
            newFsStatProjects.mtimeMs.should.eql(fsStatProjects.mtimeMs);

            // Changed
            newFsStatNodes.mtimeMs.should.not.eql(fsStatNodes.mtimeMs);
            newFsStatRuntime.mtimeMs.should.not.eql(fsStatRuntime.mtimeMs);

        })
    });
});
