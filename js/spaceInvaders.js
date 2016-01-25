$('document').ready(function(){
  var canvas = document.getElementById('gameCanvas');
  canvas.width = 800;
  canvas.height = 600;

  var game = new Game();
  game.initiailize(canvas);
  game.start();

  window.addEventListener("keydown", function keydown(e) {
    var keycode = e.which || window.event.keycode;

    if(keycode == 37 || keycode == 39 || keycode == 32) {
        e.preventDefault();
    };
    game.keyDown(keycode);
  });

  window.addEventListener("keyup", function keydown(e) {
    var keycode = e.which || window.event.keycode;
    game.keyUp(keycode);
});
});


function Game() {

  this.config = {
    bombRate: 0.05,
    bombMinVelocity: 50,
    bombMaxVelocity: 50,
    invaderInitialVelocity: 25,
    invaderAcceleration: 0,
    invaderDropDistance: 20,
    rocketVelocity: 120,
    rocketMaxFireRate: 2,
    gameWidth: 400,
    gameHeight: 300,
    fps: 50,
    debugMode: false,
    invaderRanks: 5,
    invaderFiles: 10,
    shipSpeed: 120,
    levelDifficultyMultiplier: 0.2,
    pointsPerInvader: 5
  };

  this.level = 1
  this.lives = 3
  this.width = 0
  this.height = 0
  this.gameBound = {left: 0, top: 0, right: 0, bottom: 0};

  this.stateStack = [];

  this.pressedKeys = {};
  this.gameCanvas = null;
};

Game.prototype.initiailize = function(gameCanvas){
  this.gameCanvas = gameCanvas;

  this.width = gameCanvas.width;
  this.height = gameCanvas.height;

  this.gameBounds = {
    left: gameCanvas.width / 2 - this.config.gameWidth / 2,
    right: gameCanvas.width / 2 + this.config.gameWidth / 2,
    top: gameCanvas.height / 2 - this.config.gameHeight / 2,
    bottom: gameCanvas.height / 2 + this.config.gameHeight / 2

  };
};

Game.prototype.start = function() {
  var welcome = new WelcomeState();
  this.moveToState(welcome);

  this.lives = 3;
  this.config.debugMode = /debug=true/.test(window.location.href);

  var game = this;
  this.intervalID = setInterval(
    function(){ gameLoop(game);},
    1000 / this.config.fps
    );
};


Game.prototype.currentState = function() {
  return this.stateStack.length > 0 ? this.stateStack[this.stateStack.length - 1] : null;
};

Game.prototype.moveToState = function(state){
  if(this.currentState()) {
    if (this.currentState().leave) {
      this.currentState().leaveGame();
    };
  };

  if(state.enter) {
    debugger;
    state.enter(this);
  }

  this.stateStack.push(state);
};

Game.prototype.pushState = function(state){
  if(state.enter){
    state.enter(game);
  };
  this.stateStack.push(state);
};

Game.prototype.popState = function(){
  if(this.currentState()){
     if (this.currentState().leave) {
      this.currentState().leaveGame();
    };
  };

  this.stateStack.pop();

};

Game.prototype.keyDown = function(keyCode){
  this.pressedKeys[keyCode] = true;
  if(this.currentState() && this.currentState().keyDown){
    this.currentState().keyDown(this, keyCode);
  };
};

Game.prototype.keyUp = function(keyCode){
  delete this.pressedKeys[keyCode];
  if(this.currentState() && this.currentState().keyUp){
    this.currentState().keyUp(this, keyCode);
  };
};

function gameLoop(game) {

  var currentState = game.currentState();
  if(currentState){
    var dt = 1 / game.config.fps;
    var context = game.gameCanvas.getContext("2d");


    if(currentState.update) {
      currentState.update(game, dt);
    };

    if(currentState.draw){
      currentState.draw(game, dt, context);
    };
  };
};

function WelcomeState(){
};

