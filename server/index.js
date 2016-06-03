#!/usr/bin/node

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

/*app.get('/', function(req, res){
    res.send('<h1>Hello world</h1>');
});*/

io.on('connection', function(socket){
    console.log('new socket connection');
    socket.on('server joined', function(msg){
        var session = msg.session;
        console.log('server joined for session : '+session);
        socket.join(msg.session);
        socket.on('scores', function(msg) {
            console.log('updating scores for session : '+session);
            io.to(session).emit('scores', msg);
        });
        socket.on('disconnect', function() {
            console.log('server left session : '+msg.session);
            io.to(msg.session).emit('server left');
        });
    });
    socket.on('player joined', function(msg){
        console.log('player joined for session : '+msg.session);
        socket.join(msg.session, function() {
            io.to(msg.session).emit('player joined', msg);
        });
        socket.on('disconnect', function() {
            console.log('player left for session : '+msg.session);
            io.to(msg.session).emit('player left', {handle : msg.player.handle});
        });
    });
});

http.listen(3000, function(){
    console.log('listening on *:3000');
});
