// Polyfill: Firefox (y algunos navegadores) no implementan
// AudioParam.cancelAndHoldAtTime(), que p5.sound (Tone.js) usa al hacer
// rampas de volumen/frecuencia. Sin esto, osc.amp() y osc.freq() lanzan
// "cancelAndHoldAtTime is not a function".
if (
  typeof AudioParam !== "undefined" &&
  typeof AudioParam.prototype.cancelAndHoldAtTime !== "function"
) {
  AudioParam.prototype.cancelAndHoldAtTime = function (cancelTime) {
    const heldValue = this.value;
    this.cancelScheduledValues(cancelTime);
    this.setValueAtTime(heldValue, cancelTime);
    return this;
  };
}

// Pelota que rebota: se mueve de forma autónoma ("viva"),
// rebota en los cuatro bordes, cambia constantemente de tamaño y color,
// y emite un golpe con eco en cada rebote. Suelta partículas con forma
// de Halloween desde el cursor. Se detiene cuando el cursor está encima.

let posX, posY;   // posición de la pelota
let velX, velY;   // velocidad
const RADIO_BASE = 25;

let osc, env, eco;       // sonido (librería p5.sound)
let audioIniciado = false;
let t = 0;               // tiempo para el ruido de Perlin (movimiento)
let tTamano = 0;         // tiempo para el ruido del tamaño

const FORMAS = ['calavera', 'esqueleto', 'fantasma', 'calabaza', 'arana'];
const FORMAS_PELOTA = ['calavera', 'calabaza', 'fantasma'];
let formaPelota = 'calavera';  // forma actual de la pelota
let angulo = 0;                // rotación de la pelota (rueda)
const MAX_PARTICULAS = 200;
let particulas = [];     // partículas de Halloween
let mouseActivo = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100);   // para cambiar de color con facilidad

  // La pelota "sale" en un punto aleatorio de la pantalla.
  posX = random(RADIO_BASE * 2, width - RADIO_BASE * 2);
  posY = random(RADIO_BASE * 2, height - RADIO_BASE * 2);
  velX = random(-5, 5);
  velY = random(-5, 5);

  // Sonido: un "golpe" grave con eco sutil.
  osc = new p5.Oscillator('sine');
  osc.amp(0.5);
  osc.disconnect();
  env = new p5.Envelope(0.001, 0.15, 0.05, 0.15);  // golpe corto
  osc.connect(env);
  env.disconnect();
  eco = new p5.Delay(0.18, 0.28);                   // eco sutil
  env.connect(eco);
}

function draw() {
  background(0, 0, 0);   // negro

  // Tamaño en cambio constante (proporciones exageradas).
  tTamano += 0.04;
  let radioX = RADIO_BASE * map(noise(tTamano), 0, 1, 0.3, 2.2);
  let radioY = RADIO_BASE * map(noise(tTamano + 100), 0, 1, 0.3, 2.2);

  // Si el cursor está encima de la pelota, esta se detiene.
  let encima = sq(mouseX - posX) / sq(radioX) + sq(mouseY - posY) / sq(radioY) < 1;

  if (!encima) {
    moverPelota(radioX, radioY);
  }

  // Emitir partículas de Halloween desde la posición del mouse.
  if (mouseActivo && frameCount % 4 === 0 && particulas.length < MAX_PARTICULAS) {
    particulas.push(new Particula(mouseX, mouseY, random(FORMAS)));
  }

  // Dibujar la pelota con su forma actual.
  push();
  translate(posX, posY);
  rotate(angulo);
  scale(radioX / RADIO_BASE, radioY / RADIO_BASE);
  dibujarForma(formaPelota, RADIO_BASE * 2);
  pop();

  // Actualizar y dibujar las partículas.
  for (let i = particulas.length - 1; i >= 0; i--) {
    let p = particulas[i];
    p.actualizar();
    if (p.muerta()) {
      particulas.splice(i, 1);
    } else {
      p.dibujar();
    }
  }

  // Aviso hasta que el usuario active el audio con un clic.
  if (!audioIniciado) {
    fill(0, 0, 100);
    textAlign(CENTER);
    textSize(16);
    text('Haz clic para activar el sonido', width / 2, 40);
  }
}

