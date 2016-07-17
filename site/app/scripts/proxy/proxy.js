var proxy = proxy || {};

proxy.availableMethods = {};

proxy.getDocument = function(url, callback) {
	// TODO choose strategy based on proxy.availableMethods
	$.ajax(url, {
		success: function(data) {
			callback($.parseHTML(data))
		}
	});
};