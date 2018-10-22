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

/**
 * This test simply checks that for every .js file there exists
 * a *_spec.js file under ./test correspondingly.
 */

/**
 * Currently we're only checking the core components under ./red
 * TODO: Increase the scope of this check
 */

var fs = require("fs-extra");
var should = require("should");
var path = require('path');

// Directories to check with .js files and _spec.js files respectively
var rootdir = path.resolve(__dirname, "../..");
var jsdir = path.resolve(__dirname, "../../packages/node_modules/");
var testdir = path.resolve(__dirname);

var walkDirectory = function(dir) {
    var p = fs.readdir(dir);
    var errors = [];
    return p.then(function(list) {
        var promises = [];
        list.forEach(function(file) {
            var filePath = path.join(dir,file);

            if (!/@node-red\/(editor-client|nodes)/.test(filePath) && !/node-red\/settings\.js/.test(filePath) && !/\/docs\//.test(filePath)) {
                promises.push(fs.stat(filePath).then(function(stat){
                    if (stat.isDirectory()) {
                        return walkDirectory(filePath).then(function(results) {
                            if (results) {
                                errors = errors.concat(results);
                            }
                        });
                    } else if (/\.js$/.test(filePath)) {
                        var testFile = filePath.replace(jsdir, testdir).replace(".js", "_spec.js");
                        return fs.exists(testFile).then(function(exists) {
                            if (!exists) {
                                errors.push(testFile.substring(rootdir.length+1));
                            } else {
                                return fs.stat(testFile).then(function(stat) {
                                    if (stat.size === 0) {
                                        errors.push("[empty] "+testFile.substring(rootdir.length+1));
                                    }
                                })
                            }
                        });
                    }
                }));
            }
        });
        return Promise.all(promises).then(function() {
            return errors;
        })
    });
}

describe('_spec.js', function() {
    this.timeout(50000); // we might not finish within the Mocha default timeout limit, project will also grow
    it('is checking if all .js files have a corresponding _spec.js test file.', function(done) {
        walkDirectory(jsdir).then(function(errors) {
            if (errors.length > 0) {
                var error = new Error("Missing/empty _spec files:\n\t"+errors.join("\n\t"));
                done(error);
            } else {
                done();
            }
        });
    });
});