WelcomeState.prototype.draw = function(game, dt, context) {
  context.clearRect(0, 0, game.width, game.height);

  context.font="30px Arial";
  context.fillStyle = '#ffffff';
  context.textBaseline="center";
  context.textAlign="center";
  context.fillText("Space Invaders", game.width / 2, game.height/2 - 40);
  context.font="16px Arial";

  context.fillText("Press 'Space' to start.", game.width / 2, game.height/2);
};

WelcomeState.prototype.keyDown = function(game, keyCode) {

  if(keyCode == 32){
    game.moveToState(new LevelIntroState(game.level));
  }
}

function LevelIntroState(level){
  this.level = level;
  this.countdownMessage = "3";
};

LevelIntroState.prototype.draw = function(game, dt, context){
    context.clearRect(0, 0, game.width, game.height);

    context.font="36px Arial";
    context.fillStyle = '#ffffff';
    context.textBaseline="middle";
    context.textAlign="center";
    context.fillText("Level " + this.level, game.width / 2, game.height/2);
    context.font="24px Arial";
    context.fillText("Ready in " + this.countdownMessage, game.width / 2, game.height/2 + 36);
};

LevelIntroState.prototype.update = function(game, dt) {

    if(this.countdown === undefined) {
        this.countdown = 3;
    }
    this.countdown -= dt;

    if(this.countdown < 2) {
        this.countdownMessage = "2";
    }
    if(this.countdown < 1) {
        this.countdownMessage = "1";
    }
    if(this.countdown <= 0) {
        game.moveToState(new PlayState(game.config, this.level));
    }

};

function PlayState(config, level) {
    this.config = config;
    this.level = level;

    this.invaderCurrentVelocity =  10;
    this.invaderCurrentDropDistance =  0;
    this.invadersAreDropping =  false;
    this.lastRocketTime = null;

    this.ship = null;
    this.invaders = [];
    this.rockets = [];
    this.bombs = [];
};

PlayState.prototype.enter = function(game) {

  //  Create the ship.
  this.ship = new Ship(game.width / 2, game.gameBounds.bottom);

  var levelMultiplier = this.level * this.config.levelDifficultyMultiplier;
  this.shipSpeed = this.config.shipSpeed;
  this.invaderInitialVelocity = this.config.invaderInitialVelocity + (levelMultiplier * this.config.invaderInitialVelocity);
  this.bombRate = this.config.bombRate + (levelMultiplier * this.config.bombRate);
  this.bombMinVelocity = this.config.bombMinVelocity + (levelMultiplier * this.config.bombMinVelocity);
  this.bombMaxVelocity = this.config.bombMaxVelocity + (levelMultiplier * this.config.bombMaxVelocity);

  var ranks = this.config.invaderRanks;
  var files = this.config.invaderFiles;
  var invaders = [];
  for(var rank = 0; rank < ranks; rank++){
      for(var file = 0; file < files; file++) {
          invaders.push(new Invader(
              (game.width / 2) + ((files/2 - file) * 200 / files),
              (game.gameBounds.top + rank * 20),
              rank, file, 'Invader'));
      }
  }
  this.invaders = invaders;
  this.invaderCurrentVelocity = this.invaderInitialVelocity;
  this.invaderVelocity = {x: -this.invaderInitialVelocity, y:0};
  this.invaderNextVelocity = null;
};

