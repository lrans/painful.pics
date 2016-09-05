var proxy = proxy || {};

proxy.availableMethods = {};

var tidyOptions = {
	'output-xml': 'yes',
	'add-xml-decl' : 'yes',
	'numeric-entities' : 'yes',
	'doctype': 'omit',
	'quiet': 'yes',
	'show-warnings': 'no'
};

proxy.get = function(url, data, callback) {
	// TODO choose strategy based on proxy.availableMethods
	$.ajax({
		url: url,
		method: 'GET',
		data: data,
		success: function(data) {
			callback($.parseXML(tidy_html5(data, tidyOptions)));
		}
	});
};

proxy.checkGet = function(url, callback) {
	// TODO choose strategy based on proxy.availableMethods
	$.ajax({
		url: url,
		method: 'GET',
		complete: function(jqXhr, status) {
			callback(status);
		}
	});
};

proxy.head = function(url, callback) {
	// TODO choose strategy based on proxy.availableMethods
	$.ajax({
		url: url,
		method: 'HEAD',
		complete: function(jqXhr, status) {
			callback(status);
		}
	});
};

proxy.post = function(url, data, callback) {
	// TODO choose strategy based on proxy.availableMethods
	$.ajax({
		url: url,
		method: 'POST',
		data: data,
		success: function(data) {
			callback($.parseXML(tidy_html5(data, tidyOptions)));
		}
	});
};

proxy.isProxyAvailable = function() {
	return typeof proxy.availableMethods.chromeExtension !== 'undefined';
};

proxy.checkAvailability = function(siteName) {
	if (typeof chrome === 'undefined' || typeof chrome.webstore === 'undefined') {
		return {
			status: 'error',
			message: 'Unfortunately, ' + siteName + ' compatibility is enabled on chrome/chromium only for now, sorry about that :('
		};
	} else {
		if (proxy.isProxyAvailable()) {
			return {
				status: 'ok',
				message: siteName + ' is available'
			};
		} else {
			return {
				status: 'warning',
				message: 'Retrieving data on ' + siteName + ' requires to install the painful.pics proxy extension, please click here to do so'
			};
		}
	}
};
