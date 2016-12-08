/* global proxy, tools, e621games */

var ds = ds || {};

ds.fa = {};

ds.fa.metadata = {
	id: 'fa',
	label: "furaffinity.net",
	providedTags : ["general", "artist", "species", "gender", "nbFavs", "comment"],
	defaultQuery: {
		query: "fox gay anal",
		sorting: "random",
		mode: 'search'
	}
};

ds.fa.describe = function(config) {
	return ds.fa.metadata.label + ' : ' + config.QUERY.query + ' sorted by ' + config.QUERY.sorting;
};

ds.fa.checkAvailability = function() {
	return proxy.checkAvailability('FA');
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
	var sortingsByMode = {
		search : ['random', 'relevancy', 'date', 'popularity'],
		favs: ['random', 'date']
	};
	var templateParams = {
		choices_mode: [
			{value:'search', label: 'Search', sortings: ['random', 'relevancy', 'date', 'popularity']},
			{value:'favs', label: 'Favorites of', sortings: ['random', 'date']}
		],
		choices_sorting: [
			{value:'random', label: 'randomly'},
			{value:'relevancy', label: 'most relevant first'},
			{value:'date', label: 'most recent first'},
			{value:'popularity', label: 'most popular first'}
		]
	};

	tools.fetchTemplate('ds-settings-fa', templateParams, function(settings){
		$(settingsPlaceHolder).html(settings);
		
		$(settingsPlaceHolder).find('select#choices-mode').change(function() {
			var sortings = sortingsByMode[this.value];
			$(settingsPlaceHolder).find('#sorting option').each(function(i, option) {
				$(option).prop('disabled', $.inArray($(option).attr('value'), sortings) < 0);
			});
			if ($(settingsPlaceHolder).find('#sorting option:selected').prop('disabled')) {
				$(settingsPlaceHolder).find('select#sorting').val(sortings[0]);
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
	ds.fa._runtime.availablePages = undefined;
	ds.fa._runtime.fetchedPages = [];
};

ds.fa.stop = function () {
	ds.fa._runtime.fetchDone = true;
};

ds.fa.fetch = function (nbItems, query, callback) {
	if (query.mode === undefined) {
		query.mode = 'search';
	}
	ds.fa['_fetch_'+ query.mode](nbItems, query, callback);
};

ds.fa._fetch_favs = function (nbItems, query, callback) {
	if (ds.fa._runtime.availablePages === undefined) {
		ds.fa._runtime.availablePages = 10000;
	}
	var sorting = query.sorting;
	var pageToFetch = ds.fa._runtime.fetchPage;
	if (sorting === 'random') {
		pageToFetch = ds.fa._getRandomPageToFetch();
	}
	console.log("fetching " + nbItems + " items... (page " + pageToFetch + ")");
	ds.fa._runtime.fetchedPages.push(pageToFetch);
	proxy.get("https://www.furaffinity.net/favorites/" + query.query + '/' + pageToFetch, {}, function (xmlDoc) {
		if (ds.fa._isPageEmpty(xmlDoc)) {
			ds.fa._runtime.availablePages = pageToFetch - 1;
			if (query.sorting === 'random') {
				ds.fa.fetch(nbItems, query, callback);
			} else {
				// TODO sorted and no results anymore, abort!
			}
		} else {
			ds.fa._parseSubmissionsDocument(query, nbItems, xmlDoc, callback);
			ds.fa._runtime.fetchPage++;
		}
	});
};

ds.fa._fetch_search = function (nbItems, query, callback) {
	if (ds.fa._runtime.lastPageHit === true) {
		return;
	}
	var sorting = query.sorting;
	var pageToFetch = ds.fa._runtime.fetchPage;
	if (sorting === 'random') {
		sorting = 'date';
		if (ds.fa._runtime.availablePages !== undefined) {
			pageToFetch = ds.fa._getRandomPageToFetch();
		}
	}
	var postData = {
		q: query.query,
		'order-by': sorting,
		'order-direction': 'desc',
		perpage: ds.fa._selectPageSize(nbItems),
		range: 'all',
		'rating-general': 'on',
		'rating-mature': 'on',
		'rating-adult': 'on',
		mode: 'extended'
	};
	if (pageToFetch > 0) {
		postData.page = pageToFetch;
		postData.next_page = '>>> ' + ds.fa._selectPageSize(nbItems) + ' more >>>';
	} else {
		postData.do_search = 'Search';
	}
	console.log("fetching " + nbItems + " items... (page " + postData.page + ")");
	ds.fa._runtime.fetchedPages.push(postData.page);
	proxy.post("https://www.furaffinity.net/search/", postData, function (xmlDoc) {
		if (query.sorting === 'random' && ds.fa._runtime.availablePages === undefined) {
			ds.fa._runtime.availablePages = ds.fa._getAvailableResultPages(xmlDoc);
			ds.fa.fetch(nbItems, query, callback);
		} else {
			ds.fa._parseSubmissionsDocument(query, nbItems, xmlDoc, callback);
			ds.fa._runtime.fetchPage++;
		}
	});
};

ds.fa._isPageEmpty = function(xmlDoc) {
	return $(xmlDoc).find('#no-images').size() > 0;
};

ds.fa._getAvailableResultPages = function(xmlDoc) {
	var result = Math.ceil(parseInt(ds.fa._extractQueryStats(xmlDoc)[2]) / ds.fa._selectPageSize());
	var maxPages = Math.floor(3000 / ds.fa._selectPageSize());
	if (result > maxPages) {
		result = maxPages;
	}
	return result;
};

ds.fa._getRandomPageToFetch = function(){
	if (ds.fa._runtime.fetchedPages.length === ds.fa._runtime.availablePages) {
		return undefined;
	}
	var result = Math.floor(Math.random() * (ds.fa._runtime.availablePages + 1));
	if (ds.fa._runtime.fetchedPages.indexOf(result) >= 0) {
		return ds.fa._getRandomPageToFetch();
	} else {
		return result;
	}
};

ds.fa._selectPageSize = function (nbItems) {
	return 72; // dynamic number of items in paged results would be a PITA
};

ds.fa._parseSubmissionsDocument = function (query, nbItems, doc, callback) {
	var submissions = $(doc).find('.t-image > b a');
	tools.shuffleArrayInPlace(submissions);
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
			ds.fa._addRawPost(query, $(submissions[i]).attr('href'), lastItemCallBack);
		} else {
			ds.fa._addRawPost(query, $(submissions[i]).attr('href'), standardCallBack);
		}
	}
	if (!lastPage) {
		for (var j = 0; j < (nbItems - submissions.size()); j++) {
			callback({});  // push empty missing posts
		}
	}
};

ds.fa._extractIsLastResultPage = function(doc) {
	if (ds.fa._isPageEmpty(doc)) {
		return true;
	}
	var queryStats = ds.fa._extractQueryStats(doc);
	return queryStats !== null && parseInt(queryStats[1]) >= parseInt(queryStats[2]);
};

ds.fa._extractQueryStats = function(doc) {
	var faSkin = $(doc).find('fieldset#search-results').size() > 0 ? 'old' : 'new';
	var rawQueryStats;
	if (faSkin === 'old') {
		rawQueryStats = $($(doc).find('fieldset#search-results > legend').contents()[1]).text();
	} else {
		rawQueryStats = $($(doc).find('div#query-stats').contents().last()).text();
	}
	return /.* - ([0-9]+) of ([0-9]+).*/.exec(rawQueryStats);
};

ds.fa._addRawPost = function (query, post, callback) {
	if (ds.fa._runtime.fetchDone) {
		return;
	}
	ds.fa._runtime.rawPosts.push({
		post: post,
		callback: callback,
		query: query
	});
	ds.fa._extractTagsForNextPost();
};

ds.fa._extractTagsForNextPost = function () {
	if (!ds.fa._runtime.extractingTags && ds.fa._runtime.rawPosts.length > 0) {
		var postAndCallBack = ds.fa._runtime.rawPosts.shift();
		var post = postAndCallBack.post;
		var callback = postAndCallBack.callback;
		var query = postAndCallBack.query;
		ds.fa._extractDetails(query, post, function (details) {
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
	if (faSkin === 'new') {
		return $(xmlDoc).find('div.submission-sidebar a.myButton.download').text();
	} else if (faSkin === 'old') {
		return ds.fa._extractFromStatsContainer(xmlDoc, 'Resolution:');
	}
};

ds.fa._getRawSpecies = function(xmlDoc, faSkin) {
	var propertiesNode;
	if (faSkin === 'new') {
		propertiesNode = $(xmlDoc).find('div.submission-sidebar div.sidebar-section-no-bottom div:nth(1)').contents();
		return $(propertiesNode[1]).text().replace("\n",'');
	} else if (faSkin === 'old') {
		return ds.fa._extractFromStatsContainer(xmlDoc, 'Species:');
	}
};

ds.fa._getRawGender = function(xmlDoc, faSkin) {
	var propertiesNode;
	if (faSkin === 'new') {
		propertiesNode = $(xmlDoc).find('div.submission-sidebar div.sidebar-section-no-bottom div:nth(2)').contents();
		return $(propertiesNode[1]).text().replace("\n",'');
	} else if (faSkin === 'old') {
		return ds.fa._extractFromStatsContainer(xmlDoc, 'Gender:');
	}
};

ds.fa._getRawNbFavs = function(xmlDoc, faSkin) {
	if (faSkin === 'new') {
		return $(xmlDoc).find('div.flex-submission-counter-2 > span').text().replace("\n",'');
	} else if (faSkin === 'old') {
		return ds.fa._extractFromStatsContainer(xmlDoc, 'Favorites:');
	}
};

ds.fa._filterComment = function(commentElement, callback) {
	var comment = $($(commentElement).contents()[0]).text().replace("\n",'').trim();
	if (comment.length > 0 && comment.length <= 50) {
		callback(comment);
	}
};

ds.fa._getRawComments = function(xmlDoc, faSkin, query) {
	var result = [];
	var comment;
	if (faSkin === 'new') {
		$(xmlDoc)
			.find('div.comments-list div.comment_container[style="width:100%"]')
			.filter(function(i, commentContainer) {
				return query.Bfiltercomments === true && $(commentContainer).find('.comment_username').text() === query.commentsby;
			})
			.find('div.comment_text')
			.each(function(i, comment){
				ds.fa._filterComment(comment, function(commentText){
					result.push(commentText);
				});
			});
	} else if (faSkin === 'old') {
		$(xmlDoc)
			.find('table.container-comment[width="100%"]')
			.filter(function(i, commentContainer) {
				return query.Bfiltercomments === true && $(commentContainer).find('.replyto-name').text() === query.commentsby;
			})
			.find('td.replyto-message')
			.each(function(i, comment){
				ds.fa._filterComment(comment, function(commentText){
					result.push(commentText);
				});
			});
	}
	return result;
};

ds.fa._extractDetails = function (query, post, callback) {
	ds.fa._runtime.extractingTags = true;
	proxy.get("https://www.furaffinity.net" + post, {}, function(xmlDoc){
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
			var speciesMatcher = / ?([^-|]*[^ -])( - ([^|]*))?/g.exec(ds.fa._getRawSpecies(xmlDoc, faSkin));
			var genderMatcher = /.*/.exec(ds.fa._getRawGender(xmlDoc, faSkin));

			var baseSpecie = speciesMatcher[1].trim();
			if (baseSpecie !== 'Unspecified / Any') {
				if (speciesMatcher[3] !== undefined) {
					tags.species = [{
						type: 'species',
						name: speciesMatcher[3].trim()
					}];
				} else {
					tags.species = [{
						type: 'species',
						name: baseSpecie.replace(' (Other)', '')
					}];
				}
			}
			
			var gender = genderMatcher[0].trim();
			if (gender !== 'Other / Not Specified' && gender !== 'Any') {
				tags.gender = [{
					type: 'gender',
					name: gender
				}];
			}

			tags.nbFavs = [{
				type: 'nbFavs',
				name: ds.fa._getRawNbFavs(xmlDoc, faSkin).trim()
			}];
		
			var comments = ds.fa._getRawComments(xmlDoc, faSkin, query);
			if (comments.length > 0) {
				tags.comment = $.map(comments, function(comment){
					return {
						type: 'comment',
						name: comment
					};
				});
			}

			callback({
				id: submissionIdMatcher[1],
				tags: tags,
				imageUrl: imageUrl,
				postUrl: "https://www.furaffinity.net" + post
			});
		});
	});
};