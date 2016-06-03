var e621games = {};

e621games.extractTags = function (post, callback) {
    e621games.extractingTags = true;
    $.ajax({
        url: "https://e621.net/post/tags.json",
        jsonp: "callback",
        dataType: "jsonp",
        data: {
            id: post.id,
            format: "json"
        },
        success: function( response ) {
            e621games.extractingTags = false;
            e621games.extractTagsForNextPost();
            callback(response);
        },
        error: function(response) {
            e621games.extractingTags = false;
            e621games.extractTagsForNextPost();
            callback([]);
        }
    });
};

e621games.tagTypeFromInt = function (type) {
    switch (type) {
        case 0: return "general";
        case 1: return "artist";
        case 3: return "copyright";
        case 4: return "character";
        case 5: return "species";
        default : return "other";
    }
};

e621games.extractTagsForNextPost = function() {
    if (!e621games.extractingTags && e621games.guessSpecies.rawPosts.length > 0) {
        var postAndCallBack = e621games.guessSpecies.rawPosts.pop();
        var post = postAndCallBack.post;
        var callback = postAndCallBack.callback;
        e621games.extractTags(post, function(tags) {
            var ratio = post.sample_width < post.sample_height ? 'vertical' : 'horizontal';
            if (!(/.+\.(jpg|png|gif)/i.exec(post.sample_url))) {
                ratio = 'horizontal vertical';
            }
            var detailedPost = {
                id: post.id,
                imageUrl: post.sample_url,
                imageWidth: post.sample_width,
                imageHeight: post.sample_height,
                ratio: ratio,
                tags: {}
            };
            $.each(tags, function(index, tag) {
                var type = e621games.tagTypeFromInt(tag.type);
                if (!(type in detailedPost.tags)) {
                    detailedPost.tags[type] = [];
                }
                detailedPost.tags[type].push(tag);
            });
            callback(detailedPost);
        });
    }
};

e621games.addRawPost = function(post, callback) {
    e621games.guessSpecies.rawPosts.push({
        post: post,
        callback: callback
    });
    e621games.extractTagsForNextPost();
};

e621games.fetchData = function(nbItems, callback) {
    console.log("fetching "+nbItems+" items...");
    $.ajax({
        url: "https://e621.net/post/index.json",
        jsonp: "callback",
        dataType: "jsonp",
        data: {
            tags: e621games.guessSpecies.config.QUERY,
            limit: nbItems,
            format: "json"
        },
        success: function( response ) {
            for( i = 0; i < (nbItems - response.length); i++) {
                e621games.guessSpecies.config.NB_QUIZZ_ITEMS--;
                e621games.guessSpecies.addPost({});  // push empty missing posts
            }
            var submissions = $.map(response, function(post){
                e621games.addRawPost(post, callback);
            });
        }
    });
};

e621games.shuffleArrayInPlace = function(a) {
    var j, x, i;
    for (i = a.length; i; i -= 1) {
        j = Math.floor(Math.random() * i);
        x = a[i - 1];
        a[i - 1] = a[j];
        a[j] = x;
    }
};

e621games.pickRandom = function(fromArray, excludingElements) {
    var array = [];
    $.each(fromArray, function(x, item) {
        if ($.inArray(item, excludingElements) == -1) {
            array.push(item);
        }
    });
    return array[Math.floor(Math.random()*array.length)];
};

e621games.guessSpecies = {
    players: {}
};

e621games.guessSpecies.config = {
    NB_QUIZZ_ITEMS : 5 ,
    NB_ANSWERS_PER_ITEM: 5
};

e621games.guessSpecies.updateScore = function () {
    tools.fetchTemplate("quizz-score", e621games.guessSpecies.score, function(score){
        $('.quizz .score').html(score);
    });
};

e621games.guessSpecies.correctAnswer = function (correctAnswer) {
    tools.playSound('allright');
    e621games.guessSpecies.score.correct++;
    e621games.guessSpecies.updateScore();
    $('.quizz button.answer[name="'+correctAnswer+'"]').addClass("correct");
};

