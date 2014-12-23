var app = require('express')(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    path = require('path'),
    express = require('express'),
    sanitizeHtml = require('sanitize-html');

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.use(
    '/public',
    express.static(path.resolve(__dirname + '/public'))
);

io.on('connection', function(socket) {
    console.log('a user connected');

    var player = new Player(socket);
    players.push(player);

    socket.on('disconnect', function() {
        console.log('user disconnected');
        for( var i = 0; i < players.length; i++ ) {
            if(players[i].socket === socket) {
                players.splice(i,1);
                i--;
            }
        }
    });

    socket.on('chat message', handleMessage.bind(this, player));

    socket.on('last command', getLastCommand.bind(this, player));
});

function handleMessage(player, msg) {
    console.log('message: ' + msg);
    msg = sanitizeHtml(msg, { allowedTags: [] });

    var gameStatus = play(player, msg);

    io.emit('chat message', outputStatus(gameStatus, msg));
}

http.listen(3000, function() {
    console.log('listening on *:3000');
});

function getLastCommand(player) {
    io.emit('last command', player.lastCommand);
}

function play(player, command) {
    var gameStatuses = [];

    player.lastCommand = command;

    command = parseCommand(command);

    if(!player.active)
        return ['You didn\'t move fast enough. You were eaten by a zombie.'];

    switch(command.action){
        case 'MOVE':
            var moved = player.move(command.params[0]);
            gameStatuses.push(moved ? 'You moved succesfully.' : 'There doesn\'t seem to be a street in that direction, you can\'t move there.');
            break;
        case 'HIDE':
            if(player.hidden) {
                gameStatuses.push('You are already hidden.');
            } else {
                var hidden = player.hide(command.params[0]);
                gameStatuses.push(hidden ? 'You are now hidden inside a building.' : 'You cannot hide in that direction.');
            }
            break;
        case 'LOOK':
        case 'WATCH':
            var surroundings = player.look(command.params[0]);
            gameStatuses.push(
                surroundings.zombie ? 'ZOMBIES!!' : 'You don\'t see any zombies.',
                surroundings.grid.length == 2 && surroundings.grid[1].type !== 'building' ? 'You only see streets ahead.' : 'You can see a building ' + surroundings.grid.length + ' blocks away.'
            );
            break;
        case 'STATUS':
            var status = player.status();
            gameStatuses.push(
                'You are standing on block [' + status.position.x + ', ' + status.position.y + '].',
                'You are in a ' + status.location + '.'
            );
            break;
        default:
            gameStatuses.push('Unknown command. Type \'help\' for a list of available commands.');
            break;
    }

    return gameStatuses;
}

function parseCommand(command) {
    var action = '',
        params = [];

    command = command.replace(/\s/gi, '');

    action = /[a-z]*/i.exec(command)[0].toUpperCase();

    params = /\(([^)]+)\)/.exec(command);
    params = params ? params[1].split(',') : null;

    return {
        action: action,
        params: params
    };
}

function outputStatus(gameStatus, msg) {
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
    this.position.x = startPosition.x;
    this.position.y = startPosition.y;
};
Player.prototype = {
    socket: null,
    position: {x: null, y: null},
    lastCommand: null,
    move: function(dir) {
        // check can move
        // return simply true/false
        var block = checkGridOnDirAndDist(  {x: this.position.x, y: this.position.y},
                                            dir,
                                            1);
        if(block.type == 'building') {
            return false;
        }
        this.position.x = block.position.x;
        this.position.y = block.position.y;
        return true;
    },
    hide: function(dir) {
        if(this.hidden) return false;
        var block = checkGridOnDirAndDist(  {x: this.position.x, y: this.position.y},
                                            dir,
                                            1);
        if(block.type != 'building') {
            return false;
        }
        this.hidden = true;
        this.position.x = block.position.x;
        this.position.y = block.position.y;
        return true;
    },
    look: function(dir) {
        return playerLook(this.position.x, this.position.y, dir);
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
        this.item = takeGridItem({x: this.position.x, y: this.position.y});
    },
    hidden: false,
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

var Building = function(x, y) {
    this.position = {x: x, y: y};
};
Building.prototype = {
    position: {x: null, y: null},
    type: 'building',
    item: 0
};
var Street = function(x, y) {
    this.position = {x: x, y: y};
};
Street.prototype = {
    position: {x: null, y: null},
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
                case 'b': block = new Building(x, y);
                break;
                case 'o': {
                    block = new Street(x, y);
                    startPosition = {x: x, y: y};
                }
                break;
                case 's': block = new Street(x, y);
                break;
                case 'e': {
                    block = new Street(x, y);
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
    posOnDirAndDist(pos, dir, dist);
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

function playerLook(posX, posY, dir) {
    var zombie = lookForZombies(posX, posY, dir);
    var blocks = checkPlayerLook(posX, posY, dir);
    return {
        zombie: zombie,
        grid: blocks
    };
}

function lookForZombies(posX, posY, dir) {
    // return the first zombie spotted at position
    var pos = {x: posX, y: posY};
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

function checkPlayerLook(posX, posY, dir) {
    // check in one direction only 2 blocks
    // return first hit if building
    var pos = {x: posX, y: posY};
    var block = checkGridOnDirAndDist(pos, dir, 1);
    var blocks = [block];
    if(block.type == 'building') {
        return blocks;
    }
    block = checkGridOnDirAndDist(pos, dir, 1);
    blocks.push(block);
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