function moverPelota(rx, ry) {
  // "Estado de ánimo" que varía suavemente con el ruido de Perlin:
  // a veces la pelota está muy activa y otras veces tranquila.
  let energia = noise(t) * 0.8 + 0.2;
  t += 0.01;

  // Pequeñas sacudidas aleatorias (movimiento "vivo").
  velX += random(-1, 1) * energia * 0.8;
  velY += random(-1, 1) * energia * 0.8;

  // De vez en cuando, un impulso espontáneo (un "salto").
  if (random(1) < 0.02) {
    velX += random(-1, 1) * energia * 12;
    velY += random(-1, 1) * energia * 12;
  }

  // Velocidad entre 5 y 16 para que recorra y rebote con fuerza.
  let rapidez = sqrt(velX * velX + velY * velY);
  let velMin = 5;
  let velMax = 16;
  if (rapidez < 0.001) {
    velX = random(-velMin, velMin);
    velY = random(-velMin, velMin);
  } else if (rapidez < velMin) {
    velX = velX / rapidez * velMin;
    velY = velY / rapidez * velMin;
  } else if (rapidez > velMax) {
    velX = velX / rapidez * velMax;
    velY = velY / rapidez * velMax;
  }

  posX += velX;
  posY += velY;
  angulo += velX * 0.02;   // la pelota "rueda" según su velocidad horizontal

  // Rebote en los cuatro bordes, con restitución variable.
  let restitucion = random(0.8, 1.0);

  if (posX < rx) {
    posX = rx;
    velX = abs(velX) * restitucion;
    alRebotar();
  } else if (posX > width - rx) {
    posX = width - rx;
    velX = -abs(velX) * restitucion;
    alRebotar();
  }

  if (posY < ry) {
    posY = ry;
    velY = abs(velY) * restitucion;
    alRebotar();
  } else if (posY > height - ry) {
    posY = height - ry;
    velY = -abs(velY) * restitucion;
    alRebotar();
  }
}

// Un solo sonido: golpe grave con eco sutil.
function sonarRebote() {
  if (!audioIniciado) return;
  osc.freq(200);          // tono inicial del golpe
  osc.freq(55, 0.12);     // caída de tono: golpe grave
  env.play();
}

// Se ejecuta en cada golpe: cambia la forma de la pelota + sonido.
function alRebotar() {
  let nueva;
  do {
    nueva = random(FORMAS_PELOTA);
  } while (nueva === formaPelota);
  formaPelota = nueva;
  sonarRebote();
}

// Una partícula con forma de Halloween que vive 10 segundos.
class Particula {
  constructor(x, y, forma) {
    this.x = x;
    this.y = y;
    this.forma = forma;
    this.vx = random(-0.02, 0.02);     // px/ms (~±20 px/s)
    this.vy = random(-0.03, 0.005);    // sube lentamente
    this.tam = random(30, 60);
    this.edad = 0;                     // milisegundos vividos
    this.rot = random(TWO_PI);
    this.rotVel = random(-0.0006, 0.0006);
  }

  actualizar() {
    this.edad += deltaTime;            // deltaTime está en ms
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.rot += this.rotVel * deltaTime;
  }

  dibujar() {
    // Vida de 10 segundos: aparece rápido, se mantiene y se desvanece al final.
    let progreso = this.edad / 10000;   // 0..1 en 10 s
    let alpha;
    if (progreso < 0.03) alpha = progreso / 0.03;
    else if (progreso < 0.8) alpha = 1;
    else alpha = (1 - progreso) / 0.2;
    alpha = constrain(alpha, 0, 1);

    push();
    translate(this.x, this.y);
    rotate(this.rot);
    if (typeof drawingContext !== 'undefined') {
      drawingContext.globalAlpha = alpha;
    }
    dibujarForma(this.forma, this.tam);
    pop();
  }

  muerta() {
    return this.edad >= 10000;   // 10 segundos
  }
}

function dibujarForma(forma, t) {
  if (forma === 'calavera') dibujarCalavera(t);
  else if (forma === 'esqueleto') dibujarEsqueleto(t);
  else if (forma === 'fantasma') dibujarFantasma(t);
  else if (forma === 'calabaza') dibujarCalabaza(t);
  else if (forma === 'arana') dibujarArana(t);
}

function dibujarCalavera(t) {
  noStroke();
  fill(0, 0, 100);            // blanco
  ellipse(0, -t * 0.12, t * 0.9, t * 0.8);        // cráneo
  rectMode(CENTER);
  rect(0, t * 0.2, t * 0.6, t * 0.38);            // mandíbula
  fill(0, 0, 0);
  ellipse(-t * 0.2, -t * 0.12, t * 0.24, t * 0.3);  // ojo izq
  ellipse(t * 0.2, -t * 0.12, t * 0.24, t * 0.3);   // ojo der
  triangle(0, t * 0.0, -t * 0.07, t * 0.12, t * 0.07, t * 0.12); // nariz
  stroke(0, 0, 0);
  strokeWeight(max(1, t * 0.02));
  line(-t * 0.28, t * 0.28, t * 0.28, t * 0.28);   // dientes
  line(-t * 0.14, t * 0.28, -t * 0.14, t * 0.38);
  line(0, t * 0.28, 0, t * 0.38);
  line(t * 0.14, t * 0.28, t * 0.14, t * 0.38);
  noStroke();
}

