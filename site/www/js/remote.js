var remote = {
    socket: undefined
};

remote.initRemote = function () {
    tools.fetchTemplate('remote-join', {}, function(joinScreen){
        $('#show').html(joinScreen);
        $('.join-game').click(function(evt){
            var session = $(location).attr('hash').substring(1);
            var handle = $('form.join input[name=handle]').val();
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
                    handle: handle
                }
            });
            remote.socket.on('new question', function(question) {
                tools.fetchTemplate('quizz-item', question, function(questionPanel){
                    $('#show').empty();
                    $('#show').html(questionPanel);

                    var answers = $('.quizz .answers');
                    answers.find('button.answer').click(function () {
                        answers.find('button.answer').prop('disabled', 'true');
                        var answer = $(this).attr('name');
                        remote.socket.emit('new answer', {
                            number: question.number,
                            handle: handle,
                            answer: answer
                        });
                    });
                });
            });
        });
    });
};

$(document).ready(function(){
    remote.initRemote();
});

