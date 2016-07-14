var ds = ds || {};

ds.e621 = {};

ds.e621.metadata = {
	label: "e621.net"
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
            tags: query,
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
                imageUrl: post.sample_url,
                imageWidth: post.sample_width,
                imageHeight: post.sample_height,
                ratio: ratio,
                tags: {}
            };
            $.each(tags, function(index, tag) {
                var type = ds.e621._tagTypeFromInt(tag.type);
                if (!(type in detailedPost.tags)) {
                    detailedPost.tags[type] = [];
                }
                detailedPost.tags[type].push(tag);
            });
            callback(detailedPost);
        });
    }
};

ds.e621._tagTypeFromInt = function (type) {
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