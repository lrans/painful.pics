#!/usr/bin/node

var app = require('express')();
var http = require('http').Server(app);

var relayServer = require('./relayServer');
var storageApi = require('./storageApi');


relayServer.init(http);
storageApi.init(app);

http.listen(3000, function(){
    console.log('listening on *:3000');
});
