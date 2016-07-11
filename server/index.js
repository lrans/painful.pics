#!/usr/bin/node

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

io.on('connection', function(socket){
    console.log('new socket connection');
    socket.on('server joined', function(msg){
        var session = msg.session;
        console.log('server joined for session : '+session);
        socket.join(session);
		
		socket.on('show lobby', function(msg) {
			console.log('srv -> cli show lobby for session : '+session);
			io.to(session).emit('show lobby', msg);
		});
		
		socket.on('message', function(msg) {
			console.log('srv -> cli message for session : '+session);
			io.to(session).emit('message', msg);
		});
		
		socket.on('question', function(msg) {
			console.log('srv -> cli question for session : '+session);
			io.to(session).emit('question', msg);
		});
		
		socket.on('show scores', function(msg) {
			console.log('srv -> cli show scores for session : '+session);
			io.to(session).emit('show scores', msg);
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

		socket.on('launch game', function(msg) {
			console.log('cli -> srv launch game for session : '+session);
			io.to(session).emit('launch game', msg);
		});
		
		socket.on('answer', function(msg) {
			console.log('cli -> srv answer for session : '+session);
			io.to(session).emit('answer', msg);
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
