/* 
   Copyright 2006 Philip Dorrell.
   License: This Javascript file is part of the PrimeShooter game, 
   which is licensed under the General Public License version 2, 
   a copy of which may be found at http://thinkinghard.com/math/integers/gnu-general-public-license.txt
*/

//================================================================================
var LOOP_INTERVAL = 13; // milliseconds per game loop

//================================================================================

var initialPrimes = [2,3,5,7,11,13,17,19,23,29]; // used to initial "isPrime"
var isPrime;  // boolean array to test for primality

/** Initialise "isPrime" boolean array which can test any value up to "maxNum" for primality */
function setupIsPrime (maxNum) {
  isPrime = new Array (maxNum+1);
  for (var i=0; i<isPrime.length; i++) {
    isPrime[i] = true;
  }
  isPrime[0] = false;
  isPrime[1] = false;
  for (var i=0; i<initialPrimes.length; i++) {
    var p = initialPrimes[i];
    for (var c=p*2; c<=maxNum; c += p) {
      isPrime[c] = false;
    }
  }
}

//================================================================================
/** Do rectangular elements element1 & element2 overlap?
 * Assumes that they are positioned relative to the same containing element.
 **/
function collided (element1, element2) {
  var x1 = element1.offsetLeft;
  var x2 = element2.offsetLeft - element1.offsetWidth;
  var x3 = element2.offsetLeft + element2.offsetWidth;
  if (x2 <= x1 && x1 <= x3) {
    var y1 = element1.offsetTop;
    var y2 = element2.offsetTop - element1.offsetHeight;
    var y3 = element2.offsetTop + element2.offsetHeight;
    return y2 <= y1 && y1 <= y3;
  }
  else {
    return false;
  }
}

/** Return true with probability prob. */
function withProbability (prob) {
  return Math.random() < prob;
}

/** Height of the game in pixels */
var gameHeight = 500;

/** Set "left" attribute of style to "pos" pixels. */
function setLeft (elt, pos) {
  elt.style.left = pos + "px";
}

/** Set vertical position of element above bottom of game to "Y". */
function setYPos (elt, Y) {
  elt.style.top = (gameHeight - Y) + "px";
}

//================================================================================
/** Construct model of Bullet object.
 * view: div element representing bullet
 * gun: the Gun model (of the gun that fires the bullet)
 **/
function Bullet (view, gun) {
  this.view = view;
  view.model = this;
  this.gun = gun;
  this.targetsHit = null;
}

Bullet.prototype = {
  step: 7, // how far the bullet travels each game loop
  maxPos: 500, // maximum position that bullet reaches (before disappearing)
  activeColor: "#000000",  // colour when active
  inactiveColor: "#a0a0a0",  // colour when inactive (i.e. still moving, but can't destroy target)
  
  /** Hide the bullet, and set it ready to be fired by the gun. */
  clear: function() { 
    this.active = false;
    this.view.style.visibility = "hidden";
    this.gun.setLoaded (true);
  },
  
  /** Set the bullet in motion (after choosing bullet type) */
  restart: function() {
    this.X = this.gun.pos; 
    this.Y = 60;
    this.enabled = true;
    setLeft (this.view, this.X + 20);
    setYPos (this.view, this.Y);
    this.view.style.color = this.activeColor;
    this.view.style.visibility = "visible";
    this.gun.setLoaded (false);
    this.active = true;
  },
  
  /** Deactivate (after passing through target that it doesn't affect) */
  deactivate: function() {
    this.enabled = false;
    this.view.style.color = this.inactiveColor;
  },
  
  /** Fire the bullet as a (prime) number which divided a target by the number
   * (if the number is a multiple of the bullet's number). */
  fire: function (n) {
    //console.log("fire bullet " + n + " ...");
    this.prime = n;
    this.isPrime = false;
    this.view.firstChild.nodeValue="" + n;
    this.restart();
  },
  
  /** Fire the bullet at a "P", which reduces any prime number to 1. */
  firePrime: function() {
    //console.log("fire PRIME bullet ...");
    this.isPrime = true;
    this.view.firstChild.nodeValue="P";
    this.restart();
  },
  
  /** Did this bullet collide with a number target in an active state? */
  collidedWithNumber: function (number) {
    return this.active && this.enabled && collided (this.view, number.view);
  },
  
  /** Update the bullet for one game loop. */
  update: function() {
    if (this.active) {
      this.Y = this.Y + this.step; // move upwards
      if (this.Y > this.maxPos) {
        this.clear(); // if past top then clear (and make gun ready to fire again)
      }
      else {
        setYPos (this.view, this.Y); // position view
      }
    }
  },
  
  /** Does this bullet act on the given target value? */
  actsOn: function (value) {
    if (this.isPrime) {
      return isPrime[value] ? 1 : null;
    }
    else {
      return (value % this.prime == 0) ? value / this.prime : null;
    }
  },
  
  /** Given that target has collided with bullet, set the bullet to
   * have hit the target, unless it is already marked as hitting 
   * another target with a lower Y value. (This ensures bullet hits
   * the lowest target if there is a choice.)
   **/
  maybeHitTarget: function (target) {
    if (!this.targetHit) {
      this.targetHit = target;
    } 
    else if (target.Y < this.targetHit.Y) {
      this.targetHit = target;
    }
  },
  
  /** Having decide which target (if any) was hit, tell the target
   * that it has been hit.
   **/
  checkHitTarget: function() {
    if (this.targetHit) {
      this.targetHit.isHitByBullet (this);
    }
    this.targetHit = null;
  }
}

