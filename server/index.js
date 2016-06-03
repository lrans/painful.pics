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
        socket.join(session);
        socket.on('scores', function(msg) {
            console.log('updating scores for session : '+session);
            io.to(session).emit('scores', msg);
        });
        socket.on('new question', function(msg) {
            console.log('new question for session : '+session);
            io.to(session).emit('new question', msg);
        });
        socket.on('disconnect', function() {
            console.log('server left session : '+session);
            io.to(session).emit('server left');
        });
    });
    socket.on('player joined', function(msg){
        var session = msg.session;
        console.log('player joined for session : '+session);
        socket.join(session, function() {
            io.to(session).emit('player joined', msg);
        });
        socket.on('new answer', function(msg) {
            console.log('new answer for session : '+session);
            io.to(session).emit('new answer', msg);
        });
        socket.on('disconnect', function() {
            console.log('player left for session : '+session);
            io.to(session).emit('player left', {handle : msg.player.handle});
        });
    });
});

http.listen(3000, function(){
    console.log('listening on *:3000');
});
