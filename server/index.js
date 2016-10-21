#!/usr/bin/node

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var relayServer = require('./relayServer');
var storageApi = require('./storageApi');

io.on('connection', relayServer.relay);

storageApi.init(app);

http.listen(3000, function(){
    console.log('listening on *:3000');
});
