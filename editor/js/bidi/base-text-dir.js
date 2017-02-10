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
RED.bidi.baseTextDir = (function() {
    var LRE = "\u202A",
        RLE = "\u202B",
        PDF = "\u202C";

    function _isRTLValue(stringValue) {
        var length = stringValue.length;
        for (var i = 0 ; i < length; i++) {
            if (_isBidiChar(stringValue.charCodeAt(i))) {
                return true;
            } else if (_isLatinChar(stringValue.charCodeAt(i))) {
                return false;
            }
         }
           return RED.bidi.isMirroringEnabled();
    }

    function _isBidiChar(c) {
        return (c >= 0x05d0 && c <= 0x05ff)||
               (c >= 0x0600 && c <= 0x065f)||
               (c >= 0x066a && c <= 0x06ef)||
               (c >= 0x06fa && c <= 0x07ff)||
               (c >= 0xfb1d && c <= 0xfdff)||
               (c >= 0xfe70 && c <= 0xfefc);
    }

    function _isLatinChar(c) {
        return (c > 64 && c < 91) || (c > 96 && c < 123);
    }
    
    /**
     * Determines the text direction of a given string.
     * @param value - the string
     * @param textDir - text direction
     */
    function _resolveBaseTextDir(value, textDir) {
        if (textDir == "auto") {
        	if (_isRTLValue(value)) {
                return "rtl";
            } else {
                return "ltr";
            }
        } else {
            return textDir;
        }
    }
    
    /**
     * Enforces the text direction for all the spans with style bidiAware under
     * workspace or sidebar div
     */
    function _enforceTextDirectionOnPage(textDir) {
        $("#workspace").find('span.bidiAware').each(function() {
            $(this).attr("dir", _resolveBaseTextDir($(this).html(),textDir));
        });
        $("#sidebar").find('span.bidiAware').each(function() {
            $(this).attr("dir", _resolveBaseTextDir($(this).text(),textDir));
        });
    }
    
    /**
     * Enforces the text direction of a given string by adding
     * UCC (Unicode Control Characters)
     * @param value - the string
     */
    function _enforceTextDirectionWithUCC(value, textDir) {
        if (value) {
            if (textDir == "ltr") {
               return LRE + value + PDF;
            } else if (textDir == "rtl") {
               return RLE + value + PDF;
            }
        }
        return value;
    }

    return {
    	resolveBaseTextDir: _resolveBaseTextDir,
    	enforceTextDirectionOnPage: _enforceTextDirectionOnPage,
        enforceTextDirectionWithUCC: _enforceTextDirectionWithUCC,
        isRTLValue : _isRTLValue
    }
})();
