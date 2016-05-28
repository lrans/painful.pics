var e621games = {};

e621games.extractTags = function (post, callback) {
    $.ajax({
        url: "https://e621.net/post/tags.json",
        jsonp: "callback",
        dataType: "jsonp",
        data: {
            id: post.id,
            format: "json"
        },
        success: function( response ) {
            callback(response);
        },
        error: function(response) {
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
        default : return "other;"
    }
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
                e621games.extractTags(post, function(tags) {
                    var detailedPost = {
                        id: post.id,
                        imageUrl: post.sample_url,
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
    NB_QUIZZ_ITEMS : 30 ,
    NB_ANSWERS_PER_ITEM: 10
};

e621games.guessSpecies.correctAnswer = function () {
    console.log("allright !");
};
e621games.guessSpecies.wrongAnswer = function () {
    console.log("boooooo !");
};

e621games.guessSpecies.showQuizzItem = function (number) {
    var quizzItem = e621games.guessSpecies.quizzItems[number];

    tools.fetchTemplate('quizz-item', quizzItem, function(page){
        var question = $('.quizz .question');
        question.html(page);
        question.find('button.answer').click(function(){
            var answer = $(this).attr('name');
            if (answer == quizzItem.specie) {
                e621games.guessSpecies.correctAnswer();
            } else {
                e621games.guessSpecies.wrongAnswer();
            }
            e621games.guessSpecies.showQuizzItem(number + 1);
        });
    });
};

e621games.prettyLabel = function (rawSpecie) {
    return rawSpecie.replace(/_/g, " ").replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

e621games.guessSpecies.generateQuizzItems = function () {
    $.each(e621games.guessSpecies.detailedPosts, function(x, detailedPost) {
        var postSpecies = $.map(detailedPost.tags.species, function(item){
            return item.name;
        });
        var quizzItem = {
            id: detailedPost.id,
            imageUrl: detailedPost.imageUrl,
            specie: detailedPost.tags.species[0].name,
            answers: [detailedPost.tags.species[0].name]
        };
        for (var i = 1; i < e621games.guessSpecies.config.NB_ANSWERS_PER_ITEM; i++) {
            quizzItem.answers.push(e621games.pickRandom(e621games.guessSpecies.species, quizzItem.answers.concat(postSpecies)));
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
    e621games.guessSpecies.showQuizzItem(0);
};

e621games.guessSpecies.addPost = function(detailedPost) {
    e621games.guessSpecies.missingPosts--;
    if (!("tags" in detailedPost) || !("species" in detailedPost.tags)) {
        return; // skip posts without any species
    }
    $.each(detailedPost.tags['species'], function(i, speciesTag) {
        var speciesName = speciesTag.name;
        if ($.inArray(speciesName, e621games.guessSpecies.species) == -1) {
            e621games.guessSpecies.species.push(speciesName);
        }
    });
    detailedPost.tags['species'].sort(function(a, b){
        return a.count - b.count;
    });

    e621games.guessSpecies.detailedPosts.push(detailedPost);
    console.log("got "+e621games.guessSpecies.detailedPosts.length+" items");

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
    e621games.guessSpecies.species = [];
    e621games.guessSpecies.detailedPosts = [];
    e621games.guessSpecies.quizzItems = [];
    e621games.guessSpecies.missingPosts = e621games.guessSpecies.config.NB_QUIZZ_ITEMS;
};

e621games.guessSpecies.start = function() {
    tools.fetchTemplate('quizz-fullpage', {}, function(page){
        $('#show').html(page);
        e621games.guessSpecies.resetData();
        e621games.fetchData(e621games.guessSpecies.config.NB_QUIZZ_ITEMS, function(detailedPost){
            e621games.guessSpecies.addPost(detailedPost);
        });
    });
};

