var remote = {
    socket: undefined
};

remote.adjectives = ["Alpha", "Amber","Arctic","Ash","Atom","Autumn","Big","Dire","Black","Blaze","Blue","Bone","Boulder","Bright","Bronze","Cinder","Cloud","Common","Creep","Creepy","Crest","Crimson","Crystal","Dark","Dawn","Day","Desert","Dew","Doom","Dream","Dusk","Dust","Earth","Ebon","Ember","Evening","Feather","Feral","Fire","Flame","Fluff","Fluffy","Forest","Free","Frenzy","Frost","Fury","Gloom","Gold","Grand","Gray","Grim","High","Hill","Horny","Humble","Ice","Iron","Jade","Keen","Light","Lightning","Low","Luna","Lunar","Magic","Meadow","Mild","Milky","Mist","Molten","Moon","Morning","Mountain","Mud","Night","Noble","Ocean","Old","Pale","Pride","Proud","Rage","Rain","Rainbow","Random","Rapid","Rave","Razor","Red","Regal","River","Rock","Rough","Rune","Sea","Shade","Shadow","Short","Silent","Silver","Simple","Sky","Small","Snow","Soft","Solar","Spark","Spirit","Spring","Star","Steel","Stone","Storm","Stout","Strong","Summer","Sun","Swift","Tall","Terra","Thunder","True","Velvet","Whit","White","Wild","Wind","Winter","Wise","Wood","Yiffy","Young"];
remote.species = ["bat","bunny","butts","cat","claw","coat","coyote","crest","crown","dog","face","fang","fennec","fox","foxy","fur","heart","hoof","horse","hound","hunter","husky","jackal","kitten","kitty","leopard","liger","lion","mane","panther","paw","pelt","pony","rabbit","snout","stud","tail","tiger","unicorn","vixen","wolf"];

remote.randomName = function () {
    var adjectiveIndex = Math.floor(Math.random() * remote.adjectives.length);
    var speciesIndex = Math.floor(Math.random() * remote.species.length);
    return remote.adjectives[adjectiveIndex] + '' + remote.species[speciesIndex];
};

remote.initRemote = function () {
    UIkit.modal.prompt("Name:", remote.randomName(), function(handle){
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

