/* global e621games, tools */

var ds = ds || {};

ds.e621 = {};

ds.e621.metadata = {
	id: 'e621',
	label: "e621.net",
	providedTags : ["general", "artist", "copyright", "character", "species", "nbFavs", "score", "gender"],
	defaultQuery: {
		cq: "wtf order:random",
		query: "wtf order:random"
	}
};

ds.e621.describe = function(config) {
	return ds.e621.metadata.label + ' : ' + config.QUERY.query;
};

ds.e621.checkAvailability = function() {
	return {
		status: 'ok',
		message: 'e621.net is available'
	};
};

ds.e621.showSettingsScreen = function(settingsPlaceHolder) {
	tools.fetchTemplate('ds-settings-e621', {
		choices_query: [
			{value:'wtf order:random', label: 'Slightly unsettling things'},
			{value:'nightmare_fuel order:random', label: 'Most unpleasant things'},
			{value:'zootopia order:score', label: 'The community\'s favourite rule34'},
			{value:'fursuit canine order:random', label: 'Everything looks like a dog'}
		]
	}, function(settings){
		$(settingsPlaceHolder).html(settings);

		$('select[name=choices-query]').change(function(){
			var newValue = $('select[name=choices-query]').val();
			if('custom' === newValue) {
				$('input[name=query]').prop('readonly', false).prop('disabled', false);
			} else {
				$('input[name=query]').prop('readonly', true).prop('disabled', true).val(newValue);
			}
			e621games.guessSpecies.config.QUERY.query = $(settingsPlaceHolder).find('input[name=query]').val();
			e621games.guessSpecies.serializeOptions();
		});
		if (e621games.guessSpecies.config.QUERY.cq === 'custom') {
			$('input[name=query]').prop('readonly', false).prop('disabled', false);
		}
	});
};

ds.e621._runtime = {
	
};

ds.e621.reset = function() {
	ds.e621._runtime.fetchPage = 1;
	ds.e621._runtime.fetchDone = false;
	ds.e621._runtime.rawPosts = [];
	ds.e621._runtime.extractingTags = false;
};

ds.e621.stop = function() {
	ds.e621._runtime.fetchDone = true;
};

ds.e621.fetch = function(nbItems, query, callback) {
    console.log("fetching "+nbItems+" items... (page " + ds.e621._runtime.fetchPage + ")");
    $.ajax({
        url: "https://e621.net/post/index.json",
        jsonp: "callback",
        dataType: "jsonp",
        data: {
            tags: query.query,
            limit: nbItems,
            page: ds.e621._runtime.fetchPage,
            format: "json"
        },
        success: function( response ) {
            for( i = 0; i < (nbItems - response.length); i++) {
                //e621games.guessSpecies.config.NB_QUIZZ_ITEMS--;
                callback({});  // push empty missing posts
            }
            $.map(response, function(post){
                ds.e621._addRawPost(post, callback);
            });
        }
    });
    ds.e621._runtime.fetchPage++;
};

ds.e621._addRawPost = function(post, callback) {
    if (ds.e621._runtime.fetchDone) {
        return;
    }
    ds.e621._runtime.rawPosts.push({
        post: post,
        callback: callback
    });
    ds.e621._extractTagsForNextPost();
};

ds.e621._extractTagsForNextPost = function() {
    if (!ds.e621._runtime.extractingTags && ds.e621._runtime.rawPosts.length > 0) {
        var postAndCallBack = ds.e621._runtime.rawPosts.pop();
        var post = postAndCallBack.post;
        var callback = postAndCallBack.callback;
        ds.e621._extractTags(post, function(tags) {
            var ratio = post.sample_width < post.sample_height ? 'vertical' : 'horizontal';
            if (!(/.+\.(jpg|png|gif)/i.exec(post.sample_url))) {
                ratio = 'horizontal vertical';
            }
            var detailedPost = {
                id: post.id,
				postUrl: 'https://e621.net/post/show/' + post.id,
                imageUrl: post.sample_url,
                imageWidth: post.sample_width,
                imageHeight: post.sample_height,
                ratio: ratio,
                tags: {}
            };
            $.each(tags, function(index, tag) {
                var type = ds.e621._tagTypeFromInt(tag.type, tag.name);
                if (!(type in detailedPost.tags)) {
                    detailedPost.tags[type] = [];
                }
                detailedPost.tags[type].push(tag);
            });
			detailedPost.tags.score = [{
				type: 'score',
				name: '' + post.score
			}];
			detailedPost.tags.nbFavs = [{
				type: 'nbFavs',
				name: '' + post.fav_count
			}];
            callback(detailedPost);
        });
    }
};

ds.e621._genderTags = [
	'male',
	'female',
	'dickgirl',
	'girly',
	'cuntboy',
	'herm',
	'maleherm',
	'ambiguous_gender',
	'featureless_crotch',
	'intersex'
];

ds.e621._tagTypeFromInt = function (type, label) {
	if (ds.e621._genderTags.indexOf(label) >= 0) {
		return 'gender';
	}
    switch (type) {
        case 0: return "general";
        case 1: return "artist";
        case 3: return "copyright";
        case 4: return "character";
        case 5: return "species";
        default : return "other";
    }
};

ds.e621._extractTags = function (post, callback) {
    ds.e621._runtime.extractingTags = true;
    $.ajax({
        url: "https://e621.net/post/tags.json",
        jsonp: "callback",
        dataType: "jsonp",
        data: {
            id: post.id,
            format: "json"
        },
        success: function(response) {
            ds.e621._runtime.extractingTags = false;
            ds.e621._extractTagsForNextPost();
            callback(response);
        },
        error: function(response) {
            ds.e621._runtime.extractingTags = false;
            ds.e621._extractTagsForNextPost();
            callback([]);
        }
    });
};