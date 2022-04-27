
RED.diagnostics = (function () {

    function init() {
        if (RED.settings.get('diagnostics.ui', true) === false) {
            return;
        }
        RED.actions.add("core:show-system-info", function () { show(); });
    }

    function show() {
        $.ajax({
            headers: {
                "Accept": "application/json"
            },
            cache: false,
            url: 'diagnostics',
            success: function (data) {
                var json = JSON.stringify(data || {}, "", 4);
                if (json === "{}") {
                    json = "{\n\n}";
                }
                RED.editor.editJSON({
                    title: RED._('diagnostics.title'),
                    value: json,
                    requireValid: true,
                    readOnly: true,
                    toolbarButtons: [
                        {
                            text: RED._('clipboard.export.copy'),
                            icon: 'fa fa-copy',
                            click: function () {
                                RED.clipboard.copyText(json, $(this), RED._('clipboard.copyMessageValue'))
                            }
                        },
                        {
                            text: RED._('clipboard.download'),
                            icon: 'fa fa-download',
                            click: function () {
                                var element = document.createElement('a');
                                element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(json));
                                element.setAttribute('download', "system-info.json");
                                element.style.display = 'none';
                                document.body.appendChild(element);
                                element.click();
                                document.body.removeChild(element);
                            }
                        },
                    ]
                });
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log("Unexpected error loading system info:", jqXHR.status, textStatus, errorThrown);
            }
        });
    }

    return {
        init: init,
    };
})();
