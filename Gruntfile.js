var child_process = require('child_process');

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
      watch: {
        server: {
          files: [
            "./**/*.js"
            ]
        }
      }
    });
    
    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-simple-mocha');
    grunt.loadNpmTasks('grunt-contrib-watch');
    
    // Default task(s).
    grunt.registerTask('test', ['simplemocha']);
    grunt.registerTask('default', function(){
     
      var child_express_app = child_process.fork('red');
      
      grunt.event.on('watch', function(action, filepath, target) {
        grunt.log.writeln('Restarting node-blue webapp');
        child_express_app.kill();
        child_express_app = child_process.fork('red');
      })
    });
};
