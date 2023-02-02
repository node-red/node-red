RED.editor.colorPicker = RED.colorPicker = (function() {

    function create(options) {
        var color = options.value;
        var id = options.id;
        var colorPalette = options.palette || [];
        var width = options.cellWidth || 30;
        var height = options.cellHeight || 30;
        var margin = options.cellMargin || 2;
        var perRow = options.cellPerRow || 6;

        var container = $("<div>",{style:"display:inline-block"});
        var colorHiddenInput = $("<input/>", { id: id, type: "hidden", value: color }).appendTo(container);
        var opacityHiddenInput = $("<input/>", { id: id+"-opacity", type: "hidden", value: options.hasOwnProperty('opacity')?options.opacity:"1" }).appendTo(container);

        var colorButton = $('<button type="button" class="red-ui-button red-ui-editor-node-appearance-button">').appendTo(container);
        $('<i class="fa fa-caret-down"></i>').appendTo(colorButton);

        var colorDispContainer = $('<div>',{class:"red-ui-search-result-node"}).appendTo(colorButton);
        $('<div>',{class:"red-ui-color-picker-cell-none"}).appendTo(colorDispContainer);
        var colorDisp = $('<div>',{class:"red-ui-color-picker-swatch"}).appendTo(colorDispContainer);


        var refreshDisplay = function(color) {
            if (color === "none") {
                colorDisp.addClass('red-ui-color-picker-cell-none').css({
                    "background-color": "",
                    opacity: 1
                });
                colorDispContainer.css({
                    "border-color":""
                })
            } else {
                var opacity = parseFloat(opacityHiddenInput.val())
                colorDisp.removeClass('red-ui-color-picker-cell-none').css({
                    "background-color": color,
                    "opacity": opacity
                });
                var border = RED.utils.getDarkerColor(color);
                if (border[0] === '#') {
                    border += Math.round(255*Math.floor(opacity*100)/100).toString(16);
                } else {
                    border = "";
                }

                colorDispContainer.css({
                    "border-color": border
                })
            }
            if (options.hasOwnProperty('opacity')) {
                $(".red-ui-color-picker-opacity-slider-overlay").css({
                    "background-image": "linear-gradient(90deg, transparent 0%, "+color+" 100%)"
                })
            }


        }

        colorButton.on("click", function (e) {
            var numColors = colorPalette.length;

            var picker = $("<div/>", {
                class: "red-ui-color-picker"
            }).css({
                width: ((width+margin+margin)*perRow)+"px",
                height: Math.ceil(numColors/perRow)*(height+margin+margin)+"+px"
            });
            var count = 0;
            var row = null;
            row = $("<div/>").appendTo(picker);

            var colorInput = $('<input>',{
                type:"text",
                value:colorHiddenInput.val()
            }).appendTo(row);
            var focusTarget = colorInput;
            colorInput.on("change", function (e) {
                var color = colorInput.val();
                if (options.defaultValue && !color.match(/^([a-z]+|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})$/)) {
                    color = options.defaultValue;
                }
                colorHiddenInput.val(color).trigger('change');
                refreshDisplay(color);
            });
            // if (options.hasOwnProperty('opacity')) {
            //     var sliderContainer = $("<div>",{class:"red-ui-color-picker-opacity-slider"
            // }

            if (options.none) {
                row = $("<div/>").appendTo(picker);
                var button = $("<button/>", {
                    class:"red-ui-color-picker-cell red-ui-color-picker-cell-none"
                }).css({
                    width: width+"px",
                    height: height+"px",
                    margin: margin+"px"
                }).appendTo(row);
                button.on("click",  function (e) {
                    e.preventDefault();
                    colorInput.val("none");
                    colorInput.trigger("change");
                });
            }


            colorPalette.forEach(function (col) {
                if ((count % perRow) == 0) {
                    row = $("<div/>").appendTo(picker);
                }
                var button = $("<button/>", {
                    class:"red-ui-color-picker-cell"
                }).css({
                    width: width+"px",
                    height: height+"px",
                    margin: margin+"px",
                    backgroundColor: col,
                    "border-color": RED.utils.getDarkerColor(col)
                }).appendTo(row);
                button.on("click",  function (e) {
                    e.preventDefault();
                    // colorPanel.hide();
                    colorInput.val(col);
                    colorInput.trigger("change");
                });
                count++;
            });
            if (options.none || options.hasOwnProperty('opacity')) {
                row = $("<div/>").appendTo(picker);
                // if (options.none) {
                //     var button = $("<button/>", {
                //         class:"red-ui-color-picker-cell red-ui-color-picker-cell-none"
                //     }).css({
                //         width: width+"px",
                //         height: height+"px",
                //         margin: margin+"px"
                //     }).appendTo(row);
                //     button.on("click",  function (e) {
                //         e.preventDefault();
                //         colorPanel.hide();
                //         selector.val("none");
                //         selector.trigger("change");
                //     });
                // }
                if (options.hasOwnProperty('opacity')) {
                    var sliderContainer = $("<div>",{class:"red-ui-color-picker-opacity-slider"}).appendTo(row);
                    sliderContainer.on("mousedown", function(evt) {
                        if (evt.target === sliderHandle[0]) {
                            return;
                        }
                        var v = evt.offsetX/sliderContainer.width();
                        sliderHandle.css({
                            left: ( v*(sliderContainer.width() - sliderHandle.outerWidth()))+"px"
                        });
                        v = Math.floor(100*v)
                        opacityHiddenInput.val(v/100)
                        opacityLabel.text(v+"%");
                        refreshDisplay(colorHiddenInput.val());
                    })
                     $("<div>",{class:"red-ui-color-picker-opacity-slider-overlay"}).appendTo(sliderContainer);
                    var sliderHandle = $("<div>",{class:"red-ui-color-picker-opacity-slider-handle red-ui-button red-ui-button-small"}).appendTo(sliderContainer).draggable({
                        containment: "parent",
                        axis: "x",
                        drag: function( event, ui ) {
                            var v = Math.max(0,ui.position.left/($(this).parent().width()-$(this).outerWidth()));
                            // Odd bug that if it is loaded with a non-0 value, the first time
                            // it is dragged it ranges -1 to 99. But every other time, its 0 to 100.
                            // The Math.max above makes the -1 disappear. The follow hack ensures
                            // it always maxes out at a 100, at the cost of not allowing 99% exactly.
                            v = Math.floor(100*v)
                            if ( v === 99 ) {
                                v = 100;
                            }
                            // console.log("uip",ui.position.left);
                            opacityHiddenInput.val(v/100)
                            opacityLabel.text(v+"%");
                            refreshDisplay(colorHiddenInput.val());
                        }
                    });
                    var opacityLabel = $('<small></small>').appendTo(row);
                    setTimeout(function() {
                        sliderHandle.css({
                            left: (parseFloat(opacityHiddenInput.val())*(sliderContainer.width() - sliderHandle.outerWidth()))+"px"
                        })
                        opacityLabel.text(Math.floor(opacityHiddenInput.val()*100)+"%");
                    },50);
                }
            }

            var colorPanel = RED.popover.panel(picker);
            setTimeout(function() {
                refreshDisplay(colorHiddenInput.val())
            },50);
            colorPanel.show({
                target: colorButton,
                onclose: function() {
                    colorButton.focus();
                }
            })
            if (focusTarget) {
                focusTarget.focus();
            }
        });
        setTimeout(function() {
            refreshDisplay(colorHiddenInput.val())
        },50);
        return container;
    }

    return {
        create: create
    }
})();
