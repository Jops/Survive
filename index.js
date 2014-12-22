var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var express = require('express');
var sanitizeHtml = require('sanitize-html');

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.use(
    '/public',
    express.static(path.resolve(__dirname + '/public'))
);

io.on('connection', function(socket) {
    console.log('a user connected');
    socket.on('disconnect', function() {
        console.log('user disconnected');
    });
    socket.on('chat message', function(msg) {
        console.log('message: ' + msg);
        msg = processMessage(
            sanitizeHtml(
                msg,
                {
                    allowedTags: []
                }
            )
        );
        io.emit('chat message', msg);
    });
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});

function processMessage(msg) {
    var gameStatus = play(msg);

    msg = '<span class="player-command">' + msg + '</span>';
    msg += '<ul class="game-status">';

    for (var i = 0; i < gameStatus.length; i++) {
        msg += '<li>' + gameStatus[i] + '</li>';
    }

    msg += '</ul>';
    return msg;
}
