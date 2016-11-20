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
RED.bidiUtil = (function() {
    var textDir = "";
    var shaperType = "";
    var calendarType = "";
    
    /**
     * Indicates the type of bidi-support (Base-text-dir ,Numeric-shaping ,Calendar ,STT)
     */
    var _bidiFlags = {
        BTD: 1,
        NS: 2,
        CALENDAR: 4,
        STT_ATTACH: 8,
        STT_GETHTML: 16
    };
    
   /**
    * Reverse direction in case of mirroring is enabled
    */
    var _ui = {
    	leftProperty: "",
    	rightProperty: ""
    };
    
    /**
     * Check if browser language is RTL language
     */
    function _isMirroringEnabled() {
        var isRTLLang = new RegExp("^(ar|he)").test(navigator.language);
        if (isRTLLang) {
            _ui.leftProperty = "right";
            _ui.rightProperty = "left";
            return true;
        } else {
            _ui.leftProperty = "left";
            _ui.rightProperty = "right";
            return false;
        }
    }
   
    /**
     * @param val - the numeric shaping type: None , National or contextual
     */
    function _setNumericShapingType(val) {
        shaperType = val;
        _refreshView();
    }
    
    /**
     * Sets the national calendar preference
     * @param val - the calendar type hijri, hebrew or gregorian
     */
    function _setCalendarType(val) {
        calendarType = val;
    }
      
    /**
     * Formats the date according to the current selected calendar 
     * @param date - the date object to be formatted
     */
    function _getGlobalizedDate(date) {
        var options = {};
        var lang = navigator.language;
        if (calendarType === "hijri") {
            options = lang + "-u-ca-islamic";
        } else if (calendarType === "hebrew") {
            options = lang + "-u-ca-hebrew";
        }
        return date.toLocaleString(options);
    }  
    
    /**
     * Sets the text direction preference
     * @param dir - the text direction preference
     */
    function _setTextDirection(dir) {
        textDir = dir;
        _refreshView();
        _enforceTextDirectionOnPage();
    }
    
    /**
     * Enforces the text direction for all the spans with style bidiAware under
     * workspace or sidebar div
     */
    function _enforceTextDirectionOnPage() {
        $("#workspace").find('span.bidiAware').each(function() {
            $(this).attr("dir", _resolveBaseTextDir($(this).html()));
        });
        $("#sidebar").find('span.bidiAware').each(function() {
            $(this).attr("dir", _resolveBaseTextDir($(this).text()));
        });
    }
    
    /**
     * Determines the text direction of a given string.
     * @param value - the string
     */
    function _resolveBaseTextDir(value) {
        if (textDir == "auto") {
            if (RED.bidiFeatures.baseTextDir.isRTLValue(value)) {
                return "rtl";
            } else {
                return "ltr";
            }
        } else {
            return textDir;
        }
    }
    
    /**
     * Adds event listeners to the Input to ensure its text-direction attribute
     * is properly set based on its content.
     * @param input - the input field
     */
    function _prepareInput(input) {
        input.on("keyup",_onInputChange).on("paste",_onInputChange).on("cut",_onInputChange);
        // Set the initial text direction
        _onInputChange.call(input);
    }
    
    function _onInputChange() {
        $(this).attr("dir", _resolveBaseTextDir($(this).val()));
    }
    
    /**
     * Refreshes the view whenever changing the user preferences
     */
    function _refreshView() {
        RED.nodes.eachNode(function(n) { n.dirty = true;});
        RED.view.redraw();
        RED.palette.refresh();
    }
    
    /**
     * Applying bidi support for these features: base-text-dir ,Numeric-shaping or both, STT ,Calendar which is controlled by the flag value.
     * @param value- the string to apply the bidi-support on it.
     * @param flag - indicates the type of bidi-support (Base-text-dir ,Numeric-shaping or both, STT , Calendar)
     * @param type - could be one of filepath, url, email
     * @param args - pass additional arguments to the handler. generally null.
     */
    function _applyBidiSupport(value, flag, type, args) {
        switch (flag) {
        case 0:
            value = RED.bidiFeatures.baseTextDir.enforceTextDirectionWithUCC(value);
            return RED.bidiFeatures.numericShaping.shape(value, shaperType, textDir);
        case 1:
            return RED.bidiFeatures.baseTextDir.enforceTextDirectionWithUCC(value);
        case 2:
            return RED.bidiFeatures.numericShaping.shape(value, shaperType, textDir);
        case 4:
            return _getGlobalizedDate(value);
        case 8:
            return RED.bidiFeatures.format.attach(value, type, args, _isMirroringEnabled(), navigator.language);
        case 16:
            return RED.bidiFeatures.format.getHtml(value, type, args, _isMirroringEnabled(), navigator.language);
        default:
            return value;
        }
    }
    return {
        isMirroringEnabled: _isMirroringEnabled,
        setNumericShapingType : _setNumericShapingType,
        setCalendarType: _setCalendarType,
        setTextDirection : _setTextDirection,
        applyBidiSupport : _applyBidiSupport,
        resolveBaseTextDir : _resolveBaseTextDir,
        prepareInput: _prepareInput,
        BidiFlags: _bidiFlags,
        UI: _ui
    }
 })();
