/* global tools */

var sa = {};

sa._trimGame = function(config) {
	var trimmedConfig = JSON.parse(JSON.stringify(config));
	trimmedConfig.DS = trimmedConfig.DATASOURCE.metadata.id;
	delete trimmedConfig.DATASOURCE;
	delete trimmedConfig.session;
	return trimmedConfig;
};

sa._apiPost = function(url, data) {
	$.ajax({
		url: url, 
		data: JSON.stringify(data),
		method: 'POST',
		contentType: "application/json; charset=utf-8",
		dataType: 'json'
	});
};

sa.trackGameStart = function (config) {
	sa._apiPost('/game/' + config.gameId, sa._trimGame(config));
};

sa.trackGameFinished = function(gameId)  {
	sa._apiPost('/game/' + gameId + '/finished');
};