//================================================================================
/** Model of Gun. Constructed from div element representing the gun. */
function Gun (view) {
  this.view = view;
  this.reset();
}

Gun.prototype = {
  initialPos: 350, // initial horizontal position
  minPos: 0, // leftmost position
  maxPos: 750, // rightmost position
  step: 7, // how far it moves left or right each game loop (if it is being moved by the player)
  loadedColor: "#ffff80",  // colour when alive and loaded and ready to fire
  unloadedColor: "#c0c0c0", // colour when alive but not loaded
  deadColor: "#404040", // colour when dead
  
  /** Update the Gun each game loop (move left or right if it is going in that direction) */
  update: function() {
    if (this.goingLeft) {
      this.moveLeft();
    }
    else if (this.goingRight) {
      this.moveRight();
    }
  },
  
  /** Move gun left, but not past leftmost position */
  moveLeft: function() {
    this.pos -= this.step;
    if (this.pos < this.minPos) this.pos = this.minPos;
    setLeft (this.view, this.pos);
  },
  
  /** Move gun right, but not past rightmost position */
  moveRight: function() {
    this.pos += this.step;
    if (this.pos > this.maxPos) this.pos = this.maxPos;
    setLeft (this.view, this.pos);
  },

  /** Set colour of gun according to loaded state */
  setLoaded: function (loaded) {
    this.view.style.backgroundColor = loaded ? this.loadedColor : this.unloadedColor;
  },
  
  /** Set that gun is going left */
  setGoingLeft: function() { this.goingRight = false; this.goingLeft = true; },
  /** Set that gun is going right */
  setGoingRight: function() { this.goingLeft = false; this.goingRight = true; },
  /** Set that gun is not going left */
  clearGoingLeft: function() { this.goingLeft = false; },
  /** Set that gun is not going right. */
  clearGoingRight: function() { this.goingRight = false; },
  
  /** Set gun dead: set dead colour, stop moving left or right. */
  die: function () {
    this.view.style.backgroundColor = this.deadColor;
    this.clearGoingLeft();
    this.clearGoingRight();
  },
  
  /** Set gun loaded. */
  setLoaded: function() {
    this.view.style.backgroundColor = this.loadedColor;
  },
  
  /** Reset (for new game) */
  reset: function() {
    this.pos = this.initialPos;
    this.goingRight = false;
    this.goingLeft = false;
    this.view.style.backgroundColor = this.loadedColor;
  }
};

//================================================================================
/** Model of spare guns, as shown at bottom right, representing how many "lives"
  * the player has additional to their current "life".
  * Constructed from (initially childless) div element that contains them. */
function SpareGuns (view) {
  this.view = view;
  this.numGuns = 0;
}

