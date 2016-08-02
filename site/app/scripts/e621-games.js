/* global tools, UIkit, ds */

var e621games = {};

e621games.guessSpecies = {
    players: {}
};

e621games.guessSpecies.config = {
    NB_QUIZZ_ITEMS : 5 ,
    NB_ANSWERS_PER_ITEM: 5
};

e621games.guessSpecies.updateScore = function () {
    for(var player in e621games.guessSpecies.players) {
        e621games.guessSpecies.players[player].accuracy = Math.round((e621games.guessSpecies.players[player].correct / (e621games.guessSpecies.currentQuizzItemNumber + 1)) * 100);
        e621games.guessSpecies.players[player].correctPercent = Math.round((e621games.guessSpecies.players[player].correct / e621games.guessSpecies.quizzItems.length) * 100);
        e621games.guessSpecies.players[player].wrongPercent = Math.round((e621games.guessSpecies.players[player].wrong / e621games.guessSpecies.quizzItems.length) * 100);
    }
};

e621games.guessSpecies.correctAnswer = function (player, correctAnswer) {
    // tools.playSound('allright');
    e621games.guessSpecies.players[player].correct++;
    e621games.guessSpecies.players[player].lastAnswer = 'correct';
    e621games.guessSpecies.updateScore();
    $('.quizz .answer[name="'+correctAnswer+'"]').addClass("correct").append('<div class="uk-badge uk-badge-success uk-text-bold uk-text-large">'+player+'</div>');
    if (player === 'you') {
        tools.flash('#show', 'correct');
    }
};

e621games.guessSpecies.wrongAnswer = function (player, correctAnswer, wrongAnswer) {
    // tools.playSound('fail');
    e621games.guessSpecies.players[player].wrong++;
    e621games.guessSpecies.players[player].lastAnswer = 'wrong';
    e621games.guessSpecies.updateScore();
    $('.quizz .answer[name="'+correctAnswer+'"]').addClass("correct");
    if (wrongAnswer !== undefined) {
        $('.quizz .answer[name="' + wrongAnswer + '"]').addClass("wrong").append('<div class="uk-badge uk-badge-danger uk-text-bold uk-text-large">'+player+'</div>');
    }
    if (player === 'you') {
        tools.flash('#show', 'wrong');
    }
};

e621games.guessSpecies.startGame = function() {
    e621games.guessSpecies.score = {
        answered: 0,
        nbItems: e621games.guessSpecies.config.NB_QUIZZ_ITEMS
    };
    e621games.guessSpecies.updateScore(true);
    e621games.guessSpecies.showQuizzItem(0);
    e621games.bgMusic = tools.playSound('bgmusic');
    e621games.bgMusic.loop = -1;
    e621games.bgMusic.volume = 0.6;
};

e621games.guessSpecies.endOfGame = function () {
    e621games.bgMusic.stop(); // todo fadeout
    $('.quizz').remove();

    /*tools.fetchTemplate('players-list', {players : e621games.guessSpecies.players}, function(scoreBoard){
        $('#show').html(scoreBoard);
    });*/
	e621games.guessSpecies._gameInProgress = false;
	e621games.guessSpecies.start();
	
    /*
     var finalScore = (e621games.guessSpecies.score.correct / e621games.guessSpecies.quizzItems.length) * 100;
     tools.message("Accuracy : "+finalScore+"%", function(){}, true);
     if (finalScore >= 50) {
     tools.playSound('epic10pts');
     } else {
     tools.playSound('humiliation');
     }*/
};

e621games.guessSpecies.timer = function(init, callback, timeLeft) {
    if (timeLeft === undefined) {
        timeLeft = init;
    }
    var percentLeft = (timeLeft/init) * 100;
    $('div.timer').css("width", '' + percentLeft + '%');
    if (percentLeft <= 20) {
        $('div.timer').addClass('uk-progress-danger');
    }
    var TIMER_RESOLUTION = 100; // ms.
    if (timeLeft >= 0) {
        e621games.guessSpecies.timeout = setTimeout(function() {
            e621games.guessSpecies.timer(init, callback, timeLeft-TIMER_RESOLUTION);
        }, TIMER_RESOLUTION);
    } else {
        callback();
    }
};

