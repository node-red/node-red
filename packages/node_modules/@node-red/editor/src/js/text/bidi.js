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
RED.text = {};
RED.text.bidi = (function() {
    var textDir = "";
    var LRE = "\u202A",
        RLE = "\u202B",
        PDF = "\u202C";

    function isRTLValue(stringValue) {
        var length = stringValue.length;
        for (var i=0;i<length;i++) {
            if (isBidiChar(stringValue.charCodeAt(i))) {
                return true;
            }
            else if(isLatinChar(stringValue.charCodeAt(i))) {
                return false;
            }
         }
         return false;
    }

    function isBidiChar(c)  {
        return (c >= 0x05d0 && c <= 0x05ff)||
               (c >= 0x0600 && c <= 0x065f)||
               (c >= 0x066a && c <= 0x06ef)||
               (c >= 0x06fa && c <= 0x07ff)||
               (c >= 0xfb1d && c <= 0xfdff)||
               (c >= 0xfe70 && c <= 0xfefc);
    }

    function isLatinChar(c){
        return (c > 64 && c < 91)||(c > 96 && c < 123)
    }

    /**
     * Determines the text direction of a given string.
     * @param value - the string
     */
    function resolveBaseTextDir(value) {
        if (textDir == "auto") {
            if (isRTLValue(value)) {
                return "rtl";
            } else {
                return "ltr";
            }
        }
        else {
            return textDir;
        }
    }

    function onInputChange() {
        $(this).attr("dir", resolveBaseTextDir($(this).val()));
    }

    /**
     * Adds event listeners to the Input to ensure its text-direction attribute
     * is properly set based on its content.
     * @param input - the input field
     */
    function prepareInput(input) {
        input.on("keyup",onInputChange).on("paste",onInputChange).on("cut",onInputChange);
        // Set the initial text direction
        onInputChange.call(input);
    }

    /**
     * Enforces the text direction of a given string by adding
     * UCC (Unicode Control Characters)
     * @param value - the string
     */
    function enforceTextDirectionWithUCC(value) {
        if (value) {
            var dir = resolveBaseTextDir(value);
            if (dir == "ltr") {
               return LRE + value + PDF;
            }
            else if (dir == "rtl") {
               return RLE + value + PDF;
            }
        }
        return value;
    }

    /**
     * Enforces the text direction for all the spans with style bidiAware under
     * workspace or sidebar div
     */
    function enforceTextDirectionOnPage() {
        $("#workspace").find('span.bidiAware').each(function() {
            $(this).attr("dir", resolveBaseTextDir($(this).html()));
        });
        $("#sidebar").find('span.bidiAware').each(function() {
            $(this).attr("dir", resolveBaseTextDir($(this).text()));
        });
    }

    /**
     * Sets the text direction preference
     * @param dir - the text direction preference
     */
    function setTextDirection(dir) {
        textDir = dir;
        RED.nodes.eachNode(function(n) { n.dirty = true;});
        RED.view.redraw();
        RED.palette.refresh();
        enforceTextDirectionOnPage();
    }

    return {
        setTextDirection: setTextDirection,
        enforceTextDirectionWithUCC: enforceTextDirectionWithUCC,
        resolveBaseTextDir: resolveBaseTextDir,
        prepareInput: prepareInput
    }
})();
