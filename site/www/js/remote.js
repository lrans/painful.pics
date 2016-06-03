var remote = {
    socket: undefined
};

remote.initRemote = function () {
    tools.fetchTemplate('remote-join', {}, function(joinScreen){
        $('#show').html(joinScreen);
        $('.join-game').click(function(evt){
            var session = $(location).attr('hash').substring(1);
            evt.preventDefault();
            /*var pathname = $(location).attr('pathname');
            var socketPath = pathname.substring(0, pathname.lastIndexOf('/')) + '/remote-socket';
            var socketUrl = $(location).attr('protocol') + '//' + $(location).attr('host');*/
            remote.socket = io();
            remote.socket.on('scores', function(scores) {
                tools.fetchTemplate('players-list', {players : scores}, function(playersList){
                    $('#show').empty();
                    $('#show').html(playersList);
                });
            });
            remote.socket.on('server left', function() {
                window.close();
            });
            remote.socket.emit('player joined', {
                session: session,
                player: {
                    handle: $('form.join input[name=handle]').val()
                }
            });
        });
    });
};

$(document).ready(function(){
    remote.initRemote();
});

