var ds = ds || {};

ds.fa = {};

ds.fa.metadata = {
	id: 'fa',
	label: "furaffinity.net",
	providedTags : ["general", "artist", "species"]
};

ds.fa.checkAvailability = function() {
	if (typeof chrome === 'undefined' || typeof chrome.webstore === 'undefined') {
		return {
			status: 'error',
			message: 'Unfortunately, FA compatibility is enabled on chrome/chromium only for now, sorry about that :('
		};
	} else {
		if (proxy.isProxyAvailable()) {
			return {
				status: 'ok',
				message: 'FA is available'
			};
		} else {
			return {
				status: 'warning',
				message: 'Retrieving data on FA requires to install the painful.pics proxy extension, please click here to do so'
			};
		}
	}
};

ds.fa.showSettingsScreen = function(settingsPlaceHolder) {
	if (!proxy.isProxyAvailable()) {
		tools.fetchTemplate('ds-fa-wait-install', {
		}, function(waiter){
			$(settingsPlaceHolder).html(waiter);
			chrome.webstore.install();
			var readyStateCheckInterval = setInterval(function () {
				if (proxy.isProxyAvailable()) {
					clearInterval(readyStateCheckInterval);
					$('.datasource-chooser li[name=fa] > a > i').attr('class', '').addClass(tools.statusToIcon('ok'));
					$(settingsPlaceHolder).empty();
					ds.fa._showSettingsScreen(settingsPlaceHolder);
				}
			}, 10);
		});
	} else {
		ds.fa._showSettingsScreen(settingsPlaceHolder);
	}
};

ds.fa._showSettingsScreen = function(settingsPlaceHolder) {
	tools.fetchTemplate('ds-settings-e621', {
		choices_query: [
			{value:'fox gay anal', label: 'Popular things'},
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
		});
	});
};

ds.fa._runtime = {
};

ds.fa.reset = function () {
	ds.fa._runtime.fetchPage = 1;
	ds.fa._runtime.fetchDone = false;
	ds.fa._runtime.rawPosts = [];
	ds.fa._runtime.extractingTags = false;
};

ds.fa.stop = function () {
	ds.fa._runtime.fetchDone = true;
};

ds.fa.fetch = function (nbItems, query, callback) {
	console.log("fetching " + nbItems + " items... (page " + ds.fa._runtime.fetchPage + ")");
	proxy.post("https://www.furaffinity.net/search/", {
		q: query,
		do_search: 'Search',
		'order-by': 'relevancy',
		'order-direction': 'desc',
		perpage: ds.fa._selectPageSize(nbItems),
		range: 'all',
		'rating-general': 'on',
		'rating-mature': 'on',
		'rating-adult': 'on',
		mode: 'extended',
		page: ds.fa._runtime.fetchPage
	}, function (xmlDoc) {
		ds.fa._parseSubmissionsDocument(nbItems, xmlDoc, callback);
	});
	ds.fa._runtime.fetchPage++;
};

ds.fa._selectPageSize = function (nbItems) {
	var available = [24, 48, 72];
	for (var i = 0; i < available.length; i++) {
		if (available[i] >= nbItems) {
			return available[i];
		}
	}
	return available[available.length - 1];
};

ds.fa._parseSubmissionsDocument = function (nbItems, doc, callback) {
	var submissions = $(doc).find('b.t-image > u > s > a');
	submissions.each(function(i, submissionLink){
		ds.fa._addRawPost($(submissionLink).attr('href'), callback);
	});
	
	for (var i = 0; i < (nbItems - submissions.size()); i++) {
		callback({});  // push empty missing posts
	}
};

ds.fa._addRawPost = function (post, callback) {
	if (ds.fa._runtime.fetchDone) {
		return;
	}
	ds.fa._runtime.rawPosts.push({
		post: post,
		callback: callback
	});
	ds.fa._extractTagsForNextPost();
};

ds.fa._extractTagsForNextPost = function () {
	if (!ds.fa._runtime.extractingTags && ds.fa._runtime.rawPosts.length > 0) {
		var postAndCallBack = ds.fa._runtime.rawPosts.pop();
		var post = postAndCallBack.post;
		var callback = postAndCallBack.callback;
		ds.fa._extractDetails(post, function (details) {
			var ratio = details.imageWidth < details.imageHeight ? 'vertical' : 'horizontal';
			if (!(/.+\.(jpg|png|gif)/i.exec(details.imageUrl))) {
				ratio = 'horizontal vertical';
			}
			details.ratio = ratio;
			/*var detailedPost = {
				imageUrl: post.sample_url,
				imageWidth: post.sample_width,
				imageHeight: post.sample_height,
				ratio: ratio,
				tags: {}
			};
			$.each(details.tags, function (index, tag) {
				if (!(tag.type in detailedPost.tags)) {
					detailedPost.tags[tag.type] = [];
				}
				detailedPost.tags[tag.type].push(tag);
			});*/
			callback(details);
		});
	}
};

ds.fa._tagTypeFromInt = function (type) {
	switch (type) {
		case 0:
			return "general";
		case 1:
			return "artist";
		case 3:
			return "copyright";
		case 4:
			return "character";
		case 5:
			return "species";
		default :
			return "other";
	}
};

ds.fa._extractDetails = function (post, callback) {
	ds.fa._runtime.extractingTags = true;
	proxy.get("https://www.furaffinity.net" + post, function(xmlDoc){
		ds.fa._runtime.extractingTags = false;
		ds.fa._extractTagsForNextPost();
		
		var submissionIdMatcher = /\/view\/([0-9]+)/.exec(post);
		
		var tags = {};
		tags.artist = [{
			type: 'artist',
			name: $(xmlDoc).find('div.submission-title > span > a > strong').text()
		}];
		
		tags.general = [];
		$(xmlDoc).find('div.tags-row > span.tags > a').each(function(i, tag) {
			tags.general.push({
				type: 'general',
				name: $(tag).text()
			});
		});
		
		var propertiesNode = $(xmlDoc).find('div.tags-row > div.p10b').contents();
		var resolutionMatcher = /.*([0-9]+)x([0-9]+)px.*/g.exec($(propertiesNode[3]).text().replace("\n",''));
		var speciesMatcher = / ?([^-|]*)( - ([^|]*))? | /g.exec($(propertiesNode[5]).text().replace("\n",''));
		
		tags.species = [{
			type: 'species',
			name: speciesMatcher[1]
		}];
	
		if (speciesMatcher[3] !== undefined) {
			tags.species.push({
				type: 'species',
				name: speciesMatcher[3]
			});
		}
		
		callback({
			id: submissionIdMatcher[1],
			tags: tags,
			imageUrl: 'https:' + $(xmlDoc).find('#submissionImg').attr('src'),
			imageWidth: parseInt(resolutionMatcher[1]),
			imageHeight: parseInt(resolutionMatcher[2])
		});
	});
};