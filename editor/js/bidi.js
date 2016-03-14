/**
 * Copyright 2016 IBM Corp.
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

RED.bidi = (function() {
    var textDir = "";
    var LRE = "\u202A",
        RLE = "\u202B",
        PDF = "\u202C";
        
    function isRTLValue(stringValue) {
        for (var ch in stringValue) {
            if (isBidiChar(stringValue.charCodeAt(ch))) {
                return true;
            }
            else if(isLatinChar(stringValue.charCodeAt(ch))) {
                return false;
            }                
         }
         return false;
    }

    function isBidiChar(c)  {
        if (c >= 0x05d0 && c <= 0x05ff) {
            return true;
        }
        else if (c >= 0x0600 && c <= 0x065f) {
            return true;
        }
        else if (c >= 0x066a && c <= 0x06ef) {
            return true;
        }
        else if (c >= 0x06fa && c <= 0x07ff) {
            return true;
        }
        else if (c >= 0xfb1d && c <= 0xfdff) {
            return true;
        }
        else if (c >= 0xfe70 && c <= 0xfefc) {
            return true;
        }
        else {
            return false;
        }
    }

    function isLatinChar(c){
        if((c > 64 && c < 91)||(c > 96 && c < 123)) {
             return true;
        }
        else {    
            return false;
        }            
    }
    
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

	function initInputEvents(input) {
        input.on("keyup",onInputChange).on("paste",onInputChange).on("cut",onInputChange);
    }
    
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
    
    function enforceTextDirectionOnPage() {                  
        $("#workspace").find('span.bidiAware').each(function() {                       			    
            $(this).attr("dir", resolveBaseTextDir($(this).html()));
	    });
        $("#sidebar").find('span.bidiAware').each(function() {                       			    
            $(this).attr("dir", resolveBaseTextDir($(this).text()));
	    });
    }
    
    function setTextDirection(dir) {
        textDir = dir;
    }
    
    return {
        setTextDirection: setTextDirection,
        enforceTextDirectionOnPage: enforceTextDirectionOnPage,
        enforceTextDirectionWithUCC: enforceTextDirectionWithUCC,
        resolveBaseTextDir: resolveBaseTextDir,
        initInputEvents: initInputEvents
    }
})();
