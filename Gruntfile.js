/**
 * Copyright 2013, 2014 IBM Corp.
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

module.exports = function(grunt) {
    
    // Project configuration.
    grunt.initConfig({
            pkg: grunt.file.readJSON('package.json'),
            simplemocha: {
                options: {
                    globals: ['expect'],
                    timeout: 3000,
                    ignoreLeaks: false,
                    ui: 'bdd',
                    reporter: 'tap'
                },
                all: { src: ['test/*.js'] }
            },
            jshint: {
                options: {
                    // http://www.jshint.com/docs/options/
                    "asi": true,      // allow missing semicolons
                    "curly": true,    // require braces
                    "eqnull": true,   // ignore ==null
                    "forin": true,    // require property filtering in "for in" loops
                    "immed": true,    // require immediate functions to be wrapped in ( )
                    "nonbsp": true,   // warn on unexpected whitespace breaking chars
                    //"strict": true, // commented out for now as it causes 100s of warnings, but want to get there eventually
                    "loopfunc": true, // allow functions to be defined in loops
                    "sub": true       // don't warn that foo['bar'] should be written as foo.bar
                },
                all: [
                    'Gruntfile.js',
                    'public/red/**/*.js',
                    'red.js',
                    'red/**/*.js',
                    'nodes/**/*.js',
                ],
                tests: {
                    files: {
                        src: ['test/*.js']
                    },
                    options: {
                        "expr": true
                    }
                }
                
            }
    });
    
    grunt.loadNpmTasks('grunt-simple-mocha');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    
    grunt.registerTask('default', ['jshint:tests','simplemocha']);
    grunt.registerTask('all', ['jshint:all','default']);
    
};
