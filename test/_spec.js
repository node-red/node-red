/**
 * Copyright 2014 IBM Corp.
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

var core = "/../red";

/*
 * Walk directory and find all .js files. Then check if a corresponding
 * ./test/*_spec.js file exists.
 */
function walkDirectory(directory, done) {
    fs.readdir(directory, function(err, list) {
        if (err) {
            return done(err);
        }
        var i = 0;
        function nextEntry() {
            var file = list[i++];
            if (!file) {
                return;
            }
            file = directory + '/' + file;
            fs.stat(file, function(err, stat) {
                if (stat && stat.isDirectory()) {
                    walkDirectory(file, function(err, res) {
                        nextEntry();
                    });
                } else {
                    if (/\.js$/.test(file)) {
                        file = file.replace("/../", "/");
                        file = file.replace(".js", "_spec.js");
                        fs.exists(file, function(exists) {
                            try {
                                exists.should.equal(true, file + " does not exist");   
                            } catch (err) {
                                done(err);
                            }
                        });
                    }
                    nextEntry();
                }
            });
        }
        nextEntry();
    });
}

describe('_spec.js', function() {
    this.timeout(50000); // we might not finish within the Mocha default timeout limit, project will also grow
    it('is checking if all .js files have a corresponding _spec.js test file.', function(done) {
        walkDirectory(__dirname + core, done);
        done();
    });
});
