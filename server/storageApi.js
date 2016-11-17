module.exports = {
	init: function (app) {
		var bodyParser = require('body-parser');
		var geoip = require('geoip-country');
		var hash = require('object-hash');
		var validate = require('jsonschema').validate;

		const db = require('monk')('localhost/painful_pics');
		const games = db.get('game');

		games.index({"$**": "text"}, {name: "full-text-index"});

		app.enable('trust proxy');
		app.use(bodyParser.json());

		function getLocation(ip) {
			try {
				return geoip.lookup(ip).country;
			} catch (exception) {
				return "";
			}
		}

		function validateGameConfig(data) {
			var result = validate(data, {
				"$schema": "http://json-schema.org/draft-04/schema#",
				"type": "object",
				"properties": {
					"NB_QUIZZ_ITEMS": {
						"type": "string",
						"pattern": /[0-9]+/
					},
					"NB_ANSWERS_PER_ITEM": {
						"type": "string",
						"pattern": /[0-9]+/
					},
					"MODE": {
						"type": "string",
						"pattern": /[a-z]+/
					},
					"TIMER": {
						"type": "string",
						"pattern": /[0-9]+/
					},
					"TARGET_TAGS_TYPES": {
						"type": "string",
						"pattern": /[a-z]+/
					},
					"QUERY": {
						"type": "object",
						"patternProperties": {
							"[a-z]+": {
								"type": "string",
								"pattern": /[a-z0-9-_:]*/i
							}
						}
					},
					"gameId": {
						"type": "string",
						"pattern": /[a-z0-9-]+/
					},
					"DS": {
						"type": "string",
						"pattern": /[a-z]+/
					}
				},
				"additionalProperties": false,
				"required": [
					"NB_QUIZZ_ITEMS",
					"NB_ANSWERS_PER_ITEM",
					"MODE",
					"TIMER",
					"TARGET_TAGS_TYPES",
					"QUERY",
					"gameId",
					"DS"
				]
			});
			if (!result.valid) {
				throw new Error("Invalid game config");
			}
			return data;
		}
		
		function computeHash(config) {
			var configCopy = JSON.parse(JSON.stringify(config));
			delete configCopy.NB_QUIZZ_ITEMS;
			delete configCopy.MODE;
			delete configCopy.gameId;
			
			return hash(configCopy, {unorderedArrays: true, unorderedSets: true});
		}

		app.post('/api/game/:gameId', function (req, res) {
			var config = validateGameConfig(req.body);
			games.insert({
				id: req.params.gameId,
				location: getLocation(req.ip),
				state: 'started',
				config: config,
				hash: computeHash(config)
			});
			res.status(201).send();
		});

		function updatePlayCount(gameHash) {
			games.aggregate([
				{
					$match: {
						hash: { $eq: gameHash }
					}
				},
				{
					$group: {
						_id: '$hash',
						playCount: {
							$sum: { $cond: { if: { $eq: [ '$state', 'finished' ] }, then: 1, else: 0 } }
						}
					}
				}
			]).then((res) => {
				games.update({
					hash: res[0]._id
				}, {
					$set: {playCount: res[0].playCount}
				}, {
					w: 1,
					multi: true
				});
			});
		}

		app.post('/api/game/:gameId/finished', function (req, res) {
			games.findOne({
				id: req.params.gameId
			}).then((game) => {
				game.state = 'finished';
				games.update({
					id: req.params.gameId
				}, game).then(() => {
					updatePlayCount(game.hash);
				});
			});
			res.status(204).send();
		});

		app.post('/api/theme/:gameId', function (req, res) {
			var title = req.body.label;
			games.findOne({
				id: req.params.gameId
			}).then((game) => {
				game.title = title;
				games.update({
					id: req.params.gameId
				}, game);
			});
			res.status(204).send();
		});

		app.get('/api/theme/search', function(req, res) {
			var query = req.query.query;
			var ds = req.query.ds;
			console.log('theme search:' + query + ', ds:' + ds);
			games.aggregate([
				{
					$match: {
						'$text': {
							'$search': query
						}
					}
				},
				{
					$match: {
						'config.DS': { $in: ds }
					}
				},
				{
					$group: {
						_id: '$hash',
						title: {
							$addToSet: '$title'
						},
						datasource: {
							$first: '$config.DS'
						},
						config: {
							$first: '$config'
						},
						playCount: {
							$first: '$playCount'
						}
					}
				},
				{
					$sort: {
						score: {
							$meta: "textScore" 
						},
						playCount: -1 
					}
				}
			]).then((themes) => {
				res.write('[');
				for(var i = 0; i < themes.length; i++) {
					if (i > 0) {
						res.write(',');
					}
					var theme = themes[i];
					res.write(JSON.stringify({
						title: theme.title,
						playCount: theme.playCount,
						config: {
							NB_ANSWERS_PER_ITEM: theme.config.NB_ANSWERS_PER_ITEM,
							TIMER: theme.config.TIMER,
							TARGET_TAGS_TYPES: theme.config.TARGET_TAGS_TYPES,
							QUERY: theme.config.QUERY,
							DS: theme.config.DS
						}
					}));
				}
				res.write(']');
			}).then(() => {
				res.end();
			});
		});

		app.get('/api/theme/:themeHash', function(req, res) {
			games.findOne({
				hash: req.params.themeHash
			}).then((theme) => {
				res.write(JSON.stringify(theme));
				res.end();
			});
		});
		
		app.get('/api/randomtheme', function(req, res) {
			games.aggregate([
				{
					$group: {
						_id: '$hash',
						title: {
							$addToSet: '$title'
						},
						config: {
							$first: '$config'
						},
						playCount: {
							$sum: { $cond: { if: { $eq: [ '$state', 'finished' ] }, then: 1, else: 0 } }
						}
					}
				},
				{
					$sort: {
						playCount: -1
					}
				},
				{
					$limit: 10
				},
				{
					$sample: { size: 1 }
				}
			]).then((theme) => {
				res.write(JSON.stringify(theme));
				res.end();
			});
		});

		app.use(function (err, req, res, next) {
			res.status(400).send(err.message);
		});
	}
};