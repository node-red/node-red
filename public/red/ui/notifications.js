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
RED.notify = function() {
    var currentNotifications = [];
    var c = 0;
    return function(msg,type) {
        while (currentNotifications.length > 4) {
            var n = currentNotifications[0];
            window.clearTimeout(n.id);
            n.slideup();
        }
        var n = document.createElement("div");
        n.className = "alert";
        if (type) {
            n.className = "alert alert-"+type;
        }
        n.style.display = "none";
        n.innerHTML = msg;
        $("#notifications").append(n);
        $(n).slideDown(300);
        var slideup = function() {
            var nn = n;
            return function() {
                currentNotifications.shift();
                $(nn).slideUp(300, function() {
                        nn.parentNode.removeChild(nn);
                });
            };
        }();
        var id = window.setTimeout(slideup,3000);
        currentNotifications.push({id:id,slideup:slideup,c:c});
        c+=1;
    }
}();

