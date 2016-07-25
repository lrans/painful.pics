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

proxy.get = function(url, callback) {
	// TODO choose strategy based on proxy.availableMethods
	$.ajax(url, {
		success: function(data) {
			callback($.parseXML(tidy_html5(data, tidyOptions)));
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