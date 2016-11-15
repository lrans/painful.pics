/* global proxy, tools */

var ds = ds || {};

ds.fsdb = {};

ds.fsdb.metadata = {
	id: 'fsdb',
	label: "Fursuit Database",
	providedTags : ["artist", "species", "gender", "description"],
	defaultQuery: {
		query: '',
		sorting: 'random'
	}
};

ds.fsdb.describe = function(config) {
	return ds.fsdb.metadata.label + ' : any fursuit, sorted by ' + config.QUERY.sorting;
};

ds.fsdb.checkAvailability = function() {
	return proxy.checkAvailability('The Fursuit Database');
};

ds.fsdb.showSettingsScreen = function(settingsPlaceHolder) {
	if (!proxy.isProxyAvailable()) {
		tools.fetchTemplate('ds-fa-wait-install', {
		}, function(waiter){
			$(settingsPlaceHolder).html(waiter);
			chrome.webstore.install();
			var readyStateCheckInterval = setInterval(function () {
				if (proxy.isProxyAvailable()) {
					clearInterval(readyStateCheckInterval);
					$('.datasource-chooser li[name=fsdb] > a > i').attr('class', '').addClass(tools.statusToIcon('ok'));
					$(settingsPlaceHolder).empty();
					ds.fsdb._showSettingsScreen(settingsPlaceHolder);
				}
			}, 10);
		});
	} else {
		ds.fsdb._showSettingsScreen(settingsPlaceHolder);
	}
};

ds.fsdb._showSettingsScreen = function(settingsPlaceHolder) {
	tools.fetchTemplate('ds-settings-fsdb', {
		choices_query: [
			{value:'', label: 'Any fursuit'},
			{value:'canines', label: 'Canines only'}
		],
		choices_sorting: [
			{value:'random', label: 'randomly'},
			{value:'5_1', label: 'most recent first'},
			{value:'5_0', label: 'oldest first'}
		]
	}, function(settings){
		$(settingsPlaceHolder).html(settings);
	});
};

ds.fsdb._runtime = {
};

ds.fsdb.reset = function () {
	ds.fsdb._runtime.fetchPage = 0;
	ds.fsdb._runtime.fetchDone = false;
	ds.fsdb._runtime.rawPosts = [];
	ds.fsdb._runtime.extractingTags = false;
	ds.fsdb._runtime.lastPageHit = false;
	ds.fsdb._runtime.availablePages = undefined;
	ds.fsdb._runtime.fetchedPages = [];
};

ds.fsdb.stop = function () {
	ds.fsdb._runtime.fetchDone = true;
};

ds.fsdb.fetch = function (nbItems, query, callback) {
	if (ds.fsdb._runtime.lastPageHit === true) {
		return;
	}
	var sorting = query.sorting.split('_')[0];
	var querySorting = sorting;
	var sortdesc = query.sorting.split('_')[1];
	var pageToFetch = ds.fsdb._runtime.fetchPage;
	if (sorting === 'random') {
		querySorting = 6;
		if (ds.fsdb._runtime.availablePages !== undefined) {
			pageToFetch = ds.fsdb._getRandomPageToFetch();
		}
	}
	var getData = {
		c: 'browse',
		suitlist_sort: querySorting,
		suitlist_limit: ds.fsdb._selectPageSize(),
		suitlist_start: pageToFetch * ds.fsdb._selectPageSize()
	};
	
	if (sortdesc === '1') {
		getData.suitlist_sortdesc = '1';
	}
	
	if (query.query === 'canines') {
		getData.fursuit_species = ds.fsdb._canineSpecies;
	}

	console.log("fetching " + nbItems + " items... (page " + pageToFetch + ")");
	ds.fsdb._runtime.fetchedPages.push(pageToFetch);
	proxy.get("https://db.fursuit.me/index.php", getData, function (xmlDoc) {
		if (sorting === 'random' && ds.fsdb._runtime.availablePages === undefined) {
			ds.fsdb._runtime.availablePages = ds.fsdb._getAvailableResultPages(xmlDoc);
			ds.fsdb.fetch(nbItems, query, callback);
		} else {
			ds.fsdb._parseBrowseDocument(nbItems, xmlDoc, callback);
			ds.fsdb._runtime.fetchPage++;
		}
	});
};

ds.fsdb._getAvailableResultPages = function(xmlDoc) {
	var result = Math.ceil(parseInt(ds.fsdb._extractQueryStats(xmlDoc)[2]) / ds.fsdb._selectPageSize());
	return result;
};

ds.fsdb._getRandomPageToFetch = function(){
	if (ds.fsdb._runtime.fetchedPages.length === ds.fsdb._runtime.availablePages) {
		return undefined;
	}
	var result = Math.floor(Math.random() * (ds.fsdb._runtime.availablePages + 1));
	if (ds.fsdb._runtime.fetchedPages.indexOf(result) >= 0) {
		return ds.fsdb._getRandomPageToFetch();
	} else {
		return result;
	}
};

ds.fsdb._selectPageSize = function (nbItems) {
	return 9; // dynamic number of items in paged results would be a PITA
};

