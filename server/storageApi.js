module.exports = {
	init: function (app) {
		var bodyParser = require('body-parser');
		var geoip = require('geoip-country');
		var validate = require('jsonschema').validate;

		const db = require('monk')('localhost/painful_pics');
		const games = db.get('game');

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
								"pattern": /[a-z0-9-_:]+/i
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

		app.post('/game/:gameId', function (req, res) {
			var config = validateGameConfig(req.body);
			games.insert({
				id: req.params.gameId,
				location: getLocation(req.ip),
				state: 'started',
				config: config
			});
			res.status(201).send();
		});

		app.post('/game/:gameId/finished', function (req, res) {
			games.findOne({
				id: req.params.gameId
			}).then((game) => {
				game.state = 'finished';
				games.update({
					id: req.params.gameId
				}, game);
			});
			res.status(204).send();
		});

		app.use(function (err, req, res, next) {
			res.status(400).send(err.message);
		});
	}
};