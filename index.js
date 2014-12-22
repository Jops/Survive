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

// game

var startPosition;

var Player = function() {};
Player.prototype = {
    position: startPosition,
    move: function(dir) {
        switch(dir) {
            case 'N': {
                
            }
            break;
            case 'E': {
                
            }
            break;
            case 'S': {
                
            }
            break;
            case 'W': {

            }
            break;
        }
    },
    hide: function(dir) {
        checkGrid(dir+position);
    },
    hidden: false,
    item: 0
};
var Zombie = function() {
    this.init();
};
Zombie.prototype = {
    init: function(x, y) {

    },
    position: {x: null, y: null},
    target: {x: null, y: null}
};

var players = [];
var zombies = [];

var Building = function() {};
Building.prototype = {
    item: 0
};
var Street = function() {};
Street.prototype = {
    exit: false
};

var cityGrid = [
    ['b','b','b','b','b'],
    ['b','s','o','s','b'],
    ['b','s','s','s','b'],
    ['b','b','s','s','b'],
    ['b','s','s','b','b'],
    ['b','s','b','s','b'],
    ['b','s','s','s','b'],
    ['b','s','b','s','b'],
    ['b','s','s','b','b'],
    ['b','b','s','s','b'],
    ['b','b','s','b','b'],
    ['b','s','s','s','b'],
    ['b','s','b','s','b'],
    ['b','s','s','s','b'],
    ['b','e','e','e','b']
];

var mainLoopInterval;

function main() {
    // main loop
    mainLoopInterval = setInterval(mainUpdate(), 50);

    // create city
    buildCity();
}

function buildCity() {
    for( var y = 0; y < cityGrid.length; y++ )
    {
        for( var x = 0; x < cityGrid[y].length; x++ )
        {
            var block = null;
            switch(cityGrid[y][x]) {
                case 'b': block = new Building();
                break;
                case 'o': {
                    block = new Street();
                    startPosition = {x: x, y: y};
                }
                break;
                case 's': block = new Street();
                break;
                case 'e': {
                    block = new Street();
                    block.exit = true;
                }
                break;
            }
            cityGrid[y][x] = block;
        }
    }
}

function checkGrid(x, y) {
    return cityGrid[y][x];
}

function checkGridDir(x, y, dir, dist) {
    switch(dir) {
        case 'N': {
            --y;
        }
        break;
        case 'E': {
            ++x;
        }
        break;
        case 'S': {
            ++y;
        }
        break;
        case 'W': {
            --x;
        }
        break;
    }
    return cityGrid[y][x];
}

function checkZombieLook(pos) {
    // check all directions by one block
    // return first hit
}

function checkPlayerLook(pos, dir) {
    // check in one direction only 2 blocks
    // return first hit
}

function noiseRegister(pos) {
    // tell all zombies to change target
}

function mainUpdate() {

}

main();