function dibujarEsqueleto(t) {
  noStroke();
  fill(0, 0, 100);
  ellipse(0, -t * 0.38, t * 0.42, t * 0.42);       // cabeza
  stroke(0, 0, 100);
  strokeWeight(max(1, t * 0.05));
  line(0, -t * 0.16, 0, t * 0.18);                 // columna
  line(-t * 0.26, -t * 0.1, t * 0.26, -t * 0.1);   // costillas
  line(-t * 0.22, 0, t * 0.22, 0);
  line(-t * 0.26, t * 0.1, t * 0.26, t * 0.1);
  line(0, -t * 0.12, -t * 0.3, t * 0.0);           // brazos
  line(0, -t * 0.12, t * 0.3, t * 0.0);
  line(0, t * 0.18, -t * 0.18, t * 0.5);           // piernas
  line(0, t * 0.18, t * 0.18, t * 0.5);
  noStroke();
  fill(0, 0, 0);
  ellipse(-t * 0.09, -t * 0.38, t * 0.1, t * 0.12); // ojos
  ellipse(t * 0.09, -t * 0.38, t * 0.1, t * 0.12);
}

function dibujarFantasma(t) {
  noStroke();
  fill(0, 0, 100);
  ellipse(0, -t * 0.15, t * 0.8, t * 0.7);          // cabeza
  rectMode(CORNER);
  rect(-t * 0.4, -t * 0.15, t * 0.8, t * 0.5);      // cuerpo
  let y0 = t * 0.35;
  let w = t * 0.8;
  for (let i = 0; i < 4; i++) {                     // flecos
    let x = -w / 2 + (i + 0.5) * (w / 4);
    triangle(x - w / 8, y0, x + w / 8, y0, x, y0 + t * 0.18);
  }
  fill(0, 0, 0);
  ellipse(-t * 0.14, -t * 0.1, t * 0.14, t * 0.22); // ojos
  ellipse(t * 0.14, -t * 0.1, t * 0.14, t * 0.22);
  ellipse(0, t * 0.06, t * 0.1, t * 0.14);          // boca
}

function dibujarCalabaza(t) {
  noStroke();
  fill(28, 92, 95);            // naranja
  ellipse(0, t * 0.05, t * 0.85, t * 0.8);
  stroke(22, 70, 60);          // crestas
  strokeWeight(max(1, t * 0.04));
  line(0, -t * 0.33, 0, t * 0.42);
  line(-t * 0.18, -t * 0.35, -t * 0.2, t * 0.4);
  line(t * 0.18, -t * 0.35, t * 0.2, t * 0.4);
  noStroke();
  fill(120, 75, 55);           // tallo verde
  rectMode(CENTER);
  rect(0, -t * 0.42, t * 0.12, t * 0.16);
  fill(0, 0, 0);               // cara tallada
  triangle(-t * 0.22, -t * 0.12, -t * 0.08, -t * 0.12, -t * 0.15, t * 0.0);
  triangle(t * 0.22, -t * 0.12, t * 0.08, -t * 0.12, t * 0.15, t * 0.0);
  triangle(-t * 0.12, t * 0.2, t * 0.12, t * 0.2, 0, t * 0.32);
}

function dibujarArana(t) {
  noStroke();
  fill(0, 0, 0);
  ellipse(0, 0, t * 0.5, t * 0.62);                  // abdomen
  ellipse(0, -t * 0.22, t * 0.3, t * 0.3);           // cabeza
  stroke(0, 0, 0);
  strokeWeight(max(1, t * 0.03));
  for (let i = 0; i < 4; i++) {                      // 8 patas
    let a = PI * (0.3 + i * 0.13);
    line(-t * 0.04, -t * 0.12, -t * 0.04 + cos(a) * t * 0.4, -t * 0.12 + sin(a) * t * 0.4);
    line(t * 0.04, -t * 0.12, t * 0.04 - cos(a) * t * 0.4, -t * 0.12 + sin(a) * t * 0.4);
  }
  noStroke();
  fill(0, 90, 100);                                  // ojos rojos
  ellipse(-t * 0.07, -t * 0.24, t * 0.06, t * 0.06);
  ellipse(t * 0.07, -t * 0.24, t * 0.06, t * 0.06);
}

// La primera vez que el usuario hace clic se activa el audio
// (los navegadores exigen una interacción del usuario).
function mousePressed() {
  if (!audioIniciado) {
    osc.start();       // iniciar en el gesto del usuario habilita el audio
    userStartAudio();  // y reanuda el contexto de audio
    audioIniciado = true;
  }
}

// Empezamos a emitir partículas solo cuando el mouse se mueve
// (evita que se acumulen en la esquina superior izquierda al cargar).
function mouseMoved() {
  mouseActivo = true;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  posX = constrain(posX, 0, width);
  posY = constrain(posY, 0, height);
}