PlayState.prototype.update = function(game, dt){
   if(game.pressedKeys[37]) {
        this.ship.x -= this.shipSpeed * dt;
    }
    if(game.pressedKeys[39]) {
        this.ship.x += this.shipSpeed * dt;
    }
    if(game.pressedKeys[32]) {
        this.fireRocket();
    }

    if(this.ship.x < game.gameBounds.left) {
        this.ship.x = game.gameBounds.left;
    }
    if(this.ship.x > game.gameBounds.right) {
        this.ship.x = game.gameBounds.right;
    }

   for(var i=0; i<this.bombs.length; i++) {
      var bomb = this.bombs[i];
      bomb.y += dt * bomb.velocity;

      //  If the bomb has gone off the screen remove it.
      if(bomb.y > this.height) {
          this.bombs.splice(i--, 1);
      }
    }

    //  Move each rocket.
    for(i=0; i<this.rockets.length; i++) {
        var rocket = this.rockets[i];
        rocket.y -= dt * rocket.velocity;

        //  If the rocket has gone off the screen remove it.
        if(rocket.y < 0) {
            this.rockets.splice(i--, 1);
        }
    }

    var hitLeft = false, hitRight = false, hitBottom = false;
    for(i=0; i<this.invaders.length; i++) {
        var invader = this.invaders[i];
        var newx = invader.x + this.invaderVelocity.x * dt;
        var newy = invader.y + this.invaderVelocity.y * dt;
        if(hitLeft === false && newx < game.gameBounds.left) {
            hitLeft = true;
        }
        else if(hitRight === false && newx > game.gameBounds.right) {
            hitRight = true;
        }
        else if(hitBottom === false && newy > game.gameBounds.bottom) {
            hitBottom = true;
        }

        if(!hitLeft && !hitRight && !hitBottom) {
            invader.x = newx;
            invader.y = newy;
        }
    }

    //  Update invader velocities.
    if(this.invadersAreDropping) {
        this.invaderCurrentDropDistance += this.invaderVelocity.y * dt;
        if(this.invaderCurrentDropDistance >= this.config.invaderDropDistance) {
            this.invadersAreDropping = false;
            this.invaderVelocity = this.invaderNextVelocity;
            this.invaderCurrentDropDistance = 0;
        }
    }
    //  If we've hit the left, move down then right.
    if(hitLeft) {
        this.invaderCurrentVelocity += this.config.invaderAcceleration;
        this.invaderVelocity = {x: 0, y:this.invaderCurrentVelocity };
        this.invadersAreDropping = true;
        this.invaderNextVelocity = {x: this.invaderCurrentVelocity , y:0};
    }
    //  If we've hit the right, move down then left.
    if(hitRight) {
        this.invaderCurrentVelocity += this.config.invaderAcceleration;
        this.invaderVelocity = {x: 0, y:this.invaderCurrentVelocity };
        this.invadersAreDropping = true;
        this.invaderNextVelocity = {x: -this.invaderCurrentVelocity , y:0};
    }
    //  If we've hit the bottom, it's game over.
    if(hitBottom) {
        this.lives = 0;
    }

    for(i=0; i<this.invaders.length; i++) {
        var invader = this.invaders[i];
        var bang = false;

        for(var j=0; j<this.rockets.length; j++){
            var rocket = this.rockets[j];

            if(rocket.x >= (invader.x - invader.width/2) && rocket.x <= (invader.x + invader.width/2) &&
                rocket.y >= (invader.y - invader.height/2) && rocket.y <= (invader.y + invader.height/2)) {

                //  Remove the rocket, set 'bang' so we don't process
                //  this rocket again.
                this.rockets.splice(j--, 1);
                bang = true;
                game.score += this.config.pointsPerInvader;
                break;
            }
        }
        if(bang) {
            this.invaders.splice(i--, 1);
        }
    }

    var frontRankInvaders = {};
    for(var i=0; i<this.invaders.length; i++) {
        var invader = this.invaders[i];
        //  If we have no invader for game file, or the invader
        //  for game file is futher behind, set the front
        //  rank invader to game one.
        if(!frontRankInvaders[invader.file] || frontRankInvaders[invader.file].rank < invader.rank) {
            frontRankInvaders[invader.file] = invader;
        }
    }

    //  Give each front rank invader a chance to drop a bomb.
    for(var i=0; i<this.config.invaderFiles; i++) {
        var invader = frontRankInvaders[i];
        if(!invader) continue;
        var chance = this.bombRate * dt;
        if(chance > Math.random()) {
            //  Fire!
            this.bombs.push(new Bomb(invader.x, invader.y + invader.height / 2,
                this.bombMinVelocity + Math.random()*(this.bombMaxVelocity - this.bombMinVelocity)));
        }
    }

     for(var i=0; i<this.bombs.length; i++) {
        var bomb = this.bombs[i];
        if(bomb.x >= (this.ship.x - this.ship.width/2) && bomb.x <= (this.ship.x + this.ship.width/2) &&
                bomb.y >= (this.ship.y - this.ship.height/2) && bomb.y <= (this.ship.y + this.ship.height/2)) {
            this.bombs.splice(i--, 1);
            game.lives--;
        }

    };

    for(var i=0; i<this.bombs.length; i++) {
        var bomb = this.bombs[i];
        if(bomb.x >= (this.ship.x - this.ship.width/2) && bomb.x <= (this.ship.x + this.ship.width/2) &&
                bomb.y >= (this.ship.y - this.ship.height/2) && bomb.y <= (this.ship.y + this.ship.height/2)) {
            this.bombs.splice(i--, 1);
            game.lives--;
        }

    };

    for(var i=0; i<this.invaders.length; i++) {
        var invader = this.invaders[i];
        if((invader.x + invader.width/2) > (this.ship.x - this.ship.width/2) &&
            (invader.x - invader.width/2) < (this.ship.x + this.ship.width/2) &&
            (invader.y + invader.height/2) > (this.ship.y - this.ship.height/2) &&
            (invader.y - invader.height/2) < (this.ship.y + this.ship.height/2)) {
            //  Dead by collision!
            game.lives = 0;
            game.sounds.playSound('explosion');
        }
    }

    if(game.lives <= 0) {
        game.moveToState(new GameOverState());
    }

    //  Check for victory
    if(this.invaders.length === 0) {
        game.score += this.level * 50;
        game.level += 1;
        game.moveToState(new LevelIntroState(game.level));
    }
};

