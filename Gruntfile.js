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

var path = require("path");

module.exports = function(grunt) {

    var nodemonArgs = ["-v"];
    var flowFile = grunt.option('flowFile');
    if (flowFile) {
        nodemonArgs.push(flowFile);
    }

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        paths: {
            dist: ".dist"
        },
        simplemocha: {
            options: {
                globals: ['expect'],
                timeout: 3000,
                ignoreLeaks: false,
                ui: 'bdd',
                reporter: 'spec'
            },
            all: { src: ['test/**/*_spec.js'] },
            core: { src: ["test/_spec.js","test/red/**/*_spec.js"]},
            nodes: { src: ["test/nodes/**/*_spec.js"]}
        },
        jshint: {
            options: {
                jshintrc:true
                // http://www.jshint.com/docs/options/
                //"asi": true,      // allow missing semicolons
                //"curly": true,    // require braces
                //"eqnull": true,   // ignore ==null
                //"forin": true,    // require property filtering in "for in" loops
                //"immed": true,    // require immediate functions to be wrapped in ( )
                //"nonbsp": true,   // warn on unexpected whitespace breaking chars
                ////"strict": true, // commented out for now as it causes 100s of warnings, but want to get there eventually
                //"loopfunc": true, // allow functions to be defined in loops
                //"sub": true       // don't warn that foo['bar'] should be written as foo.bar
            },
            all: [
                'Gruntfile.js',
                'red.js',
                'red/**/*.js',
                'nodes/core/*/*.js',
                'editor/js/**/*.js'
            ],
            core: {
                files: {
                    src: [
                        'Gruntfile.js',
                        'red.js',
                        'red/**/*.js'
                    ]
                }
            },
            nodes: {
                files: {
                    src: [ 'nodes/core/*/*.js' ]
                }
            },
            editor: {
                files: {
                    src: [ 'editor/js/**/*.js' ]
                }
            },
            tests: {
                files: {
                    src: ['test/**/*.js']
                },
                options: {
                    "expr": true
                }
            }
        },
        concat: {
            options: {
                separator: ";",
            },
            build: {
                src: [
                    // Ensure editor source files are concatenated in
                    // the right order
                    "editor/js/red.js",
                    "editor/js/events.js",
                    "editor/js/i18n.js",
                    "editor/js/settings.js",
                    "editor/js/user.js",
                    "editor/js/comms.js",
                    "editor/js/text/bidi.js",
                    "editor/js/text/format.js",
                    "editor/js/ui/state.js",
                    "editor/js/nodes.js",
                    "editor/js/history.js",
                    "editor/js/validators.js",
                    "editor/js/ui/utils.js",
                    "editor/js/ui/common/editableList.js",
                    "editor/js/ui/common/menu.js",
                    "editor/js/ui/common/popover.js",
                    "editor/js/ui/common/searchBox.js",
                    "editor/js/ui/common/tabs.js",
                    "editor/js/ui/common/typedInput.js",
                    "editor/js/ui/actions.js",
                    "editor/js/ui/deploy.js",
                    "editor/js/ui/diff.js",
                    "editor/js/ui/keyboard.js",
                    "editor/js/ui/workspaces.js",
                    "editor/js/ui/view.js",
                    "editor/js/ui/sidebar.js",
                    "editor/js/ui/palette.js",
                    "editor/js/ui/tab-info.js",
                    "editor/js/ui/tab-config.js",
                    "editor/js/ui/palette-editor.js",
                    "editor/js/ui/editor.js",
                    "editor/js/ui/tray.js",
                    "editor/js/ui/clipboard.js",
                    "editor/js/ui/library.js",
                    "editor/js/ui/notifications.js",
                    "editor/js/ui/search.js",
                    "editor/js/ui/typeSearch.js",
                    "editor/js/ui/subflow.js",
                    "editor/js/ui/touch/radialMenu.js"
                ],
                dest: "public/red/red.js"
            },
            vendor: {
                files: {
                    "public/vendor/vendor.js": [
                        "editor/vendor/jquery/js/jquery-1.11.3.min.js",
                        "editor/vendor/bootstrap/js/bootstrap.min.js",
                        "editor/vendor/jquery/js/jquery-ui-1.10.3.custom.min.js",
                        "editor/vendor/jquery/js/jquery.ui.touch-punch.min.js",
                        "editor/vendor/marked/marked.min.js",
                        "editor/vendor/d3/d3.v3.min.js",
                        "editor/vendor/i18next/i18next.min.js"
                    ],
                    "public/vendor/vendor.css": [
                        // TODO: resolve relative resource paths in
                        //       bootstrap/FA/jquery
                    ],
                    "public/vendor/jsonata/jsonata.js": [
                        "node_modules/jsonata/jsonata.js",
                        "editor/vendor/jsonata/formatter.js"
                    ]
                }
            }
        },
        uglify: {
            build: {
                files: {
                    'public/red/red.min.js': 'public/red/red.js',
                    'public/red/main.min.js': 'public/red/main.js',
                    'public/vendor/jsonata/jsonata.min.js': 'public/vendor/jsonata/jsonata.js',
                    'public/vendor/ace/mode-jsonata.js': 'editor/vendor/jsonata/mode-jsonata.js',
                    'public/vendor/ace/worker-jsonata.js': 'editor/vendor/jsonata/worker-jsonata.js',
                    'public/vendor/ace/snippets/jsonata.js': 'editor/vendor/jsonata/snippets-jsonata.js'
                }
            }
        },
        sass: {
            build: {
                options: {
                    outputStyle: 'compressed'
                },
                files: [{
                    dest: 'public/red/style.min.css',
                    src: 'editor/sass/style.scss'
                },
                {
                    dest: 'public/vendor/bootstrap/css/bootstrap.min.css',
                    src: 'editor/vendor/bootstrap/css/bootstrap.css'
                }]
            }
        },
        jsonlint: {
            messages: {
                src: [
                    'nodes/core/locales/en-US/messages.json',
                    'red/api/locales/en-US/editor.json',
                    'red/runtime/locales/en-US/runtime.json'
                ]
            },
            keymaps: {
                src: [
                    'editor/js/keymap.json'
                ]
            }
        },
        attachCopyright: {
            js: {
                src: [
                    'public/red/red.min.js',
                    'public/red/main.min.js'
                ]
            },
            css: {
                src: [
                    'public/red/style.min.css'
                ]
            }
        },
        clean: {
            build: {
                src: [
                    "public/red",
                    "public/index.html",
                    "public/favicon.ico",
                    "public/icons",
                    "public/vendor"
                ]
            },
            release: {
                src: [
                    '<%= paths.dist %>'
                ]
            }
        },
        watch: {
            js: {
                files: [
                    'editor/js/**/*.js'
                ],
                tasks: ['copy:build','concat','uglify','attachCopyright:js']
            },
            sass: {
                files: [
                    'editor/sass/**/*.scss'
                ],
                tasks: ['sass','attachCopyright:css']
            },
            json: {
                files: [
                    'nodes/core/locales/en-US/messages.json',
                    'red/api/locales/en-US/editor.json',
                    'red/runtime/locales/en-US/runtime.json'
                ],
                tasks: ['jsonlint:messages']
            },
            keymaps: {
                files: [
                    'editor/js/keymap.json'
                ],
                tasks: ['jsonlint:keymaps','copy:build']
            },
            misc: {
                files: [
                    'CHANGELOG.md'
                ],
                tasks: ['copy:build']
            }
        },

        nodemon: {
            /* uses .nodemonignore */
            dev: {
                script: 'red.js',
                options: {
                    args: nodemonArgs,
                    ext: 'js,html,json',
                    watch: [
                        'red','nodes'
                    ]
                }
            }
        },

        concurrent: {
            dev: {
                tasks: ['nodemon', 'watch'],
                options: {
                    logConcurrentOutput: true
                }
            }
        },

        copy: {
            build: {
                files:[
                    {
                        src: 'editor/js/main.js',
                        dest: 'public/red/main.js'
                    },
                    {
                        src: 'editor/js/keymap.json',
                        dest: 'public/red/keymap.json'
                    },
                    {
                        cwd: 'editor/images',
                        src: '**',
                        expand: true,
                        dest: 'public/red/images/'
                    },
                    {
                        cwd: 'editor/vendor',
                        src: [
                            'ace/**',
                            //'bootstrap/css/**',
                            'bootstrap/img/**',
                            'jquery/css/**',
                            'font-awesome/**'
                        ],
                        expand: true,
                        dest: 'public/vendor/'
                    },
                    {
                        cwd: 'editor/icons',
                        src: '**',
                        expand: true,
                        dest: 'public/icons/'
                    },
                    {
                        expand: true,
                        src: ['editor/index.html','editor/favicon.ico'],
                        dest: 'public/',
                        flatten: true
                    },
                    {
                        src: 'CHANGELOG.md',
                        dest: 'public/red/about'
                    }
                ]
            },
            release: {
                files: [{
                    mode: true,
                    expand: true,
                    src: [
                        '*.md',
                        'LICENSE',
                        'package.json',
                        'settings.js',
                        'red.js',
                        'lib/.gitignore',
                        'nodes/*.demo',
                        'nodes/core/**',
                        'red/**',
                        'public/**',
                        'editor/templates/**',
                        'bin/**'
                    ],
                    dest: path.resolve('<%= paths.dist %>/node-red-<%= pkg.version %>')
                }]
            }
        },
        chmod: {
            options: {
                mode: '755'
            },
            release: {
                // Target-specific file/dir lists and/or options go here.
                src: [
                    path.resolve('<%= paths.dist %>/node-red-<%= pkg.version %>/nodes/core/hardware/nrgpio*')
                ]
            }
        },
        compress: {
            release: {
                options: {
                    archive: '<%= paths.dist %>/node-red-<%= pkg.version %>.zip'
                },
                expand: true,
                cwd: '<%= paths.dist %>/',
                src: ['node-red-<%= pkg.version %>/**']
            }
        }
    });

    grunt.loadNpmTasks('grunt-simple-mocha');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-sass');
    grunt.loadNpmTasks('grunt-nodemon');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-chmod');
    grunt.loadNpmTasks('grunt-jsonlint');

    grunt.registerMultiTask('attachCopyright', function() {
        var files = this.data.src;
        var copyright = "/**\n"+
            " * Copyright JS Foundation and other contributors, http://js.foundation\n"+
            " *\n"+
            " * Licensed under the Apache License, Version 2.0 (the \"License\");\n"+
            " * you may not use this file except in compliance with the License.\n"+
            " * You may obtain a copy of the License at\n"+
            " *\n"+
            " * http://www.apache.org/licenses/LICENSE-2.0\n"+
            " *\n"+
            " * Unless required by applicable law or agreed to in writing, software\n"+
            " * distributed under the License is distributed on an \"AS IS\" BASIS,\n"+
            " * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n"+
            " * See the License for the specific language governing permissions and\n"+
            " * limitations under the License.\n"+
            " **/\n";

        if (files) {
            for (var i=0;i<files.length;i++) {
                var file = files[i];
                if (!grunt.file.exists(file)) {
                    grunt.log.warn('File '+ file + ' not found');
                    return false;
                } else {
                    var content = grunt.file.read(file);
                    if (content.indexOf(copyright) == -1) {
                        content = copyright+content;
                        if (!grunt.file.write(file, content)) {
                            return false;
                        }
                        grunt.log.writeln("Attached copyright to "+file);
                    } else {
                        grunt.log.writeln("Copyright already on "+file);
                    }
                }
            }
        }
    });

    grunt.registerTask('setDevEnv',
        'Sets NODE_ENV=development so non-minified assets are used',
            function () {
                process.env.NODE_ENV = 'development';
            });

    grunt.registerTask('default',
        'Builds editor content then runs code style checks and unit tests on all components',
        ['build','test-core','test-editor','test-nodes']);

    grunt.registerTask('test-core',
        'Runs code style check and unit tests on core runtime code',
        ['jshint:core','simplemocha:core']);

    grunt.registerTask('test-editor',
        'Runs code style check on editor code',
        ['jshint:editor']);

    grunt.registerTask('test-nodes',
        'Runs unit tests on core nodes',
        ['simplemocha:nodes']);

    grunt.registerTask('build',
        'Builds editor content',
        ['clean:build','jsonlint','concat:build','concat:vendor','copy:build','uglify:build','sass:build','attachCopyright']);

    grunt.registerTask('dev',
        'Developer mode: run node-red, watch for source changes and build/restart',
        ['build','setDevEnv','concurrent:dev']);

    grunt.registerTask('release',
        'Create distribution zip file',
        ['build','clean:release','copy:release','chmod:release','compress:release']);

};