e621games.guessSpecies.wrongAnswer = function (correctAnswer, wrongAnswer) {
    tools.playSound('fail');
    e621games.guessSpecies.score.wrong++;
    e621games.guessSpecies.updateScore();
    $('.quizz button.answer[name="'+correctAnswer+'"]').addClass("correct");
    if (wrongAnswer != undefined) {
        $('.quizz button.answer[name="' + wrongAnswer + '"]').addClass("wrong");
    }
};

e621games.guessSpecies.startGame = function() {
    e621games.guessSpecies.score = {
        correct: 0,
        wrong: 0,
        nbItems: e621games.guessSpecies.config.NB_QUIZZ_ITEMS
    };
    e621games.guessSpecies.updateScore();
    e621games.guessSpecies.showQuizzItem(0);
    e621games.bgMusic = tools.playSound('bgmusic');
    e621games.bgMusic.loop = -1;
    e621games.bgMusic.volume = .6;
};

e621games.guessSpecies.endOfGame = function () {
    e621games.bgMusic.stop(); // todo fadeout
    $('.quizz').remove();
    var finalScore = (e621games.guessSpecies.score.correct / e621games.guessSpecies.quizzItems.length) * 100;
    tools.message("Accuracy : "+finalScore+"%", function(){}, true);
    if (finalScore >= 50) {
        tools.playSound('epic10pts');
    } else {
        tools.playSound('humiliation');
    }
};

e621games.guessSpecies.timer = function(init, callback, timeLeft) {
    if (timeLeft == undefined) {
        timeLeft = init;
    }
    $('.score .chart').data('easyPieChart').update((timeLeft/init) * 100);
    var TIMER_RESOLUTION = 100; // ms.
    if (timeLeft >= 0) {
        e621games.guessSpecies.timeout = setTimeout(function() {
            e621games.guessSpecies.timer(init, callback, timeLeft-TIMER_RESOLUTION);
        }, TIMER_RESOLUTION);
    } else {
        callback();
    }
};

