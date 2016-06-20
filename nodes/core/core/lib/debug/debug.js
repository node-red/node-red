$(function() {
    window.addEventListener('message',function(evt) {
        console.log(evt.data);
        $('<div>').text(evt.data).appendTo(document.body);
    },false)
});
