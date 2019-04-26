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

var fs = require("fs");
var path = require("path");

var NR_TEST_UTILS = require("nr-test-utils");

var library = NR_TEST_UTILS.require("@node-red/registry/lib/library");

describe("library api", function() {
    it('returns null list when no modules have been registered', function() {
        library.init();
        should.not.exist(library.getExampleFlows());
    });
    it('returns null path when module is not known', function() {
        library.init();
        should.not.exist(library.getExampleFlowPath('foo','bar'));
    });

    it('returns a valid example path', function(done) {
        library.init();
        library.addExamplesDir("test-module",path.resolve(__dirname+'/resources/examples')).then(function() {
            try {
                var flows = library.getExampleFlows();
                flows.should.deepEqual({"test-module":{"f":["one"]}});

                var examplePath = library.getExampleFlowPath('test-module','one');
                examplePath.should.eql(path.resolve(__dirname+'/resources/examples/one.json'))


                library.removeExamplesDir('test-module');

                try {
                    should.not.exist(library.getExampleFlows());
                    should.not.exist(library.getExampleFlowPath('test-module','one'));
                    done();
                } catch(err) {
                    done(err);
                }
            }catch(err) {
                done(err);
            }
        });

    })
});
