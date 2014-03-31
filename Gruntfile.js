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
            }
    });
    
    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-simple-mocha');
    
    // Default task(s).
    grunt.registerTask('default', ['simplemocha']);
    
};