SpareGuns.prototype = {
  
  maxNumGuns: 10, // maximum number of spare guns that player can accumulate
  
  toString: function() { return "SpareGuns[" + this.numGuns + "]"; },  // for logging
  
  /** Add another spare gun, but not if the maximum number is already reached. */
  addGun: function() {
    if (this.numGuns < this.maxNumGuns) {
      this.numGuns++;
      var newGun = document.createElement ("div");
      newGun.className = "spareGun";
      this.view.appendChild (newGun);
    }
  },
  
  /** Remove a spare gun. */
  removeGun: function() {
    this.numGuns--;
    this.view.removeChild (this.view.lastChild);
  },
  
  /** Remove all remaining spare guns. */
  clearAllGuns: function() {
    while (this.numGuns > 0) {
      this.removeGun();
    }
  }
}

//================================================================================
/** The Number's are the targets which come down from the top, and must be shot
 * and killed using the prime number and "P" bullets. Constructed from view (div element
 * for that number), index (from 0 to allNumbers.length-1) and a handle to the list
 * of all the Number objects. There is a finite set of Number's, only some of which may
 * be active at any one time.*/
function Number(view, index, allNumbers) {
  this.view = view;
  view.model = this;
  this.index = index;
  this.allNumbers = allNumbers;
  this.restartProb = 0.06 / (1 + index*index*index*index); // probability of restarting each game loop if not active
  this.init();
}

Number.prototype = {
  maxPos: 540, // top position where number starts from when coming down
  step: 1, // size of step each game loop when descending
  maxValue: 100, // current maximum values of number values (which rises as points increase)
  maxMaxValue: 500, // maximum possible maximum value (since 23*23 = 529 can't be shot at).
  width: 100, // width of view div
  height: 30, // height of view div
  veryActiveColor: "#ff0000", // danger colour when it has to be shot before it hits bottom
  activeColor: "#ff7070", // colour when normal (coming down, will kill gun if it collides with gun)
  inactiveColor: "#d0d0d0", // colour when has been "killed" by reduction to 1
  numActive: 0, // number of active Number's
  
  /** Initialise at start of game */
  init: function() {
    this.deactivate();
  },
  
  /** Would this number overlap with any other active number? (Used to prevent
   * new numbers appearing overlapped with existing active numbers.)*/
  overlaps: function() {
    for (var i=0; i < this.allNumbers.length; i++) {
      var otherNumber = this.allNumbers[i];
      if (i != this.index && otherNumber.active) {
        if (Math.abs (otherNumber.X - this.X) < otherNumber.view.offsetWidth &&
                (Math.abs (otherNumber.Y - this.Y) < otherNumber.view.offsetHeight ||
                Math.abs (otherNumber.Y + this.maxPos - this.Y) < otherNumber.view.offsetHeight) ){
          return true;
        }
      }
    }
    return false;
  },
  
  /** Start this previously inactive number descending (and choose a value for it), 
   * but only if it won't overlap with an existing active Number.*/
  start: function (number) {
    this.numActive++;
    this.X = Math.round (698 * Math.random());
    setLeft (this.view, this.X);
    this.Y = this.maxPos;
    setYPos (this.view, this.Y);
    if (!this.overlaps()) {
      this.active = true;
      this.veryActive = false;
      this.view.style.backgroundColor = this.activeColor;
      this.timeToDie = null;
      this.value = 2 + Math.round ((this.maxValue-2) * Math.random());
      this.view.style.visibility = "visible";
      this.view.firstChild.nodeValue = "" + this.value;
    }
  },
  
  /** Update Number for one game loop */
  update: function(bullet, gun) {
    if (this.active) {
      if (this.timeToDie) { // if it's dying, one more step until death
        this.timeToDie -= 1;
        if (this.timeToDie == 0) {
          this.deactivate();
        }
      }
      else if (this.Y < this.height && this.veryActive) { // super-active hits bottom: kills gun
        this.game.gunDied("Super-activated " + this.value + " hit the bottom", this);
      }
      else { // active Number descends
        this.Y -= this.step;
        if (this.Y < 0) { 
          this.Y = this.maxPos;
          if (withProbability (0.5)) this.setVeryActive(); // might go super-active if coming down from top
        }
        setYPos (this.view, this.Y);
        if (bullet.collidedWithNumber (this)) { // see if bullet could have collided with it
          bullet.maybeHitTarget (this);
        }
        else if (collided (this.view, gun.view)) { // see if collided with the gun (and killed it)
          this.game.gunDied("The number " + this.value + " collided with you", this);
        }
      }
    }
    else {
      if (withProbability (this.restartProb)) { // if inactive, maybe set it active
        this.start();
      }
    }
  },
  
  /** Set "very active" (kills gun when it hits bottom, so gun has to kill it in that descent) */
  setVeryActive: function() {
    this.veryActive = true;
    this.view.style.backgroundColor = this.veryActiveColor;
  },
  
  /** Set inactive */
  deactivate: function() {
    this.active = false;
    this.view.style.visibility = "hidden";
    this.numActive--; // keep count of number of active guns
  },
  
  /** What to do when hit by bullet */
  isHitByBullet: function(bullet) {
    var result = bullet.actsOn (this.value);
    if (result) { // the bullet does act on this Number
      this.value = result;
      this.view.firstChild.nodeValue = "" + result;
      bullet.clear(); // clear bullet so gun is ready to fire new bullet
      if (result ==1) { // Number reduced to 1, so it has "died"
        this.game.addScore(1);
        this.view.style.backgroundColor = this.inactiveColor;
        this.timeToDie = 20;
      }
    }
    else {
      bullet.deactivate(); // bullet didn't act, so it passes on up, but is inactive (i.e. can't hit other numbers)
    }
  }
  
}

