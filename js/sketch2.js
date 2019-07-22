var unit = 5;
var boxPerFrame = 1000;
var unitX, unitY;

var backColor,boxColor;

var backFrame = 10;

var canvas;

function boxDraw(x, y, size){
  square(x * unit, y * unit, size * unit);
}

function bigBoxDraw(x, y){
  fill(backColor);
  boxDraw(x - 1, y - 1, 9);
  fill(boxColor);
  boxDraw(x, y, 7);
  fill(backColor);
  boxDraw(x + 1, y + 1, 5);
  fill(boxColor);
  boxDraw(x + 2, y + 2, 3);
}

function smallBoxDraw(x, y){
  fill(boxColor);
  boxDraw(x, y, 5);
  fill(backColor);
  boxDraw(x + 1, y + 1, 3);
  fill(boxColor);
  boxDraw(x + 2, y + 2, 1);
}

function QRSetup(){
  var qrSize = 6;
  var qrX = unitX / 11 + 1;
  var qrY = unitY / 11 + 1;

  for(var i = 0; i < qrX / qrSize + 1; i++){
    for(var j = 0; j < qrY / qrSize + 1; j++){
      var boxX = i * (qrSize * 14);
      var boxY = j * (qrSize * 14);
      bigBoxDraw(boxX , boxY);
    }
  }

  for(var i = 0; i < qrX; i++){
    for(var j = 0; j < qrY; j++){
      if(i % qrSize != 0 || j % qrSize != 0){
        var boxX = 4 + 14 * i;
        var boxY = 4 + 14 * j;
        smallBoxDraw(boxX, boxY);
      }
    }
  }
}

function canvasSetup(){
  unitX = document.documentElement.scrollWidth / unit + 1;
  unitY = document.documentElement.scrollHeight / unit + 1;

  background(backColor);

  for(var i = 0; i < unitX; i++){
    for(var j = 0; j < unitY; j++){
      if(random(1) > 0.5){
        boxDraw(i,j,1);
      }
    }
  }
}

function windowResized(){
	//resizeCanvas(windowWidth, windowHeight);
	resizeCanvas(document.documentElement.scrollWidth,document.documentElement.scrollHeight);
	canvasSetup();
}

function setup() {
	//canvas = createCanvas(windowWidth, windowHeight);
	canvas = createCanvas(document.documentElement.scrollWidth,document.documentElement.scrollHeight);
	canvas.position(0,0);
	canvas.style('z-index','-1');

  noStroke();
  colorMode(HSB);
  backColor = color(0,0,95);
  boxColor = color(0,0,90);
  fill(boxColor);

  canvasSetup();
}

function draw(){
  if(frameCount % backFrame == 0){

    fill(boxColor);
    for(var i = 0; i < boxPerFrame; i++){
      var boxX = floor(random(unitX));
      var boxY = floor(random(unitY));
      boxDraw(boxX, boxY, 1);
    }

    fill(backColor);
    for(var i = 0; i < boxPerFrame; i++){
      var boxX = floor(random(unitX));
      var boxY = floor(random(unitY));
      boxDraw(boxX, boxY, 1);
    }

    QRSetup();
  }
}
