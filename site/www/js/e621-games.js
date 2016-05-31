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
            var detailedPost = {
                id: post.id,
                imageUrl: post.sample_url,
                imageWidth: post.sample_width,
                imageHeight: post.sample_height,
                ratio: post.sample_width < post.sample_height ? 'vertical' : 'horizontal',
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
            tags: 'wtf order:random',
            limit: nbItems,
            format: "json"
        },
        success: function( response ) {
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

e621games.guessSpecies = {};

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
    e621games.guessSpecies.score.correct++;
    e621games.guessSpecies.updateScore();
    $('.quizz button.answer[name="'+correctAnswer+'"]').addClass("correct");
};

e621games.guessSpecies.wrongAnswer = function (correctAnswer, wrongAnswer) {
    e621games.guessSpecies.score.wrong++;
    e621games.guessSpecies.updateScore();
    $('.quizz button.answer[name="'+correctAnswer+'"]').addClass("correct");
    $('.quizz button.answer[name="'+wrongAnswer+'"]').addClass("wrong");
};

e621games.guessSpecies.endOfGame = function () {
    $('.quizz').remove();
    var finalScore = (e621games.guessSpecies.score.correct / e621games.guessSpecies.quizzItems.length) * 100;
    tools.message("Accuracy : "+finalScore+"%", function(){}, true);
};

e621games.guessSpecies.showQuizzItem = function (number) {
    tools.message("Get ready !", function(){
        var quizzItem = e621games.guessSpecies.quizzItems[number];

        tools.fetchTemplate('quizz-item', quizzItem, function(page){
            var question = $('.quizz .question');
            question.html(page);
            question.find('button.answer').click(function(){
                var answer = $(this).attr('name');
                if (answer == quizzItem.specie) {
                    e621games.guessSpecies.correctAnswer(answer);
                } else {
                    e621games.guessSpecies.wrongAnswer(quizzItem.specie, answer);
                }
                setTimeout(function() {
                    if (e621games.guessSpecies.quizzItems.length > (number+1)) {
                        e621games.guessSpecies.showQuizzItem(number + 1);
                    } else {
                        e621games.guessSpecies.endOfGame();
                    }
                }, 2000);
            });

            $.modal.close();
        });
    });
};

e621games.prettyLabel = function (rawSpecie) {
    return rawSpecie.replace(/_/g, " ").replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

e621games.guessSpecies.generateQuizzItems = function () {
    $.each(e621games.guessSpecies.detailedPosts, function(x, detailedPost) {
        var postSpecies = [];
        $.each(e621games.guessSpecies.config.TARGET_TAGS_TYPES, function(i, item){
            $.each(detailedPost.tags[item], function(i, tag) {
                postSpecies.push(tag.name);
            });
        });
        e621games.shuffleArrayInPlace(postSpecies);
        var quizzItem = {
            id: detailedPost.id,
            imageUrl: detailedPost.imageUrl,
            ratio: detailedPost.ratio,
            specie: postSpecies[0],
            answers: [postSpecies[0]]
        };
        for (var i = 1; i < e621games.guessSpecies.config.NB_ANSWERS_PER_ITEM; i++) {
            quizzItem.answers.push(e621games.pickRandom(e621games.guessSpecies.allPossibleAnswers, quizzItem.answers.concat(postSpecies)));
        }
        e621games.shuffleArrayInPlace(quizzItem.answers);
        quizzItem.answers = $.map(quizzItem.answers, function(rawSpecie){
            return {
                name: rawSpecie,
                label: e621games.prettyLabel(rawSpecie)
            }
        });

        e621games.guessSpecies.quizzItems.push(quizzItem);
    });
    e621games.shuffleArrayInPlace(e621games.guessSpecies.quizzItems);
    e621games.guessSpecies.updateScore();
    e621games.guessSpecies.showQuizzItem(0);
};

e621games.guessSpecies.addPost = function(detailedPost) {
    e621games.guessSpecies.missingPosts--;

    var skip = true; // skip by default ...
    $.each(e621games.guessSpecies.config.TARGET_TAGS_TYPES, function(i, targetTagType){
        if (("tags" in detailedPost) && targetTagType in detailedPost.tags) {
            skip = false; // ... except if we have some relevant tag
        }
    });

    if (detailedPost.imageUrl.endsWith("swf")) {
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
        $.each(detailedPost.tags, function(key, tagsForType){
            tagsForType.sort(function (a, b) {
                return a.count - b.count;
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

e621games.guessSpecies.start = function() {
    tools.fetchTemplate('quizz-fullpage', {}, function(page){
        $('#show').html(page);
        tools.fetchTemplate('quizz-settings', {
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
            choices_tags: [
                {value:'artist', label: 'The "artist"'},
                {value:'general', label: 'General tags'},
                {value:'copyright', label: 'Which intellectual property was raped (copyright)'},
                {value:'character', label: 'The original character (do not steal)'},
                {value:'species', label: 'The species'},
                {value:'all', label: 'Any of the above !'}
            ],
            tags: 'species'
        }, function(settings) {
            $('body').append(settings);

            $('.quizz-settings button').click(function(event){
                event.preventDefault();
                e621games.guessSpecies.config.NB_QUIZZ_ITEMS = parseInt($('.quizz-settings select[name=nbItems]').val());
                e621games.guessSpecies.config.NB_ANSWERS_PER_ITEM = parseInt($('.quizz-settings select[name=nbAnswers]').val());
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

            $('.quizz-settings').modal();
        });
    });
};

