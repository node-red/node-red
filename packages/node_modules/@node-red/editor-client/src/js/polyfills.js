(function() {
    var isIE11 = !!window.MSInputMethodContext && !!document.documentMode;

    if (isIE11) {
        // IE11 DOMTokenList.toggle does not support the two-argument variety
        window.DOMTokenList.prototype.toggle = function(cl,bo) {
            if (arguments.length === 1) {
                bo = !this.contains(cl);
            }
            this[!!bo?"add":"remove"](cl);
        }

        // IE11 does not provide classList on SVGElements
        if (! ("classList" in SVGElement.prototype)) {
            Object.defineProperty(SVGElement.prototype, 'classList', Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'classList'));
        }

        // IE11 does not provide children on SVGElements
        if (! ("children" in SVGElement.prototype)) {
            Object.defineProperty(SVGElement.prototype, 'children', Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'children'));
        }

        Array.from = function() {
            if (arguments.length > 1) {
                throw new Error("Node-RED's IE11 Array.from polyfill doesn't support multiple arguments");
            }
            var arrayLike = arguments[0]
            var result = [];
            if (arrayLike.forEach) {
                arrayLike.forEach(function(i) {
                    result.push(i);
                })
            } else {
                for (var i=0;i<arrayLike.length;i++) {
                    result.push(arrayList[i]);
                }
            }
            return result;
        }

        if (new Set([0]).size === 0) {
            // IE does not support passing an iterable to Set constructor
            var _Set = Set;
            /*global Set:true */
            Set = function Set(iterable) {
                var set = new _Set();
                if (iterable) {
                    iterable.forEach(set.add, set);
                }
                return set;
            };
            Set.prototype = _Set.prototype;
            Set.prototype.constructor = Set;
        }
    }
})();
