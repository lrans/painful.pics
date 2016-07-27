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
	ds.fa._runtime.fetchPage = 0;
	ds.fa._runtime.fetchDone = false;
	ds.fa._runtime.rawPosts = [];
	ds.fa._runtime.extractingTags = false;
	ds.fa._runtime.lastPageHit = false;
};

ds.fa.stop = function () {
	ds.fa._runtime.fetchDone = true;
};

ds.fa.fetch = function (nbItems, query, callback) {
	if (ds.fa._runtime.lastPageHit === true) {
		return;
	}
	console.log("fetching " + nbItems + " items... (page " + ds.fa._runtime.fetchPage + ")");
	var postData = {
		q: query,
		'order-by': 'relevancy',
		'order-direction': 'desc',
		perpage: ds.fa._selectPageSize(nbItems),
		range: 'all',
		'rating-general': 'on',
		'rating-mature': 'on',
		'rating-adult': 'on',
		mode: 'extended'
	};
	if (ds.fa._runtime.fetchPage > 0) {
		postData.page = ds.fa._runtime.fetchPage;
		postData.next_page = '>>> ' + ds.fa._selectPageSize(nbItems) + ' more >>>';
	} else {
		postData.do_search = 'Search';
	}
	proxy.post("https://www.furaffinity.net/search/", postData, function (xmlDoc) {
		ds.fa._parseSubmissionsDocument(nbItems, xmlDoc, callback);
		ds.fa._runtime.fetchPage++;
	});
};

ds.fa._selectPageSize = function (nbItems) {
	return 72; // dynamic number of items in paged results would be a PITA
};

ds.fa._parseSubmissionsDocument = function (nbItems, doc, callback) {
	var submissions = $(doc).find('b.t-image > u > s > a');
	var lastPage = ds.fa._extractIsLastResultPage(doc);
	if (lastPage) {
		ds.fa._runtime.lastPageHit = true;
	}
	var standardCallBack = function(detailedPost) {
		callback(detailedPost, false);
	};
	var lastItemCallBack = function(detailedPost) {
		callback(detailedPost, true);
	};
	for (var i = 0 ; i < submissions.length ; i++) {
		var lastItemInPage = (i === submissions.length - 1);
		if (lastPage && lastItemInPage) {
			ds.fa._addRawPost($(submissions[i]).attr('href'), lastItemCallBack);
		} else {
			ds.fa._addRawPost($(submissions[i]).attr('href'), standardCallBack);
		}
	}
	if (!lastPage) {
		for (var j = 0; j < (nbItems - submissions.size()); j++) {
			callback({});  // push empty missing posts
		}
	}
};

