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

// The `https` setting requires the `fs` module. Uncomment the following
// to make it available:
//var fs = require("fs");

 
module.exports = {
    // the tcp port that the Node-RED web server is listening on
    uiPort: 1880,

    // By default, the Node-RED UI accepts connections on all IPv4 interfaces.
    // The following property can be used to listen on a specific interface. For
    // example, the following would only allow connections from the local machine.
    //uiHost: "127.0.0.1",

    // Retry time in milliseconds for MQTT connections
    mqttReconnectTime: 15000,

    // Retry time in milliseconds for Serial port connections
    serialReconnectTime: 15000,

    // Retry time in milliseconds for TCP socket connections
    //socketReconnectTime: 10000,

    // Timeout in milliseconds for TCP server socket connections
    //  defaults to no timeout
    //socketTimeout: 120000,

    // The maximum length, in characters, of any message sent to the debug sidebar tab
    debugMaxLength: 1000,

    // The file containing the flows. If not set, it defaults to flows_<hostname>.json
    //flowFile: 'flows.json',

    // To enabled pretty-printing of the flow within the flow file, set the following
    //  property to true:
    //flowFilePretty: true,
    
    // By default, all user data is stored in the Node-RED install directory. To
    // use a different location, the following property can be used
    //userDir: '/home/nol/.node-red/',

    // Node-RED scans the `nodes` directory in the install directory to find nodes.
    // The following property can be used to specify an additional directory to scan.
    //nodesDir: '/home/nol/.node-red/nodes',

    // By default, the Node-RED UI is available at http://localhost:1880/
    // The following property can be used to specifiy a different root path.
    // If set to false, this is disabled.
    //httpAdminRoot: '/admin',

    // You can protect the user interface with a userid and password by using the following property.
    // The password must be an md5 hash  eg.. 5f4dcc3b5aa765d61d8327deb882cf99 ('password')
    //httpAdminAuth: {user:"user",pass:"5f4dcc3b5aa765d61d8327deb882cf99"},

    // Some nodes, such as HTTP In, can be used to listen for incoming http requests.
    // By default, these are served relative to '/'. The following property
    // can be used to specifiy a different root path. If set to false, this is
    // disabled.
    //httpNodeRoot: '/nodes',
    
    // To password protect the node-defined HTTP endpoints, the following property
    // can be used.
    // The password must be an md5 hash  eg.. 5f4dcc3b5aa765d61d8327deb882cf99 ('password')
    //httpNodeAuth: {user:"user",pass:"5f4dcc3b5aa765d61d8327deb882cf99"},
    
    // When httpAdminRoot is used to move the UI to a different root path, the
    // following property can be used to identify a directory of static content
    // that should be served at http://localhost:1880/.
    //httpStatic: '/home/nol/node-red-dashboard/',

    // To password protect the static content, the following property can be used.
    // The password must be an md5 hash  eg.. 5f4dcc3b5aa765d61d8327deb882cf99 ('password')
    //httpStaticAuth: {user:"user",pass:"5f4dcc3b5aa765d61d8327deb882cf99"},
    
    // The following property can be used in place of 'httpAdminRoot' and 'httpNodeRoot',
    // to apply the same root to both parts.
    //httpRoot: '/red',
    
    // The following property can be used in place of 'httpAdminAuth' and 'httpNodeAuth',
    // to apply the same authentication to both parts.
    //httpAuth: {user:"user",pass:"5f4dcc3b5aa765d61d8327deb882cf99"},
    
    // The following property can be used to disable the editor. The admin API
    // is not affected by this option. To disable both the editor and the admin
    // API, use either the httpRoot or httpAdminRoot properties
    //disableEditor: false,
    
    // The following property can be used for "inject" node, if "interval between times" or "at a specific time" in repeat mode is selected and "holidays" are used.
    // List here in array the holiday dates that are relevant for you with specified in the "holidaysFormat" date format.
    // You can provide the name for the holiday, but it will not be shown anywhere.
    // Dates can have the year or you can set the year to "0000" if the date is the same every year.
    // Day can be from 1 to 31.
    // Month can be from 1 to 12.
    // Year can be 00-99 or 2000-3099. "0000" means this date is valid in every year. "00" year will be interpreted as 2000.
    holidays: [
        {"New year":      "01.01.0000"},   // With name and every year
        {"Halloween":     "31.10.0000"},
        //                  "05.06.2014",  // Just date without name
        //{"Easter Monday": "06.04.2014"}, // With name and specific year
        {"Christmas Eve": "24.12.0000"},
        {"Christmas Day": "25.12.0000"}
    ],
    // Format of the holiday dates: you can use
    // D or d to define day of month position
    // M ot m to define month position (from 1 to 12
    // Y or y to define year position
    holidaysFormat: "d.m.y",        // Holidays format, default is d.m.y like 24.12.2015
	
    // The following property can be used to enable HTTPS
    // See http://nodejs.org/api/https.html#https_https_createserver_options_requestlistener
    // for details on its contents.
    // See the comment at the top of this file on how to load the `fs` module used by
    // this setting.
    // 
    //https: {
    //    key: fs.readFileSync('privatekey.pem'),
    //    cert: fs.readFileSync('certificate.pem')
    //},

    // The following property can be used to configure cross-origin resource sharing
    // in the HTTP nodes.
    // See https://github.com/troygoode/node-cors#configuration-options for
    // details on its contents. The following is a basic permissive set of options:
    //httpNodeCors: {
    //    origin: "*",
    //    methods: "GET,PUT,POST,DELETE"
    //},
    holidays: [
        {"New year":      "01.01.0000"}, // With name and every year
        "05.06.2014",  // Just date without name
        {"Easter Monday": "06.04.2014"}, // With name and specific year
        {"Christmas":     "24.12.0000"}  // With name and every year
    ],
    // Format of the holiday dates: you can use
    // D or d to define day of month position
    // M ot m to define month position (from 1 to 12
    // Y or y to define year position
    holidaysFormat: "D.M.Y",        // Holidays format, default is d.m.y

    // Anything in this hash is globally available to all functions.
    // It is accessed as context.global.
    // eg:
    //    functionGlobalContext: { os:require('os') }
    // can be accessed in a function block as:
    //    context.global.os

    functionGlobalContext: {
        // os:require('os'),
        // bonescript:require('bonescript'),
        // arduino:require('duino')
    }

}