e621games.guessSpecies.broadcastQuizzItem = function (number) {
    e621games.guessSpecies.answers = [];
    var quizzItem = e621games.guessSpecies.quizzItems[number];
    e621games.guessSpecies.socket.emit('question', {number: number, answers: quizzItem.answers});
};

e621games.guessSpecies.collectAnswers = function () {
    clearTimeout(e621games.guessSpecies.timeout);
    var answersByHandle = {};
    $.each(e621games.guessSpecies.answers, function(i, answer){
        answersByHandle[answer.handle] = answer;
    });

    var allCorrect = true;
    var allWrong = true;
    $.each(e621games.guessSpecies.players, function(handle, player) {
        var correctAnswer = e621games.guessSpecies.quizzItems[e621games.guessSpecies.currentQuizzItemNumber].specie;
        if (handle in answersByHandle) {
            if (answersByHandle[handle].answer === correctAnswer) {
                allWrong = false;
                e621games.guessSpecies.correctAnswer(handle, correctAnswer);
            } else {
                allCorrect = false;
                e621games.guessSpecies.wrongAnswer(handle, correctAnswer, answersByHandle[handle].answer);
            }
        } else {
            allCorrect = false;
            e621games.guessSpecies.wrongAnswer(handle, correctAnswer);
        }
    });

	e621games.guessSpecies.scoreChanged();

    if (allWrong) {
        tools.playSound('fail');
    } else if (allCorrect) {
        tools.playSound('allright');
    }

    e621games.guessSpecies.showNextQuizzItem(e621games.guessSpecies.currentQuizzItemNumber);
};

e621games.guessSpecies.newAnswerReceived = function (msg) {
    if (msg.number === e621games.guessSpecies.currentQuizzItemNumber) {
        e621games.guessSpecies.answers.push(msg);
        if (e621games.guessSpecies.answers.length === Object.keys(e621games.guessSpecies.players).length) {
            e621games.guessSpecies.collectAnswers();
        }
    }
};

e621games.guessSpecies.showQuizzItem = function (number) {
	e621games.guessSpecies.broadcastMessage({
		type: 'blocking',
		message: 'Get ready...'
	});
    tools.message("Get ready !", function(){
        var quizzItem = e621games.guessSpecies.quizzItems[number];
        e621games.guessSpecies.currentQuizzItemNumber = number;
        e621games.guessSpecies.answers = [];
        tools.ensurePreloaded(quizzItem.imageUrl, function(){
            tools.fetchTemplate('quizz-item', quizzItem, function(page){
                var question = $('.quizz .question');
                question.html(page);
                // TODO show scores only e621games.guessSpecies.updateScore();
                if (e621games.guessSpecies.config.MODE === 'single') {
                    question.find('.answer').click(function () {
                        question.find('.answer').off('click');
                        $(this).addClass("active");
                        var answer = $(this).attr('name');
                        e621games.guessSpecies.newAnswerReceived({
                            number: e621games.guessSpecies.currentQuizzItemNumber,
                            handle: 'you',
                            answer: answer
                        });
                    });
                } else if (e621games.guessSpecies.config.MODE === 'multi') {
                    e621games.guessSpecies.broadcastQuizzItem(number);
                }

                $.modal.close();
                if (e621games.guessSpecies.config.TIMER > 0) {
                    $('div.timer').removeClass('uk-progress-danger').css("width", '100%');
                    $('div.timer-container').css('visibility', 'visible');
                    e621games.guessSpecies.timer(e621games.guessSpecies.config.TIMER, function () {
                        if (e621games.guessSpecies.config.MODE === 'single') {
                            question.find('.answer').off('click');
                            e621games.guessSpecies.collectAnswers();
                        } else if (e621games.guessSpecies.config.MODE === 'multi') {
                            e621games.guessSpecies.collectAnswers();
                        }
                    });
                }
            });
        });
    });
};

e621games.guessSpecies.showNextQuizzItem = function(number) {
    setTimeout(function() {
        if (e621games.guessSpecies.quizzItems.length > (number+1)) {
            e621games.guessSpecies.showQuizzItem(number + 1);
        } else {
            e621games.guessSpecies.endOfGame();
        }
    }, 2000);
};

