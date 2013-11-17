module.exports = function (grunt) {

	'use strict';

	// load all grunt tasks from devDependencies
	require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

	grunt.initConfig({
		watch: {
			options: {
				debounceDelay: 500
			},
			express: {
				files: [
					'./red.js',
					'!./Gruntfile.js',
					'./red/**/*.js',
					'./nodes/**/*.js'
				],
				tasks: ['mochaTest:continuous:run', 'express:dev']
			}
		},
		express: {
			options: {
				nospawn: true,
				delay: 1000, // if server is not outputing anything when launched this is needed
			},
			dev: {
				options: {
					script: './red.js',
					node_env: 'development',
					debug: true
				}
			},
			prod: {
				options: {
					script: './red.js',
					node_env: 'production',
					background: false
				}
			}
		},
		mochaTest: {
			continuous: {
				options: {
					reporter: 'spec'
				},
				src: ['./test/**/*_spec.js']
			}
		},
		jshint: {
			options: {
				jshintrc: '.jshintrc'
			},
			all: [
				'./Gruntfile.js',
				'./red.js',
				'./red/**/*.js',
				'./nodes/**/*.js'
			]
		}
	});

	grunt.registerTask('test', [
		'mochaTest'
	]);

	grunt.registerTask('server', function (target) {

		if (target === 'prod') {
			return grunt.task.run([('express:' + target)]);
		} else {
			grunt.task.run([
				'mochaTest',
				'express:dev',
				'watch'
			]);
		}

	});

};