e621games.guessSpecies.showQuizzItem = function (number) {
    tools.message("Get ready !", function(){
        var quizzItem = e621games.guessSpecies.quizzItems[number];
        tools.ensurePreloaded(quizzItem.imageUrl, function(){
            tools.fetchTemplate('quizz-item', quizzItem, function(page){
                var question = $('.quizz .question');
                question.html(page);
                question.find('button.answer').click(function(){
                    clearTimeout(e621games.guessSpecies.timeout);
                    question.find('button.answer').prop('disabled', 'true');
                    var answer = $(this).attr('name');
                    if (answer == quizzItem.specie) {
                        e621games.guessSpecies.correctAnswer(answer);
                    } else {
                        e621games.guessSpecies.wrongAnswer(quizzItem.specie, answer);
                    }
                    e621games.guessSpecies.showNextQuizzItem(number);
                });

                $.modal.close();
                if (e621games.guessSpecies.config.TIMER > 0) {
                    $('.score .chart').easyPieChart({
                        lineWidth: 20,
                        size: 200,
                        animate: {
                            duration: 200,
                            enabled: true
                        }
                    });
                    $('.score .chart').data('easyPieChart').update(100);
                    e621games.guessSpecies.timer(e621games.guessSpecies.config.TIMER, function () {
                        question.find('button.answer').prop('disabled', 'true');
                        e621games.guessSpecies.wrongAnswer(quizzItem.specie);
                        e621games.guessSpecies.showNextQuizzItem(number);
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
    return rawSpecie.replace(/_/g, " ").replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

e621games.guessSpecies.generateQuizzItems = function () {
    $.each(e621games.guessSpecies.detailedPosts, function(x, detailedPost) {
        var postTagsAndCounts = [];
        $.each(e621games.guessSpecies.config.TARGET_TAGS_TYPES, function(i, item){
            $.each(detailedPost.tags[item], function(i, tag) {
                postTagsAndCounts.push(tag);
            });
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
        e621games.shuffleArrayInPlace(postTags);
        for (var i = 1; i < e621games.guessSpecies.config.NB_ANSWERS_PER_ITEM; i++) {
            var nextAnswer = e621games.pickRandom(e621games.guessSpecies.allPossibleAnswers, quizzItem.answers.concat(postTags));
            if (nextAnswer == undefined) {
                break;
            }
            quizzItem.answers.push(nextAnswer);
        }
        e621games.shuffleArrayInPlace(quizzItem.answers);
        quizzItem.answers = $.map(quizzItem.answers, function(rawSpecie){
            return {
                name: rawSpecie,
                label: e621games.prettyLabel(rawSpecie)
            }
        });

        tools.preload(quizzItem.imageUrl);
        e621games.guessSpecies.quizzItems.push(quizzItem);
    });
    e621games.shuffleArrayInPlace(e621games.guessSpecies.quizzItems);

    e621games.guessSpecies.startGame();
};

e621games.guessSpecies.addPost = function(detailedPost) {
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
        $.each(e621games.guessSpecies.config.TARGET_TAGS_TYPES, function(i, targetTagType) {
            $.each(detailedPost.tags[targetTagType], function (i, targetTag) {
                var tagName = targetTag.name;
                if ($.inArray(tagName, e621games.guessSpecies.allPossibleAnswers) == -1) {
                    e621games.guessSpecies.allPossibleAnswers.push(tagName);
                }
            });
        });

        e621games.guessSpecies.detailedPosts.push(detailedPost);
        tools.showProgress({
            value: e621games.guessSpecies.detailedPosts.length
        });
    }
    if (e621games.guessSpecies.missingPosts == 0) {
        if (e621games.guessSpecies.detailedPosts.length < e621games.guessSpecies.config.NB_QUIZZ_ITEMS) {
            e621games.guessSpecies.missingPosts = e621games.guessSpecies.config.NB_QUIZZ_ITEMS - e621games.guessSpecies.detailedPosts.length;
            e621games.fetchData(e621games.guessSpecies.missingPosts, e621games.guessSpecies.addPost);
        } else {
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
        correct: 0,
        wrong: 0,
        nbItems: e621games.guessSpecies.config.NB_QUIZZ_ITEMS
    };
    e621games.guessSpecies.missingPosts = e621games.guessSpecies.config.NB_QUIZZ_ITEMS;
};

e621games.guessSpecies.playerListChanged = function () {
    tools.fetchTemplate('players-list', {players : e621games.guessSpecies.players}, function(playersList){
        $('.multiplayer-infos .players').html(playersList);
    });
    e621games.guessSpecies.broadcastScores();
};

e621games.guessSpecies.broadcastScores = function () {
    e621games.guessSpecies.socket.emit('scores', e621games.guessSpecies.players);
};

e621games.guessSpecies.setMultiPlayerMode = function (active) {
    if (active) {
        e621games.guessSpecies.config.session = Math.random().toString(36).substring(7);
        e621games.guessSpecies.socket = io();
        e621games.guessSpecies.socket.emit('server joined', {
            session: e621games.guessSpecies.config.session
        });

        e621games.guessSpecies.socket.on('player joined', function(msg){
            e621games.guessSpecies.players[msg.player.handle] = {
                handle: msg.player.handle,
                score: 0
            };
            e621games.guessSpecies.playerListChanged();
        });

        e621games.guessSpecies.socket.on('player left', function(msg){
            delete e621games.guessSpecies.players[msg.handle];
            e621games.guessSpecies.playerListChanged();
        });

        var pathname = $(location).attr('pathname');
        var joinUrl = $(location).attr('protocol') + '//' + $(location).attr('host') + pathname.substring(0, pathname.lastIndexOf('/')) + '/remote.html#'+e621games.guessSpecies.config.session;

        var qrcode =new QRCode("qrcode", {
            text: joinUrl,
            width: 256,
            height: 256,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });

        $('#qrcode').click(function(){
            window.open(joinUrl, 'stuff'+Math.random(), 'left=20,top=20,width=300,height=500,toolbar=0,resizable=0');
        });

        $('.multiplayer-infos')
            //.html('<a href="'+joinUrl+'">'+e621games.guessSpecies.config.session+"</a>")
            .show();
    } else {
        e621games.guessSpecies.socket.disconnect();
        e621games.guessSpecies.socket = null;
        e621games.guessSpecies.config.session = null;
        e621games.guessSpecies.players = {};
        $('.multiplayer-infos').hide();
        $('#qrcode').empty();
    }
};

e621games.guessSpecies.start = function() {
    tools.fetchTemplate('quizz-fullpage', {}, function(page){
        $('#show').html(page);
        tools.fetchTemplate('quizz-settings', {
            mode: 'single',
            choices_nbItems: [
                {value:10, label: '10'},
                {value:20, label: '20'},
                {value:30, label: '30'}
            ],
            nbItems: 10,
            choices_nbAnswers: [
                {value:3, label: '3'},
                {value:5, label: '5'},
                {value:10, label: '10'}
            ],
            nbAnswers: 5,
            choices_timer: [
                {value:2000, label: '2 seconds'},
                {value:5000, label: '5 seconds'},
                {value:10000, label: '10 seconds'},
                {value:30000, label: '30 seconds'},
                {value:-1, label: 'forever'}
            ],
            timer: 5000,
            choices_query: [
                {value:'wtf order:random', label: 'Slightly unsettling things'},
                {value:'nightmare_fuel order:random', label: 'Most unpleasant things'},
                {value:'zootopia order:score', label: 'The community\'s favourite rule34'},
                {value:'fursuit canine order:random', label: 'Everything looks like a dog'}
            ],
            choices_tags: [
                {value:'artist', label: 'The ""A R T I S T""'},
                {value:'general', label: 'General tags'},
                {value:'copyright', label: 'The intellectual property/licence that was raped (copyright)'},
                {value:'character', label: 'The character name (original, do not steal)'},
                {value:'species', label: 'The specie'},
                {value:'all', label: 'Any of the above !'}
            ],
            tags: 'species'
        }, function(settings) {
            $('body').append(settings);

            $('select[name=choices-query]').change(function(){
                var newValue = $('select[name=choices-query]').val();
                if('custom' == newValue) {
                    $('input[name=query]').prop('readonly', false).prop('disabled', false);
                } else {
                    $('input[name=query]').prop('readonly', true).prop('disabled', true).val(newValue);
                }
            });

            $("input[name=mode]:radio").change(function () {
                var mode = $(this).val();
                e621games.guessSpecies.setMultiPlayerMode(mode == 'multi');
            });

            $('.quizz-settings button').click(function(event){
                event.preventDefault();
                tools.playSound('letsrock');

                e621games.guessSpecies.config.NB_QUIZZ_ITEMS = parseInt($('.quizz-settings select[name=nbItems]').val());
                e621games.guessSpecies.config.NB_ANSWERS_PER_ITEM = parseInt($('.quizz-settings select[name=nbAnswers]').val());
                e621games.guessSpecies.config.TIMER = parseInt($('.quizz-settings select[name=timer]').val());
                e621games.guessSpecies.config.QUERY = $('.quizz-settings input[name=query]').val();
                e621games.guessSpecies.config.TARGET_TAGS_TYPES = [$('.quizz-settings select[name=tags]').val()];
                if('all' == e621games.guessSpecies.config.TARGET_TAGS_TYPES) {
                    e621games.guessSpecies.config.TARGET_TAGS_TYPES = ['artist', 'general', 'copyright', 'character', 'species'];
                }
                $('.quizz-settings').remove();

                e621games.guessSpecies.resetData();
                tools.showProgress({
                    message: "Fetching quizz data...",
                    max: e621games.guessSpecies.config.NB_QUIZZ_ITEMS,
                    value: 0
                });
                e621games.fetchData(e621games.guessSpecies.config.NB_QUIZZ_ITEMS, function(detailedPost){
                    e621games.guessSpecies.addPost(detailedPost);
                });
            });

            $('.quizz-modal').modal();
        });
    });
};

