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


/**
 * Trigger enabled/disabled events when element.prop("disabled",false/true) is
 * called.
 * Used by RED.popover to hide a popover when the trigger element is disabled
 * as a disabled element doesn't emit mouseleave
 */
jQuery.propHooks.disabled = {
    set: function (element, value) {
        if (element.disabled !== value) {
            element.disabled = value;
            if (value) {
                $(element).trigger('disabled');
            } else {
                $(element).trigger('enabled');
            }
        }
    }
};
