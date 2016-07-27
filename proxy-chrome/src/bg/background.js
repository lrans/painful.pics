/* global chrome */

var faCookiesString;
var painfulPicsTabIDs = [];

function removeHeader(headers, name) {
	for (var i = headers.length - 1; i >= 0; i--) {
		if (headers[i].name.toLowerCase() === name.toLowerCase()) {
			headers.splice(i, 1);
			break;
		}
	}
}

/**
 * Adds FA cookies to relevant requests.
 */
var requestListener = function (details) {
	if (painfulPicsTabIDs.indexOf(details.tabId) > -1) {
		chrome.extension.getBackgroundPage().console.log("request listener triggered");
		details.requestHeaders.push({
			name: 'cookie',
			value: faCookiesString
		});
		removeHeader(details.requestHeaders, 'origin');
		removeHeader(details.requestHeaders, 'referer');
		return {requestHeaders: details.requestHeaders};
	} else {
		return {};
	}
};

/**
 * Adds CORS headers to responses.
 */
var responseListener = function (details) {
	if (painfulPicsTabIDs.indexOf(details.tabId) > -1) {
		chrome.extension.getBackgroundPage().console.log("response listener triggered");
		var rule = {
			"name": "Access-Control-Allow-Origin",
			"value": "*"
		};

		details.responseHeaders.push(rule);

		details.responseHeaders.push({"name": "Access-Control-Allow-Methods", "value": "GET, PUT, POST, DELETE, HEAD, OPTIONS"});

		return {responseHeaders: details.responseHeaders};
	} else {
		return {};
	}
};

/**
 * Grabs FA cookies.
 */
function refreshFACookies() {
	chrome.cookies.getAll({
		url: "https://www.furaffinity.net/"
	}, function (cookies) {
		faCookiesString = "";
		for (var i = 0; i < cookies.length; i++) {
			faCookiesString += cookies[i].name + '=' + cookies[i].value;
			if (i + 1 < cookies.length) {
				faCookiesString += '; ';
			}
		}
	});
}

function setupListeners() {
	refreshFACookies();
	
	/*Remove Listeners*/
	chrome.webRequest.onHeadersReceived.removeListener(responseListener);
	chrome.webRequest.onBeforeSendHeaders.removeListener(requestListener);

	//chrome.browserAction.setIcon({path: "on.png"});

	/*Add Listeners*/
	chrome.webRequest.onHeadersReceived.addListener(responseListener, {
		urls: ["https://www.furaffinity.net/*", "https://*.facdn.net/*"]
	}, ["blocking", "responseHeaders"]);

	chrome.webRequest.onBeforeSendHeaders.addListener(requestListener, {
		urls: ["https://www.furaffinity.net/*", "https://*.facdn.net/*"]
	}, ["blocking", "requestHeaders"]);
}

/**
 * Store tab ID on painful.pics sites.
 */
chrome.webNavigation.onCompleted.addListener(function (details) {
	painfulPicsTabIDs.push(details.tabId);
	setupListeners();
}, {url: [
		{hostEquals: 'localhost'},
		{hostSuffix: 'painful.pics'}
	]});

/**
 * Detects FA cookies changes (login in another tab for ex.)
 */
chrome.cookies.onChanged.addListener(function(changeInfo) {
	if (changeInfo.cookie.domain.indexOf('furaffinity.net') > -1) {
		refreshFACookies();
	}
});

/**
 * Track tab ID opened on painful.pics sites.
 */
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
	var index = painfulPicsTabIDs.indexOf(tabId);
	if (index > -1) {
		painfulPicsTabIDs.splice(index, 1);
	}
});

/**
 * Track tab ID opened on painful.pics sites.
 */
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	var index = painfulPicsTabIDs.indexOf(tabId);
	if (index > -1 && (typeof tab.url ==='undefined' || (tab.url.indexOf('localhost:8000') < 0 && tab.url.indexOf('painful.pics') < 0))) {
		painfulPicsTabIDs.splice(index, 1);
	}
});

/**
 * Used on first-time installation/run.
 */
chrome.runtime.onInstalled.addListener(function(){
	setupListeners();
	chrome.tabs.query({url: ['https://painful.pics/*', 'http://localhost:8000/*']}, function(tabs) {
		var scriptContent = ' var script = document.createElement(\'script\');\
			script.id = \'tmpScript\';\
			script.appendChild(document.createTextNode("proxy.availableMethods.chromeExtension = {};")); \
			(document.body || document.head || document.documentElement).appendChild(script);';
		for (var i = 0; i < tabs.length ; i++) {
			painfulPicsTabIDs.push(tabs[i].id);
			chrome.tabs.executeScript(tabs[i].id, {
				code: scriptContent
			});
		}
	});
});
