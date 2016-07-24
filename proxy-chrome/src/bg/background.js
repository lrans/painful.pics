/* global chrome */

var faCookiesString;

var requestListener = function (details) {
	chrome.extension.getBackgroundPage().console.log("request listener triggered");
	details.requestHeaders.push({
		name: 'cookie',
		value: faCookiesString
	});
	return {requestHeaders: details.requestHeaders};
};

var responseListener = function (details) {
	chrome.extension.getBackgroundPage().console.log("response listener triggered");
	var rule = {
		"name": "Access-Control-Allow-Origin",
		"value": "*"
	};

	details.responseHeaders.push(rule);

	details.responseHeaders.push({"name": "Access-Control-Allow-Methods", "value": "GET, PUT, POST, DELETE, HEAD, OPTIONS"});

	return {responseHeaders: details.responseHeaders};

};

function setupListeners() {
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
	
	/*Remove Listeners*/
	chrome.webRequest.onHeadersReceived.removeListener(responseListener);
	chrome.webRequest.onBeforeSendHeaders.removeListener(requestListener);

	//chrome.browserAction.setIcon({path: "on.png"});

	/*Add Listeners*/
	chrome.webRequest.onHeadersReceived.addListener(responseListener, {
		urls: ["https://www.furaffinity.net/*"]
	}, ["blocking", "responseHeaders"]);

	chrome.webRequest.onBeforeSendHeaders.addListener(requestListener, {
		urls: ["https://www.furaffinity.net/*"]
	}, ["blocking", "requestHeaders"]);
}

chrome.webNavigation.onCompleted.addListener(function (details) {
	setupListeners();
}, {url: [
		{hostEquals: 'localhost'},
		{hostSuffix: 'painful.pics'}
	]});

chrome.runtime.onInstalled.addListener(function(){
	setupListeners();
	chrome.tabs.query({url: ['https://painful.pics/*', 'http://localhost:8000/*']}, function(tabs) {
		var scriptContent = ' var script = document.createElement(\'script\');\
			script.id = \'tmpScript\';\
			script.appendChild(document.createTextNode("proxy.availableMethods.chromeExtension = {};")); \
			(document.body || document.head || document.documentElement).appendChild(script);';
		for (var i = 0; i < tabs.length ; i++) {
			chrome.tabs.executeScript(tabs[i].id, {
				code: scriptContent
			});
		}
	});
});
