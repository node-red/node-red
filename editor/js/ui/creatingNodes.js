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

RED.creatingNodes = (function () {
    var trayWidth = 700;
    var trayVisible = false;
    var targetItems;
 
    function handleContents() {
        var selection = RED.view.selection();
        if (selection.nodes && selection.nodes.length === 1) {
            if (selection.nodes[0].type === 'function') {
                $('#creating-nodes-type').val('function');
                $('#creating-nodes-type-swagger').hide();
            }
        }

        targetItems.empty();
        if ($('#creating-nodes-type').val() === 'function') {
            if (selection.nodes && selection.nodes.length === 1) {
                RED.nodes.filterNodes({ type: 'function' }).forEach(function (node) {
                    if (selection.nodes[0].id === node.id) {
                        if (node.name !== null && node.name !== '') {
                            $('<option value="' + node.id + '">' + node.name + '</option>').appendTo(targetItems);
                        } else {
                            $('<option value="' + node.id + '">' + node.id + '</option>').appendTo(targetItems);
                        }
                    }
                });
                $('#creating-nodes-target-items').val(selection.nodes[0].id);
            } else {
                RED.nodes.filterNodes({ type: 'function' }).forEach(function (node) {
                    if (node.name !== null && node.name !== '') {
                        $('<option value="' + node.id + '">' + node.name + '</option>').appendTo(targetItems);
                    } else {
                        $('<option value="' + node.id + '">' + node.id + '</option>').appendTo(targetItems);
                    }
                });
            }
            $('#creating-nodes-target').show();
        } else if ($('#creating-nodes-type').val() === 'swagger') {
            $('#creating-nodes-target').hide();
        }
    }

    function handleTarget() {
        var value = '\n';
        if ($('#creating-nodes-type').val() === 'swagger') {
            var sample_swagger = {
                'swagger': '2.0',
                'info': {
                    'description': 'This is a sample.',
                    'version': '1.0.0',
                    'title': 'Swagger Petstore',
                    'license': {
                        'name': 'Apache 2.0'
                    }
                },
                'host': 'petstore.swagger.io',
                'basePath': '/v2',
                'schemes': [
                    'http'
                ],
                'paths': {
                    '/store/inventory': {
                        'get': {
                            'summary': 'Returns pet inventories by status',
                            'description': 'Returns a map of status codes to quantities',
                            'operationId': 'getInventory',
                            'produces': [
                                'application/json'
                            ]
                        }
                    }
                }
            };
            value = JSON.stringify(sample_swagger, null, 4);
        } else if ($('#creating-nodes-type').val() === 'function') {
            RED.nodes.filterNodes({ type: 'function' }).forEach(function (node) {
                if ($('#creating-nodes-target-items').val() === node.id) {
                        value = node.func;
                }
            });
        } else {
            console.log('Unsupported type: ' + $('#creating-nodes-type').val());
        }
        this.editor = RED.editor.createEditor({
            id: 'creating-nodes-source-editor',
            mode: 'ace/mode/javascript',
            value: value
        });
    }

    function validateBuild() {
        $('#node-dialog-build').button('disable');
        $('#node-dialog-build').css('background', '#fff');
        $('#node-dialog-build').css('border-color', '#ccc');
        if ($('#creating-nodes-name').val().match(/^[a-z0-9][a-z0-9\-]*$/) && !$('#creating-nodes-name').val().match(/\-$/) && !$('#creating-nodes-name').val().match(/\-\-/) && $('#creating-nodes-version').val().match(/^[0-9]+\.[0-9]+\.[0-9]+$/) && this.editor.getSession().getValue()) {
            $('#node-dialog-build').button('enable');
            $('#node-dialog-build').css('background', '#AD1625');
            $('#node-dialog-build').css('border-color', '#AD1625');
        }
    }

    function content(trayContent) {
        var type = $('<div></div>').appendTo(trayContent);
        $('<label><i class="fa fa-tag"></i> <span data-i18n="creatingNodes.label.type"></span></label>').appendTo(type);
        $('<select name="type" id="creating-nodes-type"><option value="swagger" id="creating-nodes-type-swagger">swagger</option><option value="function" id="creating-nodes-type-function">function</option></select>').appendTo(type);

        var target = $('<div id="creating-nodes-target"></div>').appendTo(trayContent);
        $('<label><i class="fa fa-tag"></i> <span data-i18n="creatingNodes.label.target"></span></label>').appendTo(target);
        targetItems = $('<select name="type" id="creating-nodes-target-items"></select>').appendTo(target);

        var name = $('<div></div>').appendTo(trayContent);
        $('<label for="creating-nodes-name"><i class="fa fa-tag"></i> <span data-i18n="creatingNodes.label.name"></span></label>').appendTo(name);
        $('<input type="text" id="creating-nodes-name" data-i18n="[placeholder]creatingNodes.label.nameExample">').appendTo(name);

        var version = $('<div></div>').appendTo(trayContent);
        $('<label for="creating-nodes-version"><i class="fa fa-wrench"></i> <span data-i18n="creatingNodes.label.version"></span></label>').appendTo(version);
        $('<input type="text" id="creating-nodes-version" data-i18n="[placeholder]creatingNodes.label.versionExample">').appendTo(version);

        var source = $('<div id="creating-nodes-source"></div>').appendTo(trayContent);
        $('<label id="creating-nodes-source-label" for="creating-nodes-source"><i class="fa fa-wrench"></i> <span data-i18n="creatingNodes.label.source"></span></label>').appendTo(source);
        $('<input type="hidden" id="creating-nodes-source-input">').appendTo(source);
        $('<div style="height: 500px; min-height:300px;" class="node-text-editor" id="creating-nodes-source-editor"></div>').appendTo(source);

        handleContents();
        handleTarget();
        validateBuild();

        $('#creating-nodes-type').change(function () {
            handleContents();
            handleTarget();
            validateBuild();
        });

        $('#creating-nodes-target').change(function () {
            handleTarget();
            validateBuild();
        });

        $('#creating-nodes-version').keyup(function () {
            validateBuild();
        });

        $('#creating-nodes-name').keyup(function () {
            validateBuild();
        });

        $('#creating-nodes-source').keyup(function () {
            validateBuild();
        });
    }

    function notifyError(msg) {
        var notificationError = RED.notify(RED._('creatingNodes.label.error') + ': ' + msg, {
            modal: false,
            fixed: true,
            type: 'error',
            buttons: [
                {
                    text: RED._('common.label.close'),
                    click: function (e) {
                        notificationError.close();
                    }
                }
            ]
        });
    }

    function build() {
        var requestBody = {
            type: $('#creating-nodes-type').val(),
            data: {
                name: $('#creating-nodes-name').val(),
                version: $('#creating-nodes-version').val()
            }
        };

        if ($('#creating-nodes-type').val() === 'swagger') {
            try {
                requestBody.data.src = JSON.parse(this.editor.getSession().getValue());
            } catch (e) {
                notifyError('JSON parse() error, ' + e.toString());
            }
        } else if ($('#creating-nodes-type').val() === 'function') {
            requestBody.data.src = this.editor.getSession().getValue();
        } else {
            notifyError('unsupported type, \'' + $('#creating-nodes-type').val() + '\' is unsupported type');
        }

        if (requestBody.data.src) {
            $.ajax({
                url: 'nodes/create',
                type: 'POST',
                data: JSON.stringify(requestBody),
                contentType: 'application/json; charset=utf-8'
            }).done(function (data, textStatus, xhr) {
                var notificationSuccess = RED.notify(RED._('creatingNodes.label.success'), {
                    modal: false,
                    fixed: true,
                    type: 'success',
                    buttons: [
                        {
                            text: RED._('creatingNodes.label.download'),
                            class: 'primary',
                            click: function (e) {
                                window.open('nodes/download/' + data.id, '_blank');
                                notificationSuccess.close();
                            }
                        },
                        {
                            text: RED._('common.label.cancel'),
                            click: function (e) {
                                notificationSuccess.close();
                           }
                        }
                    ]
                });
            }).fail(function (xhr, textStatus, error) {
                notifyError(textStatus);
            });
        }
    }

    function show() {
        if (trayVisible) {
            return;
        }
        trayVisible = true;

        var trayContent;
        var trayOptions = {
            title: RED._('menu.label.creatingNodes'),
            buttons: [
                {
                    id: 'node-dialog-build',
                    text: RED._('creatingNodes.label.build'),
                    click: function () {
                        build();
                    }
                },
                {
                    id: 'node-dialog-close',
                    text: RED._('common.label.close'),
                    class: 'primary',
                    click: function () {
                        RED.tray.close();
                    }
                }
            ],
            resize: function (dimensions) {
                trayWidth = dimensions.width;
            },
            open: function (tray) {
                var trayBody = tray.find('.editor-tray-body');
                var trayContent = $('<div></div>', {id: 'creating-nodes-content'}).appendTo(trayBody);
                content(trayContent);
                trayContent.i18n();
                $('#sidebar-shade').show();
            },
            close: function () {
                trayVisible = false;
                $('#sidebar-shade').hide();
            },
            show: function () {}
        };
        if (trayWidth !== null) {
            trayOptions.width = trayWidth;
        }
        RED.tray.show(trayOptions);
    }

    function init() {
        RED.actions.add('core:show-creating-nodes', show);
        RED.menu.setDisabled('menu-item-export', false);
        RED.menu.setDisabled('menu-item-creating-nodes', false);
    }

    return {
        init: init,
        show: show
    };
})();

