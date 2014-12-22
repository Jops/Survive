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

    players.push(new Player(socket));

    socket.on('disconnect', function() {
        console.log('user disconnected');
        for( var i = 0; i < players.length; i++ ) {
            if(players[i].socket === socket) {
                players.splice(i,1);
                i--;
            }
        }
    });

    socket.on('chat message', handleMessage.bind(this, socket));
});

function handleMessage(socket, msg) {
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
}

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
var zombieCount = 10;
var zombieMoveTime = 3000;

var Player = function(client_socket) {
    this.socket = client_socket;
};
Player.prototype = {
    socket: null,
    position: startPosition,
    move: function(dir) {
        // check can move
        // return simply true/false
        var block = checkGridOnDirAndDist(this.position, dir, 1);
        if(block.type == 'building') {
            return false;
        }
        this.position.x = block.position.x;
        this.position.y = block.position.y;
        return true;
    },
    hide: function(dir) {
        var block = checkGridOnDirAndDist(this.position, dir, 1);
        if(block.type != 'building') {
            return false;
        }
        this.position.x = block.position.x;
        this.position.y = block.position.y;
        return true;
    },
    look: function(dir) {
        return playerLook(this.position, dir);
    },
    status: function() {
        return {
            position: this.position,
            location: checkGrid(this.position).type,
            item: this.item,
            active: this.active
        };
    },
    inventory: function(dir) {
        return this.item;
    },
    carry: function() {
        this.item = takeGridItem(this.position);
    },
    item: 0,
    active: true
};
var Zombie = function() {
    this.position.x = Math.floor(Math.random() * 5);
    this.position.x = Math.floor((Math.random() * 12) + 2);
};
Zombie.prototype = {
    position: {x: null, y: null},
    target: {x: null, y: null},
    active: true
};
var players = [];
var zombies = [];

var Building = function() {};
Building.prototype = {
    type: 'building',
    item: 0
};
var Street = function() {};
Street.prototype = {
    type: 'street',
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
    mainLoopInterval = setInterval(zombieMove.bind(this), zombieMoveTime);

    // create city
    buildCity();

    // spawn zombies
    spawnZombies();
}

function buildCity() {
    for( var y = 0; y < cityGrid.length; y++ ) {
        for( var x = 0; x < cityGrid[y].length; x++ ) {
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

function spawnZombies() {
    for( var i = 0; i < zombieCount; i++ ) {
        zombies.push(new Zombie());
    }
}

function checkGrid(pos) {
    return cityGrid[pos.y][pos.x];
}

function checkGridOnDirAndDist(pos, dir, dist) {
    posOnDirAndDist(pos);
    return checkGrid(pos);
}

function posOnDirAndDist(pos, dir, dist) {
    var disp;
    switch(dir) {
        case 'N': {
            disp = -1*dist;
            pos.y += disp;
        }
        break;
        case 'E': {
            disp = dist;
            pos.x += disp;
        }
        break;
        case 'S': {
            disp = dist;
            pos.y += disp;
        }
        break;
        case 'W': {
            disp = -1*dist;
            pos.x += disp;
        }
        break;
    }
    return pos;
}

function checkGridItem(pos) {
    return checkGrid(pos).item;
}

function takeGridItem(pos) {
    var block = checkGrid(pos);
    var item = block.item;
    block.item = 0;
    return item;
}

function playerLook(pos, dir) {
    var zombie = lookForZombies(pos, dir);
    var blocks = checkPlayerLook(pos, dir);
    return {
        zombies: zombie,
        grid: blocks
    };
}

function lookForZombies(pos, dir) {
    // return the first zombie spotted at position
    posOnDirAndDist(pos, dir, 1);
    if(checkForZombieAt(pos)) {
        return true;
    } else {
        posOnDirAndDist(pos, dir, 1);
        if(checkForZombieAt(pos)) {
            return true;
        }
    }
    return false;
}

function checkForZombieAt(pos) {
    for( var i = 0; i < zombies.length; i++ ) {
        if( zombies[i].position.x == pos.x &&
            zombies[i].position.y == pos.y ) {
            return true;
        }
    }
}

function checkPlayerLook(pos, dir) {
    // check in one direction only 2 blocks
    // return first hit if building
    var block = checkGridOnDirAndDist(pos, dir, 1);
    var blocks = [block];
    if(block.type == 'building') {
        return blocks;
    }
    block = checkGridOnDirAndDist(pos, dir, 1);
    this.blocks.push(block);
    return blocks;
}

function noiseRegister(pos) {
    // tell all zombies to change target
    for( var i = 0; i < zombies.length; i++ ) {
        zombies[i].target = pos;
    }
}

function checkZombieLook(pos) {
    // check all directions by one block
    // return first hit
}

function zombieMove() {

}

main();
