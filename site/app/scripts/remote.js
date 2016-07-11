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

remote.cleanScreen = function() {
	$.modal.close();
	$("#lobby-modal").remove();
	$("#message-modal").remove();
	$('#show').empty();
};

remote.showLobby = function(players) {
    remote.cleanScreen();
    tools.fetchTemplate("lobby-modal", {players : players}, function(lobbyModal){
        $('#show').append(lobbyModal);
        remote.lobbyModal = UIkit.modal("#lobby-modal", {center:true, bgclose:false, keyboard: false});
        $('#qrcode').qrcode({
            render: 'canvas',
            size: 240,
            text: document.location.href
        });
        $('#qrcode').find('canvas').addClass("uk-container-center uk-width-1-1");
		
		$('button.start-game').click(function(){
			remote.socket.emit('launch game');
		});
		
        remote.lobbyModal.show();
    });
};

remote.showScores = function(scores) {
	tools.fetchTemplate('players-list', {players : scores}, function(playersList){
		remote.cleanScreen();
		$('#show').html(playersList);
		if (scores[remote.handle].lastAnswer == 'correct') {
			tools.flash('#show', 'correct');
		} else if (scores[remote.handle].lastAnswer == 'wrong') {
			tools.flash('#show', 'wrong');
		}
	});
};

remote.message = function(message) {
	remote.cleanScreen();
	if ('blocking' === message.type) {
		tools.message(message.message, function() {}, false);
	}
};

remote.question = function(question) {
	tools.fetchTemplate('quizz-answers', question, function(questionPanel){
		remote.cleanScreen();
		$('#show').html(questionPanel);

		var answers = $('.quizz .answers');
		answers.find('.answer').click(function () {
			answers.find('.answer').off('click');
			$(this).addClass("active");
			var answer = $(this).attr('name');
			remote.socket.emit('answer', {
				number: question.number,
				handle: remote.handle,
				answer: answer
			});
		});
	});
};

remote.initRemote = function () {
    UIkit.modal.prompt("Name:", remote.randomName(), function(handle){
		remote.handle = handle;
        var session = $(location).attr('hash').substring(1);
        remote.socket = tools.newSocket();
		
        remote.socket.on('show scores', remote.showScores);
		remote.socket.on('message', remote.message);
        remote.socket.on('show lobby', remote.showLobby);
        remote.socket.on('server left', function() {
            window.close();
        });
        remote.socket.on('question', remote.question);
		
		remote.socket.emit('player joined', {
            session: session,
            player: {
                handle: remote.handle
            }
        });
    });
};

$(document).ready(function(){
    remote.initRemote();
});

