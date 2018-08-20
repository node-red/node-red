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
var NR_TEST_UTILS = require("nr-test-utils");
var defaultFileSet = NR_TEST_UTILS.require("@node-red/runtime/lib/storage/localfilesystem/projects/defaultFileSet");

describe('storage/localfilesystem/projects/defaultFileSet', function() {
    var runtime = {
        i18n: {
            "_": function(name) {
                return name;
            }
        }
    };
    it('generates package.json for a project', function() {
        var generated = defaultFileSet["package.json"]({
            name: "A TEST NAME",
            summary: "A TEST SUMMARY",
            files: {
                flow: "MY FLOW FILE",
                credentials: "MY CREDENTIALS FILE"
            }
        }, runtime);

        var parsed = JSON.parse(generated);
        parsed.should.have.property('name',"A TEST NAME");
        parsed.should.have.property('description',"A TEST SUMMARY");
        parsed.should.have.property('node-red');
        parsed['node-red'].should.have.property('settings');
        parsed['node-red'].settings.should.have.property('flowFile',"MY FLOW FILE");
        parsed['node-red'].settings.should.have.property('credentialsFile',"MY CREDENTIALS FILE");
    });

    it('generates README.md for a project', function() {
        var generated = defaultFileSet["README.md"]({
            name: "A TEST NAME",
            summary: "A TEST SUMMARY"
        }, runtime);
        generated.should.match(/A TEST NAME/);
        generated.should.match(/A TEST SUMMARY/);
    });
    it('generates .gitignore for a project', function() {
        var generated = defaultFileSet[".gitignore"]({
            name: "A TEST NAME",
            summary: "A TEST SUMMARY"
        }, runtime);
        generated.length.should.be.greaterThan(0);
    });
});