ds.fsdb._parseBrowseDocument = function (nbItems, doc, callback) {
	var submissions = $(doc).find('td.browsecellcontent[rowspan=7]');
	tools.shuffleArrayInPlace(submissions);
	var lastPage = ds.fsdb._extractIsLastResultPage(doc);
	if (lastPage) {
		ds.fsdb._runtime.lastPageHit = true;
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
			ds.fsdb._addRawPost($(submissions[i]).find('a').attr('href'), lastItemCallBack);
		} else {
			ds.fsdb._addRawPost($(submissions[i]).find('a').attr('href'), standardCallBack);
		}
	}
	if (!lastPage) {
		for (var j = 0; j < (nbItems - submissions.size()); j++) {
			callback({});  // push empty missing posts
		}
	}
};

ds.fsdb._extractIsLastResultPage = function(doc) {
	var queryStats = ds.fsdb._extractQueryStats(doc);
	return parseInt(queryStats[1]) >= parseInt(queryStats[2]);
};

ds.fsdb._extractQueryStats = function(doc) {
	var rawQueryStats = $(doc).find('p.generalsectiontitle').text().replace("\n",'');
	return /.*-([0-9]+) out of ([0-9]+) match.*/.exec(rawQueryStats);
};

ds.fsdb._addRawPost = function (post, callback) {
	if (ds.fsdb._runtime.fetchDone) {
		return;
	}
	ds.fsdb._runtime.rawPosts.push({
		post: post,
		callback: callback
	});
	ds.fsdb._extractTagsForNextPost();
};

ds.fsdb._extractTagsForNextPost = function () {
	if (!ds.fsdb._runtime.extractingTags && ds.fsdb._runtime.rawPosts.length > 0) {
		var postAndCallBack = ds.fsdb._runtime.rawPosts.shift();
		var post = postAndCallBack.post;
		var callback = postAndCallBack.callback;
		ds.fsdb._extractDetails(post, function (details) {
			
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

ds.fsdb._getSingleRawField = function(doc, key) {
	return $(doc).find("table#table3 td:contains('"+key+"')").siblings('td.input').find('a').last().text();
};

ds.fsdb._getSingleRawFieldNoLink = function(doc, key) {
	return $(doc).find("table#table3 td:contains('"+key+"')").siblings('td.input').last().text();
};

ds.fsdb._getMultiRawField = function(doc, key) {
	return $(doc).find("table#table3 td:contains('"+key+"')").siblings('td.input').find('a').map(function(){
		return $(this).text();
	});
};

ds.fsdb._extractDetails = function (suitUrl, callback) {
	ds.fsdb._runtime.extractingTags = true;
	proxy.get("https://db.fursuit.me/index.php" + suitUrl, {}, function(xmlDoc){
		if (ds.fsdb._runtime.fetchDone) {
			return;
		}

		ds.fsdb._runtime.extractingTags = false;
		ds.fsdb._extractTagsForNextPost();
		console.log("extracting details for "+suitUrl);
		
		var images = $(xmlDoc).find('div#suitphotos a').map(function(){
			return $(this).attr('href');
		});
		
		if (images.size() === 0) {
			console.log("nothing to read here, skipping");
			callback({});
			return;
		}
		
		tools.shuffleArrayInPlace(images);
		var imageUrl = 'https://db.fursuit.me/' + images[0];
		
		proxy.head(imageUrl, function(status) {
			if (status !== "success" && status !== "nocontent") {
				// could not HEAD the image, happens with newly published stuff
				callback({});
				return;
			}

			var suitIdMatcher = /.*id=([0-9]+).*/.exec(suitUrl);

			var tags = {};
			tags.artist = [{
				type: 'artist',
				name: ds.fsdb._getSingleRawField(xmlDoc, 'Built by:')
			}];

			tags.species = $.map(ds.fsdb._getMultiRawField(xmlDoc, 'Species:'), function(specie){
				return specie.trim().length > 0 ? {
					type: 'species',
					name: specie
				} : null;
			});

			if (Object.keys(tags.species).length === 0) {
				delete tags.species;
			}

			tags.gender = [{
				type: 'gender',
				name: ds.fsdb._getSingleRawField(xmlDoc, 'Gender:')
			}];

			var description = ds.fsdb._getSingleRawFieldNoLink(xmlDoc, 'Description:').trim();
			if (description.length > 0 && description.length <= 50) {
				tags.description = [{
					type: 'description',
					name: description
				}];
			}

			callback({
				id: suitIdMatcher[1],
				tags: tags,
				imageUrl: imageUrl,
				postUrl: "http://db.fursuit.me/index.php" + suitUrl
			});
		});
	});
};

ds.fsdb._canineSpecies = [
	'aardwolf',
	'african wild dog',
	'akita',
	'arctic fox',
	'arctic wolf',
	'australian cattle dog',
	'australian shepherd',
	'beagle',
	'bernese mountain dog',
	'border collie',
	'canine',
	'chow chow',
	'collie',
	'corgi',
	'coyote',
	'dachshund',
	'dalmatian',
	'desert fox',
	'dhole',
	'dingo',
	'dire wolf ',
	'doberman',
	'dog',
	'ethiopian wolf',
	'fennec',
	'folf',
	'folfsky',
	'fox',
	'fudog',
	'german shepherd',
	'golden retriever ',
	'gray wolf',
	'great dane',
	'grey fox',
	'husky',
	'jackal',
	'kitsune',
	'labrador',
	'malamute',
	'maned wolf',
	'mexican wolf',
	'mutt',
	'newfoundland dog',
	'pit bull',
	'red fox',
	'red wolf',
	'rottweiler',
	'samoyed',
	'shiba inu',
	'siberian husky',
	'silver fox',
	'timber wolf',
	'werewolf',
	'wolf',
	'wolverine'
];