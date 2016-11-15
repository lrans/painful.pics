/* global tools, ds */

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

sa._apiGet = function(url, data, response) {
	$.ajax({
		url: url, 
		data: data,
		method: 'GET',
		dataType: 'json',
		success: response
	});
};

sa.trackGameStart = function (config) {
	sa._apiPost('/api/game/' + config.gameId, sa._trimGame(config));
};

sa.trackGameFinished = function(gameId)  {
	sa._apiPost('/api/game/' + gameId + '/finished');
};

sa.themeCompletion = function(release) {
	sa._apiGet('/api/theme/search', {
		query : this.value,
		ds: tools.getAvailableDatasource()
	}, function(response) {
		release($.map(response, function(theme) {
			return {
				id: theme._id,
				title: theme.title,
				datasource: ds[theme.config.DS].metadata.label,
				playCount: theme.playCount,
				description: ds[theme.config.DS].describe(theme.config)
			};
		}));
	});
};

sa.getTheme = function(themeId, callback) {
	sa._apiGet('/api/theme/' + themeId, {}, callback);
};

sa.getRandomTheme = function(callback) {
	sa._apiGet('/api/randomtheme', {}, function(themes) {
		callback(themes[0]);
	});
};

sa.saveTheme = function(gameId, label) {
	sa._apiPost('/api/theme/' + gameId, {
		label: label
	});
};