//================================================================================
/** Initialise map from keycode to primes (for firing bullets) */
function initPrimesForKeyCode() {
  var codes = [];
  codes[50] = 2;
  codes[51] = 3;
  codes[53] = 5;
  codes[55] = 7;
  codes[101] = 11;  // "e"
  codes[116] = 13;  // "t"
  codes[115] = 17;  // "s"
  codes[110] = 19;  // "n"
  return codes;
}

/** The maximum value for Number's as a function of current score:
 * starts at 100, stays same until score is 50, then increases up to maximum (of 500) 
 **/
function maxValueFromScore (score) {
  var value= Math.min (Number.prototype.maxMaxValue, Math.max (score + 50, 100));
  return value;
}

/** Model of Game including Gun, Bullet, up to 5 Numbers, current score + spare guns */
function Game (document) {
  this.gun = new Gun (document.getElementById ("gun"));
  this.bullet = new Bullet (document.getElementById ("bullet"), this.gun);
  this.maxNumbers = 5;
  this.numbers = new Array(this.maxNumbers);
  for (var i=0; i<this.maxNumbers; i++) {
    this.numbers[i] = new Number (document.getElementById ("number" + i), i, this.numbers);
    this.numbers[i].game = this;
  }
  this.scoreText = document.getElementById ("scoreValue");
  this.highScoreText = document.getElementById ("highScore");
  this.gameOverElement = document.getElementById ("gameOver");
  this.messageElement = document.getElementById ("message");
  this.gameOverText = document.getElementById ("gameOverText");
  this.startNewButton = document.getElementById ("startNewGame");
  this.gameScore = document.getElementById ("gameScore");
  this.timezone = document.getElementById ("timezone");
  this.noLocalStorageElement = document.getElementById("noLocalStorage");
  var game = this;
  this.startNewButton.onclick = function() { if (game.controller.finished) game.controller.restart(); }
  
  this.spareGuns = new SpareGuns (document.getElementById ("spareGuns"));
  
  this.init();
  this.suspended = false;
}