PlayState.prototype.fireRocket = function() {
  if(this.lastRocketTime === null || ((new Date()).valueOf() - this.lastRocketTime) > (1000 / this.config.rocketMaxFireRate))
  {

      this.rockets.push(new Rocket(this.ship.x, this.ship.y - 12, this.config.rocketVelocity));
      this.lastRocketTime = (new Date()).valueOf();
  }
};

PlayState.prototype.draw = function(game, dt, ctx) {

    //  Clear the background.
    ctx.clearRect(0, 0, game.width, game.height);

    //  Draw ship.
    ctx.fillStyle = '#999999';
    ctx.fillRect(this.ship.x - (this.ship.width / 2), this.ship.y - (this.ship.height / 2), this.ship.width, this.ship.height);

    //  Draw invaders.
    ctx.fillStyle = '#006600';
    for(var i=0; i<this.invaders.length; i++) {
        var invader = this.invaders[i];
        ctx.fillRect(invader.x - invader.width/2, invader.y - invader.height/2, invader.width, invader.height);
    }

    //  Draw bombs.
    ctx.fillStyle = '#ff5555';
    for(var i=0; i<this.bombs.length; i++) {
        var bomb = this.bombs[i];
        ctx.fillRect(bomb.x - 2, bomb.y - 2, 4, 4);
    }

    //  Draw rockets.
    ctx.fillStyle = '#ff0000';
    for(var i=0; i<this.rockets.length; i++) {
        var rocket = this.rockets[i];
        ctx.fillRect(rocket.x, rocket.y - 2, 1, 4);
    }

};
function Ship(x, y) {
    this.x = x;
    this.y = y;
    this.width = 20;
    this.height = 16;
}

function Rocket(x, y, velocity) {
    this.x = x;
    this.y = y;
    this.velocity = velocity;
}

function Bomb(x, y, velocity) {
    this.x = x;
    this.y = y;
    this.velocity = velocity;
}

function Invader(x, y, rank, file, type) {
    this.x = x;
    this.y = y;
    this.rank = rank;
    this.file = file;
    this.type = type;
    this.width = 18;
    this.height = 14;
}

