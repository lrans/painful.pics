chrome.extension.sendMessage({}, function (response) {
	var readyStateCheckInterval = setInterval(function () {
		if (document.readyState === "complete") {
			clearInterval(readyStateCheckInterval);
			var scriptContent = 'if (typeof proxy !== "undefined") { proxy.availableMethods.chromeExtension = { id: "' + chrome.runtime.id + '" }; }';
			var script = document.createElement('script');
			script.id = 'tmpScript';
			script.appendChild(document.createTextNode(scriptContent));
			(document.body || document.head || document.documentElement).appendChild(script);
			
			document.getElementById('tmpScript').remove();
		}
	}, 10);
});