e621games.prettyLabel = function (rawSpecie) {
    return rawSpecie === undefined ? undefined : rawSpecie.replace(/_/g, " ").replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

e621games.guessSpecies.generateQuizzItems = function () {
    console.log('Data fetched, generating quizz items');
    $.each(e621games.guessSpecies.detailedPosts, function(x, detailedPost) {
        var postTagsAndCounts = [];
        $.each(e621games.guessSpecies.config.TARGET_TAGS_TYPES, function(i, item){
			if (detailedPost.tags[item] !== undefined) {
				$.each(detailedPost.tags[item], function(i, tag) {
					postTagsAndCounts.push(tag);
				});
			}
			
        });
        postTagsAndCounts.sort(function (a, b) {
            return a.count - b.count;
        });
        var postTags = $.map(postTagsAndCounts, function(tag){
            return tag.name;
        });
        var quizzItem = {
            id: detailedPost.id,
            imageUrl: detailedPost.imageUrl,
            ratio: detailedPost.ratio,
            specie: postTags[0],
            answers: [postTags[0]]
        };
        tools.shuffleArrayInPlace(postTags);
        for (var i = 1; i < e621games.guessSpecies.config.NB_ANSWERS_PER_ITEM; i++) {
            var nextAnswer = tools.pickRandom(e621games.guessSpecies.allPossibleAnswers, quizzItem.answers.concat(postTags));
            if (nextAnswer === undefined) {
                break;
            }
            quizzItem.answers.push(nextAnswer);
        }
        tools.shuffleArrayInPlace(quizzItem.answers);
        quizzItem.answers = $.map(quizzItem.answers, function(rawSpecie){
            return {
                name: rawSpecie,
                label: e621games.prettyLabel(rawSpecie)
            };
        });

        tools.preload(quizzItem.imageUrl);
        e621games.guessSpecies.quizzItems.push(quizzItem);
    });
    tools.shuffleArrayInPlace(e621games.guessSpecies.quizzItems);

    e621games.guessSpecies.startGame();
};

e621games.guessSpecies.addPost = function(detailedPost, lastPost) {
    if (e621games.guessSpecies.fetchDone) {
        return;
    }
    e621games.guessSpecies.missingPosts--;

    var skip = true; // skip by default ...
    $.each(e621games.guessSpecies.config.TARGET_TAGS_TYPES, function(i, targetTagType){
        if (("tags" in detailedPost) && targetTagType in detailedPost.tags) {
            skip = false; // ... except if we have some relevant tag
        }
    });

    if (!skip && detailedPost.imageUrl.endsWith("swf")) {
        skip = true; // skip posts that are flash animations
    }
    if (!skip) {
        console.log('fetched post : '+detailedPost.id);
        $.each(e621games.guessSpecies.config.TARGET_TAGS_TYPES, function(i, targetTagType) {
			if (detailedPost.tags[targetTagType] !== undefined) {
				$.each(detailedPost.tags[targetTagType], function (i, targetTag) {
					var tagName = targetTag.name;
					if ($.inArray(tagName, e621games.guessSpecies.allPossibleAnswers) === -1) {
						e621games.guessSpecies.allPossibleAnswers.push(tagName);
					}
				});
			}
        });

        e621games.guessSpecies.detailedPosts.push(detailedPost);
        tools.showProgress({
            value: e621games.guessSpecies.detailedPosts.length
        });
    } else {
        console.log('skipped post : '+detailedPost.id);
    }
    if (e621games.guessSpecies.missingPosts === 0 || lastPost) {
        if (e621games.guessSpecies.detailedPosts.length < e621games.guessSpecies.config.NB_QUIZZ_ITEMS && !lastPost) {
            e621games.guessSpecies.missingPosts = e621games.guessSpecies.config.NB_QUIZZ_ITEMS - e621games.guessSpecies.detailedPosts.length;
			e621games.guessSpecies.config.DATASOURCE.fetch(e621games.guessSpecies.config.NB_QUIZZ_ITEMS, e621games.guessSpecies.config.QUERY, e621games.guessSpecies.addPost);
        } else {
            e621games.guessSpecies.fetchDone = true;
			e621games.guessSpecies.config.DATASOURCE.stop();
            e621games.guessSpecies.generateQuizzItems();
        }
    }
};

e621games.guessSpecies.resetData = function () {
    e621games.guessSpecies.rawPosts  = [];
    e621games.extractingTags = false;
    e621games.guessSpecies.allPossibleAnswers = [];
    e621games.guessSpecies.detailedPosts = [];
    e621games.guessSpecies.quizzItems = [];
    e621games.guessSpecies.score = {
        answered: 0,
        nbItems: e621games.guessSpecies.config.NB_QUIZZ_ITEMS
    };
    e621games.guessSpecies.missingPosts = e621games.guessSpecies.config.NB_QUIZZ_ITEMS;
	
	$.each(e621games.guessSpecies.players, function(handle, player) {
		e621games.guessSpecies.players[handle].correct = 0;
		e621games.guessSpecies.players[handle].wrong = 0;
	});
};

e621games.guessSpecies.gameInProgress = function() {
	return e621games.guessSpecies._gameInProgress === true;
};

e621games.guessSpecies.playerListChanged = function () {
    tools.fetchTemplate('players-list', {
		showScores: true,
		players : e621games.guessSpecies.players
	}, function(playersList){
        $('.players').html(playersList);
    });
    if (e621games.guessSpecies.config.MODE !== 'single' && !e621games.guessSpecies.gameInProgress()) {
        e621games.guessSpecies.socket.emit('show lobby', e621games.guessSpecies.players);
		e621games.guessSpecies.updateStartGameButton();
    }
};

e621games.guessSpecies.scoreChanged = function () {
    tools.fetchTemplate('players-list', {
		showScores: true,
		players : e621games.guessSpecies.players
	}, function(playersList){
        $('.players').html(playersList);
    });
    if (e621games.guessSpecies.config.MODE !== 'single' && e621games.guessSpecies.gameInProgress()) {
        e621games.guessSpecies.socket.emit('show scores', e621games.guessSpecies.players);
    }
};

e621games.guessSpecies.broadcastMessage = function(message) {
	if (e621games.guessSpecies.config.MODE !== 'single') {
		e621games.guessSpecies.socket.emit('message', message);
	}
};

e621games.guessSpecies.addPlayer = function(handle) {
	e621games.guessSpecies.players[handle] = {
		handle: handle,
		correct: 0,
		wrong: 0
	};
	e621games.guessSpecies.playerListChanged();
};

e621games.guessSpecies.removePlayer = function(handle) {
	delete e621games.guessSpecies.players[handle];
	e621games.guessSpecies.playerListChanged();
};


e621games.guessSpecies.setMultiPlayerMode = function (active) {
    if (active) {
		e621games.guessSpecies.removePlayer('you');
        if (!e621games.guessSpecies.socket) {
            e621games.guessSpecies.config.session = Math.random().toString(36).substring(7);
            e621games.guessSpecies.socket = tools.newSocket();
            e621games.guessSpecies.socket.emit('server joined', {
                session: e621games.guessSpecies.config.session
            });

            e621games.guessSpecies.socket.on('player joined', function (msg) {
				e621games.guessSpecies.addPlayer(msg.player.handle);
            });

            e621games.guessSpecies.socket.on('player left', function (msg) {
				e621games.guessSpecies.removePlayer(msg.handle);
            });

            e621games.guessSpecies.socket.on('answer', function (msg) {
                e621games.guessSpecies.newAnswerReceived(msg);
            });
			
			e621games.guessSpecies.socket.on('launch game', function () {
                e621games.guessSpecies.launchNewGame();
            });
        } else {
			e621games.guessSpecies.playerListChanged();
		}
		
		var pathname = $(location).attr('pathname');
		var joinUrl = $(location).attr('protocol') + '//' + $(location).attr('host') + pathname.substring(0, pathname.lastIndexOf('/')) + '/remote.html#' + e621games.guessSpecies.config.session;
		console.log("Remote join url : " + joinUrl);
		
		$('#qrcode').empty().qrcode({
			render: 'canvas',
			width: 340,
			height: 340,
			text: joinUrl
		});

		$('#qrcode').click(function () {
			window.open(joinUrl, 'stuff' + Math.random(), 'left=20,top=20,width=300,height=500,toolbar=0,resizable=0');
			return false;
		});
    }
};

e621games.guessSpecies.launchNewGame = function() {
	var settingsModal = UIkit.modal(".quizz-modal");
	
	if (e621games.guessSpecies.gameInProgress()) {
		return;
	}

	e621games.guessSpecies._gameInProgress = true;
	tools.playSound('letsrock');

	if (e621games.guessSpecies.config.MODE === 'single') {
		e621games.guessSpecies.players.you = {
			handle: 'You',
			correct: 0,
			wrong: 0
		};
	}
	e621games.guessSpecies.config.NB_QUIZZ_ITEMS = parseInt($('.quizz-settings select[name=nbItems]').val());
	e621games.guessSpecies.config.NB_ANSWERS_PER_ITEM = parseInt($('.quizz-settings select[name=nbAnswers]').val());
	e621games.guessSpecies.config.TIMER = parseInt($('.quizz-settings select[name=timer]').val());
	e621games.guessSpecies.config.QUERY = e621games.guessSpecies.config.DATASOURCE.buildQuery('#datasource-settings-placeholder');

	var targetTagType = $('.quizz-settings select[name=tags]').val();
	if (targetTagType === 'all') {
		e621games.guessSpecies.config.TARGET_TAGS_TYPES = e621games.guessSpecies.config.DATASOURCE.metadata.providedTags;
	} else {
		e621games.guessSpecies.config.TARGET_TAGS_TYPES = [targetTagType];
	}
	settingsModal.hide();
	UIkit.offcanvas.hide();
	$('.quizz-modal').remove();
	$('.multiplayer-infos').remove();


	e621games.guessSpecies.resetData();
	e621games.guessSpecies.broadcastMessage({
		type: 'blocking',
		message: 'Get ready...'
	});
	tools.showProgress({
		message: "Fetching quizz data...",
		max: e621games.guessSpecies.config.NB_QUIZZ_ITEMS,
		value: 0
	});
	
	e621games.guessSpecies.fetchDone = false;
	e621games.guessSpecies.config.DATASOURCE.reset();
	e621games.guessSpecies.config.DATASOURCE.fetch(e621games.guessSpecies.config.NB_QUIZZ_ITEMS, e621games.guessSpecies.config.QUERY, e621games.guessSpecies.addPost);
};

e621games.guessSpecies.gameModeChanged = function() {
	var mode = $(".quizz-settings input[name=mode]").val();
	$('.quizz-modal').removeClass('single multi').addClass(mode);
	e621games.guessSpecies.setMultiPlayerMode(mode === 'multi');
	e621games.guessSpecies.config.MODE = mode;
	e621games.guessSpecies.updateStartGameButton();
	if ($(".quizz-modal").data('modal') !== undefined) {
		setTimeout(function() {
			$(".quizz-modal").data('modal').resize();
		}, 100);
	}
};

e621games.guessSpecies.updateStartGameButton = function() {
	var mode = e621games.guessSpecies.config.MODE;
	var nbPlayers = Object.keys(e621games.guessSpecies.players).length;
	$('button.start-game').prop('disabled', (mode === 'multi' && nbPlayers === 0));
};

e621games.guessSpecies.datasourceChanged = function(dsId){
    e621games.guessSpecies.config.DATASOURCE = ds[dsId];
	$('.quizz-settings select[name=tags] option').each(function(i, option){
		$(option).prop('disabled', $(option).attr('value') !== 'all' && $.inArray($(option).attr('value'), e621games.guessSpecies.config.DATASOURCE.metadata.providedTags) < 0);
	});
	if ($('.quizz-settings select[name=tags] option:selected').prop('disabled')) {
		$('.quizz-settings select[name=tags]').val(e621games.guessSpecies.config.DATASOURCE.metadata.providedTags[0]);
	}
	$('#datasource-settings-placeholder').empty();
	e621games.guessSpecies.config.DATASOURCE.showSettingsScreen('#datasource-settings-placeholder');
};

e621games.guessSpecies.defaultOptions = function() {
	if (e621games.guessSpecies.config === undefined || e621games.guessSpecies.config.MODE === undefined) {
		e621games.guessSpecies.config.MODE = 'single';
		e621games.guessSpecies.config.NB_QUIZZ_ITEMS = 10;
		e621games.guessSpecies.config.NB_ANSWERS_PER_ITEM = 5;
		e621games.guessSpecies.config.TIMER = 5000;
		e621games.guessSpecies.config.TARGET_TAGS_TYPES = 'species';
		e621games.guessSpecies.config.DATASOURCE = ds.e621;
	}
};

e621games.guessSpecies.start = function() {
	e621games.guessSpecies._gameInProgress = false;
	e621games.guessSpecies.defaultOptions();
    tools.fetchTemplate('quizz-fullpage', {}, function(page){
        $('#show').html(page);
        tools.fetchTemplate('quizz-settings', {
            mode: e621games.guessSpecies.config.MODE,
            choices_nbItems: [
                {value:10, label: '10'},
                {value:20, label: '20'},
                {value:30, label: '30'}
            ],
            nbItems: e621games.guessSpecies.config.NB_QUIZZ_ITEMS,
            choices_nbAnswers: [
                {value:3, label: '3'},
                {value:5, label: '5'},
                {value:10, label: '10'}
            ],
            nbAnswers: e621games.guessSpecies.config.NB_ANSWERS_PER_ITEM,
            choices_timer: [
                {value:2000, label: '2 seconds'},
                {value:5000, label: '5 seconds'},
                {value:10000, label: '10 seconds'},
                {value:30000, label: '30 seconds'},
                {value:-1, label: 'forever'}
            ],
            timer: e621games.guessSpecies.config.TIMER,
			choices_imageSource: $.map(ds, function (datasource) {
				var availability = datasource.checkAvailability();
				availability.icon = tools.statusToIcon(availability.status);
				return {
					value: datasource.metadata.id, 
					label: datasource.metadata.label,
					availability: availability
				};
			}),
			imageSource: e621games.guessSpecies.config.DATASOURCE.metadata.id,
            choices_tags: [
                {value:'artist', label: 'The ""A R T I S T""'},
                {value:'general', label: 'General tags'},
                {value:'copyright', label: 'The intellectual property/licence (copyright)'},
                {value:'character', label: 'The character name (original, do not steal)'},
                {value:'species', label: 'The specie'},
				{value:'gender', label: 'The gender (watch your pronouns !)'},
				{value:'nbFavs', label: 'The popularity (nb of favs)'},
                {value:'all', label: 'Any of the above !'}
            ],
            tags: e621games.guessSpecies.config.TARGET_TAGS_TYPES
        }, function(settings) {
            $('body').append(settings);

            $("input[name=mode]").change(function () {
				e621games.guessSpecies.gameModeChanged();
            });
			e621games.guessSpecies.gameModeChanged();
			
			$('.uk-button-group.mode button').click(function(){
				$(".quizz-settings input[name=mode]").val($(this).attr('name')).trigger('change');
			});
			
			$('.uk-tab.datasource-chooser').on('change.uk.tab', function(evt, active, prev) {
				e621games.guessSpecies.datasourceChanged($(active).attr('name'));
				$(".quizz-modal").data('modal').resize();
			});
			e621games.guessSpecies.datasourceChanged($('.datasource-chooser li.uk-active').attr('name'));
			
            var settingsModal = UIkit.modal(".quizz-modal", {center:true, bgclose:false});

            $('.quizz-modal button.start-game').click(function(event){
                event.preventDefault();
				e621games.guessSpecies.launchNewGame();
            });

            settingsModal.show();
        });
    });
};


e621games.guessSpecies.welcome = function() {
    tools.fetchTemplate('welcome-modal', {}, function(page){
        $('#show').html(page);
		var welcomeModal = UIkit.modal(".welcome-modal", {center:true, bgclose:false});

		$('.welcome-modal .start-game').click(function(event){
			event.preventDefault();
			e621games.guessSpecies.start();
		});
		$('.welcome-modal').on({
			'show.uk.modal': function(){
				setTimeout(function() {
					$(".welcome-modal").data('modal').resize();
				}, 100);
			}
		});
		welcomeModal.show();
    });
};

$(window).load(function(){
    tools.initTools();
	e621games.guessSpecies.welcome();
});