Game.prototype = {
  
  initNumGuns: 3,  // number of spare guns to start with
  scorePerNewGun: 50,  // how many points to get a new spare gun
  
  primesForKeyCodes: initPrimesForKeyCode(),  // codes to map key codes to prime number bullets
  
  displayLocalStorageError: function(error) {
    this.noLocalStorageElement.innerHTML = "&nbsp;<br/>(<b>Note:</b> PrimeShooter's high score functionality is not available in this web browser. The following error occurred when attempting to use <b>localStorage</b>: <span id = 'localStorageError'></span>)";
    this.localStorageErrorElement = document.getElementById("localStorageError");
    this.localStorageErrorElement.appendChild(document.createTextNode("" + error));
  }, 
  
  /** Initialise game */
  init: function() {
    this.currentNumbers = 1;
    this.gameOverElement.style.display = "none";
    this.messageElement.style.display = "none";
    this.bullet.clear();
    this.score = 0;
    try {
      this.highScoreValue = localStorage.primeShooterHighScore;
      this.hasLocalStorage = true;
    }
    catch(err) {
      var message = err.description ? err.description : "" + err;
      this.displayLocalStorageError(message);
      this.hasLocalStorage = false;
    }
    this.highScoreText.style.color = "#b0b0b0";
    this.newHighScore = false;
    this.updateHighScore(this.highScoreValue == null ? 0 : parseInt(this.highScoreValue), false);
    this.scoreText.firstChild.nodeValue = "" + this.score;
    Number.prototype.maxValue = maxValueFromScore (this.score);
    Number.prototype.numActive = 0;
    for (var i=0; i<this.maxNumbers; i++) {
      this.numbers[i].init();
    }
    for (var i=0; i<this.currentNumbers; i++) {
      this.numbers[i].start();
    }
    
    this.spareGuns.clearAllGuns();
    for (var i=0; i<this.initNumGuns; i++) {
      this.spareGuns.addGun();
    }
  },
  
  /** Restart game */
  restart: function() {
    this.init();
  },
  
  /** How many spare guns for score (if none lost and no maximum).
   * If this function increases, then you can be given a new spare gun.
   **/
  gunsFromScore: function() {
    return Math.floor (this.score / this.scorePerNewGun);
  },
  
  updateHighScore: function(score, newHighScore) {
    if (!this.hasLocalStorage) {
      this.highScoreText.firstChild.nodeValue = "";
      return;
    }
    this.highScore = score;
    if (newHighScore && !this.newHighScore) {
      this.highScoreText.style.color = "red";
      this.newHighScore = true;
    }
    if (score == 0) {
      this.highScoreText.firstChild.nodeValue = "(No high score)";
    }
    else if (this.newHighScore) {
      this.highScoreText.firstChild.nodeValue = "New High Score: " + score;
    }
    else {
      this.highScoreText.firstChild.nodeValue = "Previous High Score: " + score;
    }
    localStorage.primeShooterHighScore = "" + score;
  }, 
  
  /** Give the player points (for doing something) */
  addScore: function (increment) {
    var oldNumGuns = this.gunsFromScore();
    this.score += increment;
    if (this.score > this.highScore) {
      this.updateHighScore(this.score, true);
    }
    var newNumGuns = this.gunsFromScore();
    if (newNumGuns > oldNumGuns) { // if player deserves new spare guns, give them to player
      for (var i=oldNumGuns; i<newNumGuns; i++) {
        this.spareGuns.addGun();
      }
    }
    this.scoreText.firstChild.nodeValue = "" + this.score; // update score view
    this.currentNumbers = Math.min (this.maxNumbers, Math.floor (1 + this.score/10)); // max number of active numbers
    Number.prototype.maxValue = maxValueFromScore (this.score); // update max value for Numbers
  },
  
  /** Response to key press, either a prime bullet or a "P" bullet, or none */
  keyPress: function (code) {
    if (this.suspended) { return false; }
    if (!this.bullet.active) {
      var prime = this.primesForKeyCodes[code];
      if (prime) {
        this.bullet.fire (prime);
      }
      else if (code == 112) { // "p"
        this.bullet.firePrime();
      }
    }
    return false;
  },
  
  /** Response to keys down */
  keyDown: function (code) {
    if (code == 37) { // left arrow
      if (!this.suspended) this.gun.setGoingLeft();
      return false;
    }
    else if (code == 39) { // right arrow
      if (!this.suspended) this.gun.setGoingRight();
      return false;
    }
    else { 
      return true;
    }
  },
  
  keyUp: function (code) {
    if (code == 37) { // left arrow
      if (!this.suspended) this.gun.clearGoingLeft();
      return false;
    }
    else if (code == 39) { // right arrow
      if (!this.suspended) this.gun.clearGoingRight();
      return false;
    }
    else { 
      return true;
    }
  },
  
  /** Stop everything for "count" game loops (used when gun dies), and call
   * callback before resuming game loop. */
  suspend: function (count, callback) {
    this.suspendCount = count;
    this.suspendCallback = callback;
    this.suspended = true;
  },
  
  /** Update for one game loop */
  update: function() {
    if (this.suspended) {
      this.suspendCount--; // count down until suspension finishes
      if (this.suspendCount <= 0) {
        var callback = this.suspendCallback;
        callback();
        this.suspended = false;
      }
    } 
    else { // update the game components
      this.gun.update();
      this.bullet.update();
      for (var i=0; i<this.currentNumbers; i++) {
        var number = this.numbers[i];
        number.update (this.bullet, this.gun);
      }
      this.bullet.checkHitTarget();
    }
  },
  
  /** What to do when the gun dies */
  gunDied: function (message, killer) {
    if (this.spareGuns.numGuns == 0) { // no more spare guns
      this.lost (message + " and no more lives"); // game finishes
    }
    else { // gun dies, then 
      var game = this;
      this.showMessage (message); // explain why the gun died
      this.gun.die();
      this.suspend (40, function() {
        game.clearMessage();
        killer.deactivate(); // whatever Number killed the gun, deactivate it
        game.bullet.clear(); // clear any current bullet
        game.spareGuns.removeGun(); // use up a spare gun
        game.gun.setLoaded(); // ready to carry on shooting
      });
    }
  },
  
  /** All your guns died and you lost (but you can start a new game) */
  lost: function(message) {
    this.gun.die();
    if (this.gameScore) this.gameScore.value = "" + this.score;
    if (this.timezone) this.timezone.value = "" + (new Date()).getTimezoneOffset();
    var congratulations = this.newHighScore ? (" (Congratulations on your new high score of " + this.highScore + ")") : "";
    this.gameOverText.firstChild.nodeValue= message + ": GAME OVER" + congratulations;
    this.gameOverElement.style.display = "block";
    this.controller.finishGame();
  },
  
  /** Clear the game over element (message & restart button) */
  clearGameOver: function() {
    this.gameOverElement.style.display = "none";
  },
  
  /** Show a message */
  showMessage: function(message) {
    this.messageElement.firstChild.nodeValue = message;
    this.messageElement.style.display = "block";
  },
  
  /** Clear the message */
  clearMessage: function() {
    this.messageElement.style.display = "none";
  }
}

