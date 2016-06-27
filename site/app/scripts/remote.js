var remote = {
    socket: undefined
};

remote.initRemote = function () {
    UIkit.modal.prompt("Name:", "FluffyFox", function(handle){
        var session = $(location).attr('hash').substring(1);
        /*var pathname = $(location).attr('pathname');
         var socketPath = pathname.substring(0, pathname.lastIndexOf('/')) + '/remote-socket';
         var socketUrl = $(location).attr('protocol') + '//' + $(location).attr('host');*/
        remote.socket = io();
        remote.socket.on('scores', function(scores) {
            tools.fetchTemplate('players-list', {players : scores}, function(playersList){
                $('#show').empty();
                $('#show').html(playersList);
                if (scores[handle].lastAnswer == 'correct') {
                    tools.flash('#show', 'correct');
                } else if (scores[handle].lastAnswer == 'wrong') {
                    tools.flash('#show', 'wrong');
                }
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
            tools.fetchTemplate('quizz-answers', question, function(questionPanel){
                $('#show').empty();
                $('#show').html(questionPanel);

                var answers = $('.quizz .answers');
                answers.find('.answer').click(function () {
                    answers.find('.answer').off('click');
                    $(this).addClass("active");
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
};

$(document).ready(function(){
    remote.initRemote();
});

