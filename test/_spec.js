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

var fs = require("fs");
var should = require("should");
var path = require('path');

// Directories to check with .js files and _spec.js files respectively
var jsdir = path.resolve(__dirname, "../red");
var testdir = path.resolve(__dirname, "red");

var fs = require('fs');
var walkDirectory = function(dir, topdir, done) {
    fs.readdir(dir, function(err, list) {
        var error;
        var errReturned = false;
        if (err) {
            return done(err);
        }

        var i = 0;
        (function next() {
            var file = list[i++];

            // return error if there are no more files to check and error has not been previously returned to avoid multiple calls to done()
            if (!file) {
                if (!errReturned) {
                    errReturned = true;
                    return done(error);
                }
            } else {
                file = path.resolve(dir, file);
                fs.stat(file, function(err, stat) {
                    if (stat && stat.isDirectory()) {
                        walkDirectory(file, false, function(err) {
                            if (!error) {
                                error = err;
                            }
                            next();
                        });
                    } else {
                        if (path.extname(file) === ".js") {
                            var testFile = file.replace(jsdir, testdir).replace(".js", "_spec.js");
                            fs.exists(testFile, function (exists) {
                                try {
                                    exists.should.equal(true, testFile + " does not exist");
                                } catch (err) {
                                    if (!topdir) {
                                        return done(err);
                                    } else {
                                        error = err;
                                        return;
                                    }
                                }
                            });
                        }
                        next();
                    }
                });
            }
        })();
    });
};

describe('_spec.js', function() {
    this.timeout(50000); // we might not finish within the Mocha default timeout limit, project will also grow
    it('is checking if all .js files have a corresponding _spec.js test file.', function(done) {
        walkDirectory(jsdir, true, done);
    });
});
