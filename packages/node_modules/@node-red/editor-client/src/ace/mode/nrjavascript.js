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
 define(function(require, exports, module) {
     "use strict";

     var oop = require("../lib/oop");
     var JavaScriptMode = require("./javascript").Mode;
     var WorkerClient = require("../worker/worker_client").WorkerClient;

     var Mode = function() {
         // Inherit everything from the standard JavaScript mode
         JavaScriptMode.call(this);
     };
     oop.inherits(Mode, JavaScriptMode);

     (function() {
         // Insert our custom worker
         this.createWorker = function(session) {
             var worker = new WorkerClient(["ace"], "ace/mode/nrjavascript_worker", "NRJavaScriptWorker");
             worker.attachToDocument(session.getDocument());

             worker.on("annotate", function(results) {
                 session.setAnnotations(results.data);
             });

             worker.on("terminate", function() {
                 session.clearAnnotations();
             });

             return worker;
         };

         this.$id = "ace/mode/nrjavascript";
     }).call(Mode.prototype);
     exports.Mode = Mode;
 });
