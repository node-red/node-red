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

 RED.events = (function() {
     var handlers = {};

     function on(evt,func) {
         handlers[evt] = handlers[evt]||[];
         handlers[evt].push(func);
     }
     function off(evt,func) {
         var handler = handlers[evt];
         if (handler) {
             for (var i=0;i<handler.length;i++) {
                 if (handler[i] === func) {
                     handler.splice(i,1);
                     return;
                 }
             }
         }
     }
     function emit(evt,arg) {
         if (handlers[evt]) {
             for (var i=0;i<handlers[evt].length;i++) {
                 try {
                     handlers[evt][i](arg);
                 } catch(err) {
                     console.log("RED.events.emit error: ["+evt+"] "+(err.toString()));
                     console.log(err);
                 }
             }

         }
     }
     return {
         on: on,
         off: off,
         emit: emit
     }
 })();