ds.fa._extractIsLastResultPage = function(doc) {
	var faSkin = $(doc).find('fieldset#search-results').size() > 0 ? 'old' : 'new';
	var rawQueryStats;
	if (faSkin == 'old') {
		rawQueryStats = $($(doc).find('fieldset#search-results > legend').contents()[1]).text();
	} else {
		rawQueryStats = $($(doc).find('div#query-stats').contents().last()).text();
	}
	var queryStats = /.* - ([0-9]+) of ([0-9]+).*/.exec(rawQueryStats);
	return parseInt(queryStats[1]) >= parseInt(queryStats[2]);
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
		var postAndCallBack = ds.fa._runtime.rawPosts.shift();
		var post = postAndCallBack.post;
		var callback = postAndCallBack.callback;
		ds.fa._extractDetails(post, function (details) {
			if (typeof details.imageWidth !== 'undefined' && typeof details.imageHeight !== 'undefined') {
				var ratio = details.imageWidth < details.imageHeight ? 'vertical' : 'horizontal';
				if (!(/.+\.(jpg|png|gif)/i.exec(details.imageUrl))) {
					ratio = 'horizontal vertical';
				}
				details.ratio = ratio;
			}
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

ds.fa._getRawArtist = function(xmlDoc, faSkin) {
	if (faSkin === 'new') {
		return $(xmlDoc).find('div.submission-title > span > a > strong').text();
	} else if (faSkin === 'old') {
		return $($(xmlDoc).find('table.maintable')[1]).find('tr:first > td > a').text();
	}
};

ds.fa._extractFromStatsContainer = function(xmlDoc, keyword) {
	var propertiesNode = $(xmlDoc).find('td.stats-container').contents();
	for(var i = 0; i < propertiesNode.length; i++) {
		if ($(propertiesNode[i]).text() === keyword) {
			var result = $(propertiesNode[i+1]).text();
			return result;
		}
	}
};

ds.fa._getRawResolution = function(xmlDoc, faSkin) {
	var propertiesNode;
	if (faSkin === 'new') {
		propertiesNode = $(xmlDoc).find('div.tags-row > div.p10b').contents();
		return $(propertiesNode[3]).text().replace("\n",'');
	} else if (faSkin === 'old') {
		return ds.fa._extractFromStatsContainer(xmlDoc, 'Resolution:');
	}
};

ds.fa._getRawSpecies = function(xmlDoc, faSkin) {
	var propertiesNode;
	if (faSkin === 'new') {
		propertiesNode = $(xmlDoc).find('div.tags-row > div.p10b').contents();
		return $(propertiesNode[5]).text().replace("\n",'');
	} else if (faSkin === 'old') {
		return ds.fa._extractFromStatsContainer(xmlDoc, 'Species:');
	}
};

ds.fa._extractDetails = function (post, callback) {
	ds.fa._runtime.extractingTags = true;
	proxy.get("https://www.furaffinity.net" + post, function(xmlDoc){
		if (ds.fa._runtime.fetchDone) {
			return;
		}

		ds.fa._runtime.extractingTags = false;
		ds.fa._extractTagsForNextPost();
		console.log("extracting details for "+post);
		
		if($(xmlDoc).find('#submissionImg').size() === 0) {
			console.log("nothing to read here, skipping");
			callback({});
			return;
		}
		
		var imageUrl = 'https:' + $(xmlDoc).find('#submissionImg').attr('src');
		proxy.head(imageUrl, function(status) {
			if (status !== "success" && status !== "nocontent") {
				// could not HEAD the image, happens with newly published stuff
				callback({});
				return;
			}
			
			var faSkin = $(xmlDoc).find('td.stats-container').size() > 0 ? 'old' : 'new';

			var submissionIdMatcher = /\/view\/([0-9]+)/.exec(post);

			var tags = {};
			tags.artist = [{
				type: 'artist',
				name: ds.fa._getRawArtist(xmlDoc, faSkin)
			}];

			tags.general = [];
			var tagsSelector = (faSkin === 'new' ? 'div.tags-row > span.tags > a' : 'td.stats-container div#keywords > a');
			$(xmlDoc).find(tagsSelector).each(function(i, tag) {
				tags.general.push({
					type: 'general',
					name: $(tag).text()
				});
			});

			var resolutionMatcher = /[^0-9]*([0-9]+)x([0-9]+)(px)?.*/g.exec(ds.fa._getRawResolution(xmlDoc, faSkin));
			var speciesMatcher = / ?([^-|]*)( - ([^|]*))?( | )?/g.exec(ds.fa._getRawSpecies(xmlDoc, faSkin));

			var baseSpecie = speciesMatcher[1].trim();
			if (baseSpecie !== 'Unspecified / Any') {
				tags.species = [{
					type: 'species',
					name: baseSpecie.replace(' (Other)', '')
				}];

				if (speciesMatcher[3] !== undefined) {
					tags.species.push({
						type: 'species',
						name: speciesMatcher[3].trim()
					});
				}
			}

			callback({
				id: submissionIdMatcher[1],
				tags: tags,
				imageUrl: imageUrl,
				imageWidth: parseInt(resolutionMatcher[1]),
				imageHeight: parseInt(resolutionMatcher[2])
			});
		});
	});
};