//================================================================================
/** Controller for game, which manages keystroke input and sets up game loop */
function GameController (document, game, loopInterval) {
  this.document = document;
  this.game = game;
  this.finished = false;
  this.loopInterval = loopInterval;
}

GameController.prototype = {
  
  /** Restart the game */
  restart: function() {
    this.game.clearGameOver();
    this.game.restart();
    this.finished = false;
    this.startLoop();
  },
  
  /** Start the game loop */
  startLoop: function() {
    var game = this.game;
    var controller = this;
    this.loopHandle = setInterval (function(){game.update();}, this.loopInterval);
  },
  
  /** Set up the game and then start it (for the first time). */
  startGame: function() {
    
    var game = this.game;
    var controller = this;
    game.controller = controller;
    
    this.document.onkeydown = function(event) { // set up keydown handler
      if (!event) event = window.event;
      return game.keyDown (event.keyCode);
    };
    
    this.document.onkeyup = function(event) { // set up keyup handler
      if (!event) event = window.event;
      return game.keyUp (event.keyCode);
    };
    
    this.document.onkeypress = function(event) { // set up keypress handler
      if (!event) event = window.event;  // IE event
      if (controller.finished) { // do nothing if game is finished
        return true;
      }
      else {
        if (event.altKey || event.ctrlKey) { // game doesn't process Alt/Ctrl key presses
          return true; 
        }
        else {
          var code = event.which || event.keyCode;
          if (code == 27) { // Esc to abort game
            game.lost("Manually terminated by pressing Esc");
            return false;
          }
          else {
            return game.keyPress (code); // pass keypress to Game object
          }
        }
      }
    };
    // and then start the game loop running ...
    this.startLoop();
  },
  
  /** Finish the game, and stop the game loop */
  finishGame: function() {
    this.finished = true;
    clearInterval (this.loopHandle);
  }
  
}
//================================================================================
/** Setup function (to be invoked on page load) */
function setup(numGuns) {
  Game.prototype.initNumGuns = numGuns;
  var game = new Game (document);
  setupIsPrime (Number.prototype.maxMaxValue);
  var gameController = new GameController (document, game, LOOP_INTERVAL);
  gameController.startGame();
}
