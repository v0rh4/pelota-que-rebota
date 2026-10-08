//alert("Holachamos"); 
/*
Este es un código 
que hace la pelota
 rebote en el borde 
 inferior de la 
 pantalla.   
 */ 

 let posY = 150; 
 let velY = 0;

function setup() { 

createCanvas(windowWidth, windowHeight); 
} 

function draw() { 
   background(120);
   fill(800,180, 50); 
   noStroke();
    circle(width/2, posY, 50);
    posY += velY; 
    velY += 0.5; 
    console.log(velY);
    if(posY > height - 25) {
        velY = velY * -0.9;

} 

}