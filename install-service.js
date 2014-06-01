/**
* Copyright 2013 IBM Corp.
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

if (process.platform === 'win32') {
  var Service = require('node-windows').Service;
} else if (process.platform === 'darwin') {
  var Service = require('node-mac').Service;
} else if (process.platform === 'linux'{
  var Service = require('node-linux').Service;
} else {
  console.log('Not Windows or OSx');
  process.exit(1);
}
 
var svc = new Service({
  name:'Node-Red',
  description: 'A visual tool for wiring the Internet of Things',
  script: require('path').join(__dirname,'red.js')
});
 
svc.on('install',function(){
  svc.start();
});
 
svc.on('uninstall',function(){
  console.log('Uninstall complete.');
  console.log('The service exists: ',svc.exists);
});
 
if (process.argv.length == 3) {
  if ( process.argv[2] == 'install') {
    svc.install();
  } else if ( process.argv[2] == 'uninstall' ) {
    svc.uninstall();
  }
} else {
  concole.log('Run with the command line argument of either install or uninstall');
}
