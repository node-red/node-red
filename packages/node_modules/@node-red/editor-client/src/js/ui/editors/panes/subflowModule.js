(function() {
    var _subflowModulePaneTemplate = '<form class="dialog-form form-horizontal" autocomplete="off">'+
        '<div class="form-row">'+
            '<label for="subflow-input-module-module" data-i18n="[append]editor:subflow.module"><i class="fa fa-cube"></i> </label>'+
            '<input style="width: calc(100% - 110px)" type="text" id="subflow-input-module-module" data-i18n="[placeholder]common.label.name">'+
        '</div>'+
        '<div class="form-row">'+
            '<label for="subflow-input-module-type" data-i18n="[append]editor:subflow.type"> </label>'+
            '<input style="width: calc(100% - 110px)" type="text" id="subflow-input-module-type">'+
        '</div>'+
        '<div class="form-row">'+
            '<label for="subflow-input-module-version" data-i18n="[append]editor:subflow.version"></label>'+
            '<input style="width: calc(100% - 110px)" type="text" id="subflow-input-module-version" data-i18n="[placeholder]editor:subflow.versionPlaceholder">'+
        '</div>'+
        '<div class="form-row">'+
            '<label for="subflow-input-module-desc" data-i18n="[append]editor:subflow.desc"></label>'+
            '<input style="width: calc(100% - 110px)" type="text" id="subflow-input-module-desc">'+
        '</div>'+
        '<div class="form-row">'+
            '<label for="subflow-input-module-license" data-i18n="[append]editor:subflow.license"></label>'+
            '<input style="width: calc(100% - 110px)" type="text" id="subflow-input-module-license">'+
        '</div>'+
        '<div class="form-row">'+
            '<label for="subflow-input-module-author" data-i18n="[append]editor:subflow.author"></label>'+
            '<input style="width: calc(100% - 110px)" type="text" id="subflow-input-module-author" data-i18n="[placeholder]editor:subflow.authorPlaceholder">'+
        '</div>'+
        '<div class="form-row">'+
            '<label for="subflow-input-module-keywords" data-i18n="[append]editor:subflow.keys"></label>'+
            '<input style="width: calc(100% - 110px)" type="text" id="subflow-input-module-keywords" data-i18n="[placeholder]editor:subflow.keysPlaceholder">'+
        '</div>'+
    '</form>';

    RED.editor.registerEditPane("editor-tab-subflow-module", function(node) {
        return {
            label: RED._("editor-tab.module"),
            name: RED._("editor-tab.module"),
            iconClass: "fa fa-cube",
            create: function(container) {
                buildModuleForm(container, node);
            },
            resize: function(size) {
            },
            close: function() {

            },
            apply: function(editState) {
                var newMeta = exportSubflowModuleProperties(node);
                if (!isSameObj(node.meta,newMeta)) {
                    editState.changes.meta = node.meta;
                    node.meta = newMeta;
                    editState.changed = true;
                }
            }
        }
    });

    function isSameObj(env0, env1) {
        return (JSON.stringify(env0) === JSON.stringify(env1));
    }

    function setupInputValidation(input,validator) {
        var errorTip;
        var validateTimeout;

        var validateFunction = function() {
            if (validateTimeout) {
                return;
            }
            validateTimeout = setTimeout(function() {
                var error = validator(input.val());
                // if (!error && errorTip) {
                //     errorTip.close();
                //     errorTip = null;
                // } else if (error && !errorTip) {
                //     errorTip = RED.popover.create({
                //         tooltip: true,
                //         target:input,
                //         size: "small",
                //         direction: "bottom",
                //         content: error,
                //     }).open();
                // }
                input.toggleClass("input-error",!!error);
                validateTimeout = null;
            })
        }
        input.on("change keyup paste", validateFunction);
    }

    function buildModuleForm(container, node) {
        $(_subflowModulePaneTemplate).appendTo(container);
        var moduleProps = node.meta || {};
        [
            'module',
            'type',
            'version',
            'author',
            'desc',
            'keywords',
            'license'
        ].forEach(function(property) {
            $("#subflow-input-module-"+property).val(moduleProps[property]||"")
        })
        $("#subflow-input-module-type").attr("placeholder",node.id);

        setupInputValidation($("#subflow-input-module-module"), function(newValue) {
            newValue = newValue.trim();
            var isValid = newValue.length < 215;
            isValid = isValid && !/^[._]/.test(newValue);
            isValid = isValid && !/[A-Z]/.test(newValue);
            if (newValue !== encodeURIComponent(newValue)) {
                var m = /^@([^\/]+)\/([^\/]+)$/.exec(newValue);
                if (m) {
                    isValid = isValid && (m[1] === encodeURIComponent(m[1]) && m[2] === encodeURIComponent(m[2]))
                } else {
                    isValid = false;
                }
            }
            return isValid?"":"Invalid module name"
        })
        setupInputValidation($("#subflow-input-module-version"), function(newValue) {
            newValue = newValue.trim();
            var isValid = newValue === "" ||
                          /^(\d|[1-9]\d*)\.(\d|[1-9]\d*)\.(\d|[1-9]\d*)(-(0|[1-9A-Za-z-][0-9A-Za-z-]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)(\.(0|[1-9A-Za-z-][0-9A-Za-z-]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*))*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$/.test(newValue);
            return isValid?"":"Invalid version number"
        })

        var licenses = ["none", "Apache-2.0", "BSD-3-Clause", "BSD-2-Clause", "GPL-2.0", "GPL-3.0", "MIT", "MPL-2.0", "CDDL-1.0", "EPL-2.0"];
        var typedLicenses = {
            types: licenses.map(function(l) {
                return {
                    value: l,
                    label: l === "none" ? RED._("editor:subflow.licenseNone") : l,
                    hasValue: false
                };
            })
        }
        typedLicenses.types.push({
            value:"_custom_", label:RED._("editor:subflow.licenseOther"), icon:"red/images/typedInput/az.svg"
        })
        if (!moduleProps.license) {
            typedLicenses.default = "none";
        } else if (licenses.indexOf(moduleProps.license) > -1) {
            typedLicenses.default = moduleProps.license;
        } else {
            typedLicenses.default = "_custom_";
        }
        $("#subflow-input-module-license").typedInput(typedLicenses)
    }
    function exportSubflowModuleProperties(node) {
        var value;
        var moduleProps = {};
        [
            'module',
            'type',
            'version',
            'author',
            'desc',
            'keywords'
        ].forEach(function(property) {
            value = $("#subflow-input-module-"+property).val().trim();
            if (value) {
                moduleProps[property] = value;
            }
        })
        var selectedLicenseType = $("#subflow-input-module-license").typedInput("type");

        if (selectedLicenseType === '_custom_') {
            value = $("#subflow-input-module-license").val();
            if (value) {
                moduleProps.license = value;
            }
        } else if (selectedLicenseType !== "none") {
            moduleProps.license = selectedLicenseType;
        }
        return moduleProps;
    }

})();
