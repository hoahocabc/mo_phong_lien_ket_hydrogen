let molecules = [];
let boxSize = 200; 
let showLabels = false;

// Atom properties
const O_RADIUS = 20; 
const H_RADIUS = 12; 
const OH_BOND_LENGTH = 38; 
const H_BOND_DISTANCE = 90; 
const H_ANGLE = 104.5 * (Math.PI / 180); 

// Physics properties
const BOND_STRENGTH = 0.003; 
let maxSpeed = 1.5; 

// Sidebar width definition for Desktop only
const DESKTOP_SIDEBAR_WIDTH = 260; 

// Color Palette
const BOND_COLORS = {
    cyan:   [0, 255, 255],
    yellow: [255, 255, 0],
    magenta:[255, 0, 255],
    lime:   [50, 255, 50],
    orange: [255, 165, 0]
};
let currentBondColor = BOND_COLORS.cyan;

let numMolecules = 0;
let currentLang = 'vi';
let myFont; 

function preload() {
    myFont = loadFont('Arial.ttf'); 
}

function setup() {
    // [QUAN TRỌNG CHO MOBILE]
    // Màn hình điện thoại thường có pixelDensity cao (2.0, 3.0).
    // WebGL sẽ render rất nặng nếu không ép về 1.0.
    pixelDensity(1);

    // Tính toán kích thước canvas ban đầu
    let cW, cH;
    if (windowWidth <= 768) {
        // Mobile layout: Canvas full width, height = 60vh (ước lượng)
        cW = windowWidth;
        cH = windowHeight * 0.6;
    } else {
        // Desktop layout
        cW = windowWidth - DESKTOP_SIDEBAR_WIDTH;
        cH = windowHeight;
    }

    let canvas = createCanvas(cW, cH, WEBGL);
    canvas.parent('canvas-container');
    
    setAttributes('antialias', true);
    setAttributes('perPixelLighting', true);
    
    textFont(myFont);
    adjustCamera();
    setupUI();
}

function setupUI() {
    const input = document.getElementById('moleculeCount');
    const labelBtn = document.getElementById('toggleLabelsBtn');
    const langSelect = document.getElementById('langSelect');
    const speedSlider = document.getElementById('speedSlider');
    const colorBtns = document.querySelectorAll('.color-btn');

    updateInterfaceLanguage();

    langSelect.addEventListener('change', (e) => {
        currentLang = e.target.value;
        updateInterfaceLanguage();
    });

    input.addEventListener('input', (e) => {
        let val = parseInt(e.target.value);
        if (isNaN(val) || val < 0) val = 0;
        if (val > 100) val = 100; 
        updateMoleculeCount(val);
    });

    speedSlider.addEventListener('input', (e) => {
        maxSpeed = parseFloat(e.target.value);
    });

    colorBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Dừng sự kiện lan truyền để tránh click nhầm
            e.stopPropagation();
            
            colorBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const colorKey = btn.getAttribute('data-color');
            if (BOND_COLORS[colorKey]) {
                currentBondColor = BOND_COLORS[colorKey];
            }
        });
    });

    labelBtn.addEventListener('click', () => {
        showLabels = !showLabels;
        updateToggleBtnText();
        if(showLabels) {
            labelBtn.classList.add('active');
        } else {
            labelBtn.classList.remove('active');
        }
    });
}

function updateMoleculeCount(newCount) {
    if (newCount > molecules.length) {
        let needed = newCount - molecules.length;
        for (let i = 0; i < needed; i++) {
            createSafeMolecule(molecules.length); 
        }
    } 
    else if (newCount < molecules.length) {
        molecules.splice(newCount, molecules.length - newCount);
    }
    
    numMolecules = newCount;
}

function createSafeMolecule(id) {
    let m = new Molecule(id);
    let safe = false;
    let attempts = 0;
    while (!safe && attempts < 100) {
        safe = true;
        m.randomizePosition();
        for (let other of molecules) {
            if (m.pos.dist(other.pos) < O_RADIUS * 2.5) { 
                safe = false;
                break;
            }
        }
        attempts++;
    }
    molecules.push(m);
}

function updateInterfaceLanguage() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        if (el.id === 'toggleLabelsBtn') return;
        const text = el.getAttribute(`data-${currentLang}`);
        if (text) el.innerText = text;
    });
    updateToggleBtnText();
}

function updateToggleBtnText() {
    const btn = document.getElementById('toggleLabelsBtn');
    const state = showLabels ? 'on' : 'off';
    const text = btn.getAttribute(`data-${currentLang}-${state}`);
    if (text) btn.innerText = text;
}

function windowResized() {
    let cW, cH;
    
    // [TỐI ƯU MOBILE] Tính toán lại kích thước khi xoay màn hình hoặc resize
    if (windowWidth <= 768) {
        // Mobile: Sidebar đẩy xuống dưới, Canvas chiếm 60%
        cW = windowWidth;
        cH = windowHeight * 0.6;
    } else {
        // Desktop: Sidebar bên trái
        cW = windowWidth - DESKTOP_SIDEBAR_WIDTH;
        cH = windowHeight;
    }
    
    resizeCanvas(cW, cH);
    adjustCamera();
}

function adjustCamera() {
    let boundingSphereRadius = boxSize * 2 * 0.866; 
    let safetyFactor = 2.5; 
    let camZ = (boundingSphereRadius * safetyFactor) / tan(PI / 6); 
    if (width < height) camZ *= (height / width);
    camera(0, 0, camZ, 0, 0, 0, 0, 1, 0);
}

function draw() {
    background(0); 
    orbitControl();

    push();
    noFill();
    stroke(80); 
    strokeWeight(1);
    box(boxSize * 2);

    ambientLight(100); 
    directionalLight(150, 150, 150, 0.5, 0.5, -1);
    directionalLight(120, 120, 120, -0.5, -0.5, 1);
    directionalLight(120, 120, 120, -0.5, 0.5, -1);
    directionalLight(120, 120, 120, 0.5, -0.5, 1);

    for (let m of molecules) {
        m.update();
        m.checkEdges();
    }
    
    solveDetailedCollisions();
    processAndDrawBonds();

    for (let m of molecules) {
        m.display();
    }
    pop();
}

function solveDetailedCollisions() {
    for (let k = 0; k < 3; k++) { 
        for (let i = 0; i < molecules.length; i++) {
            let mA = molecules[i];
            let atomsA = [
                { pos: mA.pos, r: O_RADIUS }, 
                { pos: mA.getGlobalH1Pos(), r: H_RADIUS },   
                { pos: mA.getGlobalH2Pos(), r: H_RADIUS }    
            ];

            for (let j = i + 1; j < molecules.length; j++) {
                let mB = molecules[j];
                let atomsB = [
                    { pos: mB.pos, r: O_RADIUS },
                    { pos: mB.getGlobalH1Pos(), r: H_RADIUS },
                    { pos: mB.getGlobalH2Pos(), r: H_RADIUS }
                ];

                for (let atomA of atomsA) {
                    for (let atomB of atomsB) {
                        let distVec = p5.Vector.sub(atomA.pos, atomB.pos);
                        let d = distVec.mag();
                        let minDist = atomA.r + atomB.r; 

                        if (d < minDist && d > 0) {
                            let overlap = minDist - d;
                            let pushDir = distVec.copy().normalize();
                            let separationVec = pushDir.mult(overlap * 0.5);
                            
                            mA.pos.add(separationVec);
                            mB.pos.sub(separationVec);
                            
                            let normal = p5.Vector.sub(mA.pos, mB.pos).normalize();
                            let vDotN = p5.Vector.sub(mA.vel, mB.vel).dot(normal);
                            
                            if (vDotN < 0) {
                                let impulse = normal.mult(vDotN); 
                                mA.vel.sub(impulse);
                                mB.vel.add(impulse);
                            }
                        }
                    }
                }
            }
        }
    }
}

function draw3DLabel(txt, x, y, z) {
    if (!showLabels) return;
    push();
    translate(x, y, z);
    
    let cam = _renderer._curCamera;
    let camPos = createVector(cam.eyeX, cam.eyeY, cam.eyeZ);
    let toCam = p5.Vector.sub(camPos, createVector(x, y, z));
    
    let theta = atan2(toCam.x, toCam.z);
    let phi = -atan2(toCam.y, sqrt(toCam.x*toCam.x + toCam.z*toCam.z));
    
    rotateY(theta);
    rotateX(phi);
    
    translate(0, 0, O_RADIUS + 5); 
    
    textAlign(CENTER, CENTER);
    let size = (txt === "O") ? 26 : 14; 
    textSize(size);
    noStroke();
    
    fill(0); 
    stroke(255);
    strokeWeight(3);
    
    text(txt, 0, 0);
    pop();
}

function processAndDrawBonds() {
    let potentialBonds = [];

    for (let i = 0; i < molecules.length; i++) {
        let mA = molecules[i];
        let h1A = mA.getGlobalH1Pos();
        let h2A = mA.getGlobalH2Pos();

        for (let j = 0; j < molecules.length; j++) {
            if (i === j) continue;
            let mB = molecules[j]; 
            let oB = mB.pos.copy(); 

            let bondInfo1 = checkBondPotential(mA, mB, h1A, oB, i, j);
            if (bondInfo1) {
                potentialBonds.push({
                    hMolIdx: i, hIdx: 1, oMolIdx: j,
                    dist: bondInfo1.dist,
                    score: bondInfo1.score, 
                    posH: h1A, posO: oB
                });
            }

            let bondInfo2 = checkBondPotential(mA, mB, h2A, oB, i, j);
            if (bondInfo2) {
                potentialBonds.push({
                    hMolIdx: i, hIdx: 2, oMolIdx: j,
                    dist: bondInfo2.dist,
                    score: bondInfo2.score,
                    posH: h2A, posO: oB
                });
            }
        }
    }

    potentialBonds.sort((a, b) => a.score - b.score);

    let hBondCount = {}; 
    let oBondCount = {}; 
    let molPairConnection = {}; 

    for (let bond of potentialBonds) {
        let hKey = `${bond.hMolIdx}_${bond.hIdx}`;
        let oKey = `${bond.oMolIdx}`;
        let pairKey = `${bond.hMolIdx}->${bond.oMolIdx}`;
        
        if (hBondCount[hKey] && hBondCount[hKey] >= 1) continue;
        if (oBondCount[oKey] && oBondCount[oKey] >= 2) continue;
        if (molPairConnection[pairKey]) continue;

        hBondCount[hKey] = 1;
        oBondCount[oKey] = (oBondCount[oKey] || 0) + 1;
        molPairConnection[pairKey] = true;

        applyBondPhysicsAndVisuals(bond);
    }
}

function checkSphereIntersection(start, dir, len, sphereCenter, radius) {
    let vToCenter = p5.Vector.sub(sphereCenter, start);
    let t = vToCenter.dot(dir);

    if (t > 0 && t < len) {
        let closestPoint = p5.Vector.add(start, p5.Vector.mult(dir, t));
        let dist = closestPoint.dist(sphereCenter);
        if (dist < radius) return true;
    }
    return false;
}

function isPathObstructed(start, end, ignoreIdx1, ignoreIdx2) {
    let vecBond = p5.Vector.sub(end, start);
    let bondLen = vecBond.mag();
    let bondDir = vecBond.copy().normalize();

    for (let k = 0; k < molecules.length; k++) {
        if (k === ignoreIdx1 || k === ignoreIdx2) continue;

        let m = molecules[k];

        if (checkSphereIntersection(start, bondDir, bondLen, m.pos, O_RADIUS)) return true;
        if (checkSphereIntersection(start, bondDir, bondLen, m.getGlobalH1Pos(), H_RADIUS)) return true;
        if (checkSphereIntersection(start, bondDir, bondLen, m.getGlobalH2Pos(), H_RADIUS)) return true;
    }
    return false;
}

function checkBondPotential(molH, molO, posH, posO, idxH, idxO) {
    let d = posH.dist(posO);
    if (d > H_BOND_DISTANCE) return null;

    let posO_Donor = molH.pos;
    let dirCovalent = p5.Vector.sub(posH, posO_Donor).normalize();
    let dirHBond = p5.Vector.sub(posO, posH).normalize();

    let linearity = dirCovalent.dot(dirHBond);
    if (linearity < 0.6) return null;

    let dirOtoH = p5.Vector.mult(dirHBond, -1); 
    let lp1 = molO.getGlobalLonePair1Dir();
    let lp2 = molO.getGlobalLonePair2Dir();
    let align1 = dirOtoH.dot(lp1);
    let align2 = dirOtoH.dot(lp2);
    let maxLPAlign = max(align1, align2);

    if (maxLPAlign < 0.5) return null;

    if (isPathObstructed(posH, posO, idxH, idxO)) return null;

    let angleQuality = (linearity + maxLPAlign) / 2; 
    let score = d * (2.0 - angleQuality); 

    return { dist: d, score: score };
}

function applyBondPhysicsAndVisuals(bond) {
    let mA = molecules[bond.hMolIdx]; 
    let mB = molecules[bond.oMolIdx]; 
    let posH = bond.posH;
    let posO = bond.posO;
    let d = bond.dist;

    let alpha = map(d, 0, H_BOND_DISTANCE, 255, 50); 
    drawFineDashedLineSurface(posH, posO, alpha, currentBondColor);

    let force = p5.Vector.sub(posO, posH);
    force.normalize();
    let strength = BOND_STRENGTH * map(d, 0, H_BOND_DISTANCE, 0.5, 1.5);
    force.mult(strength);
    
    mB.applyForce(force.copy().mult(-1));
    mA.applyForce(force);
}

function drawFineDashedLineSurface(centerH, centerO, alphaVal, colorRGB) {
    let vecHO = p5.Vector.sub(centerO, centerH);
    let distTotal = vecHO.mag();
    let dir = vecHO.copy().normalize();
    let startOffset = max(0, H_RADIUS - 2); 
    let endOffset = max(0, O_RADIUS - 2);
    let startPoint = p5.Vector.add(centerH, p5.Vector.mult(dir, startOffset));
    let drawDist = distTotal - startOffset - endOffset;
    if (drawDist <= 0) return;
    let dashLen = 3; 
    let gapLen = 2;
    let cycle = dashLen + gapLen;
    let segments = Math.floor(drawDist / cycle);

    push();
    let [r, g, b] = colorRGB;
    emissiveMaterial(r, g, b); 
    fill(r, g, b, alphaVal);
    noStroke();
    for (let i = 0; i <= segments; i++) {
        let currentLocalDist = i * cycle;
        if (currentLocalDist >= drawDist) break;
        let actualDashLen = dashLen;
        if (currentLocalDist + actualDashLen > drawDist) actualDashLen = drawDist - currentLocalDist;
        let p1 = p5.Vector.add(startPoint, p5.Vector.mult(dir, currentLocalDist));
        let p2 = p5.Vector.add(startPoint, p5.Vector.mult(dir, currentLocalDist + actualDashLen));
        drawCylinderBetweenPoints(p1, p2, 0.4);
    }
    pop();
}

function drawCylinderBetweenPoints(p1, p2, radius) {
    let v = p5.Vector.sub(p2, p1);
    let len = v.mag();
    if (len < 0.1) return;
    let center = p5.Vector.add(p1, p2).div(2);
    push();
    translate(center.x, center.y, center.z);
    let up = createVector(0, 1, 0); 
    let axis = up.cross(v);
    let dot = up.dot(v);
    let angle = acos(dot / len);
    if (axis.mag() > 0.001) rotate(angle, axis);
    else if (dot < 0) rotateX(PI);
    cylinder(radius, len, 24, 1);
    pop();
}

class Molecule {
    constructor(id) {
        this.id = id; 
        this.pos = createVector(0, 0, 0);
        this.vel = p5.Vector.random3D().mult(0.5);
        this.acc = createVector(0, 0, 0);
        this.rot = createVector(random(TWO_PI), random(TWO_PI), random(TWO_PI));
        this.baseRotVel = createVector(random(-0.02, 0.02), random(-0.02, 0.02), random(-0.02, 0.02));
        
        let hx = sin(H_ANGLE / 2) * OH_BOND_LENGTH;
        let hy = cos(H_ANGLE / 2) * OH_BOND_LENGTH;
        this.h1Local = createVector(-hx, -hy, 0);
        this.h2Local = createVector(hx, -hy, 0);

        let tetAngleHalf = (109.5 / 2) * (Math.PI / 180);
        this.lp1LocalDir = createVector(0, cos(tetAngleHalf), sin(tetAngleHalf));
        this.lp2LocalDir = createVector(0, cos(tetAngleHalf), -sin(tetAngleHalf));
    }

    randomizePosition() {
        let limit = boxSize - O_RADIUS * 2;
        this.pos = createVector(random(-limit, limit), random(-limit, limit), random(-limit, limit));
    }

    applyForce(force) { this.acc.add(force); }

    update() {
        this.vel.add(this.acc);
        
        if (maxSpeed <= 0.01) {
            this.vel.mult(0);
        } else {
            if (this.vel.mag() === 0) this.vel = p5.Vector.random3D();
            
            this.vel.normalize();
            this.vel.mult(maxSpeed);
            
            this.pos.add(this.vel);
            
            let speedFactor = maxSpeed / 1.5;
            let currentRotVel = p5.Vector.mult(this.baseRotVel, speedFactor);
            this.rot.add(currentRotVel);
        }
        this.acc.mult(0); 
    }

    checkEdges() {
        let limit = boxSize - O_RADIUS;
        let bounce = -0.8;
        if (this.pos.x > limit) { this.pos.x = limit; this.vel.x *= bounce; }
        else if (this.pos.x < -limit) { this.pos.x = -limit; this.vel.x *= bounce; }
        if (this.pos.y > limit) { this.pos.y = limit; this.vel.y *= bounce; }
        else if (this.pos.y < -limit) { this.pos.y = -limit; this.vel.y *= bounce; }
        if (this.pos.z > limit) { this.pos.z = limit; this.vel.z *= bounce; }
        else if (this.pos.z < -limit) { this.pos.z = -limit; this.vel.z *= bounce; }
    }

    rotateVectorOnly(vInput) {
        let v = vInput.copy();
        let x = v.x * cos(this.rot.z) - v.y * sin(this.rot.z);
        let y = v.x * sin(this.rot.z) + v.y * cos(this.rot.z);
        v.x = x; v.y = y;
        x = v.x * cos(this.rot.y) + v.z * sin(this.rot.y);
        let z = -v.x * sin(this.rot.y) + v.z * cos(this.rot.y);
        v.x = x; v.z = z;
        y = v.y * cos(this.rot.x) - v.z * sin(this.rot.x);
        z = v.y * sin(this.rot.x) + v.z * cos(this.rot.x);
        v.y = y; v.z = z;
        return v;
    }

    getGlobalPos(localVec) {
        let v = this.rotateVectorOnly(localVec);
        v.add(this.pos);
        return v;
    }

    getGlobalH1Pos() { return this.getGlobalPos(this.h1Local); }
    getGlobalH2Pos() { return this.getGlobalPos(this.h2Local); }

    getGlobalLonePair1Dir() { return this.rotateVectorOnly(this.lp1LocalDir); }
    getGlobalLonePair2Dir() { return this.rotateVectorOnly(this.lp2LocalDir); }

    display() {
        push();
        translate(this.pos.x, this.pos.y, this.pos.z);
        rotateX(this.rot.x);
        rotateY(this.rot.y);
        rotateZ(this.rot.z);
        
        this.drawCovalentBond(createVector(0,0,0), this.h1Local);
        this.drawCovalentBond(createVector(0,0,0), this.h2Local);
        
        noStroke();
        
        // --- CHÌA KHÓA MÀU SẮC ---
        ambientMaterial(255, 0, 0); 
        emissiveMaterial(60, 0, 0);
        
        sphere(O_RADIUS, 60, 60);
        
        emissiveMaterial(0, 0, 0);
        ambientMaterial(255);
        
        push(); translate(this.h1Local.x, this.h1Local.y, this.h1Local.z); 
        sphere(H_RADIUS, 48, 48); 
        pop();
        
        push(); translate(this.h2Local.x, this.h2Local.y, this.h2Local.z); 
        sphere(H_RADIUS, 48, 48); 
        pop();
        
        pop(); 

        if (showLabels) {
            draw3DLabel("O", this.pos.x, this.pos.y, this.pos.z);
            let h1 = this.getGlobalH1Pos();
            draw3DLabel("H", h1.x, h1.y, h1.z);
            let h2 = this.getGlobalH2Pos();
            draw3DLabel("H", h2.x, h2.y, h2.z);
        }
    }

    drawCovalentBond(p1, p2) {
        let v = p5.Vector.sub(p2, p1);
        let len = v.mag();
        let center = p5.Vector.add(p1, p2).div(2);
        push();
        translate(center.x, center.y, center.z);
        let up = createVector(0, 1, 0);
        let axis = up.cross(v);
        let angle = acos(up.dot(v) / len);
        if (axis.mag() > 0.001) rotate(angle, axis);
        else if (up.dot(v) < 0) rotateX(PI);
        let splitDistFromO = O_RADIUS + (len - O_RADIUS - H_RADIUS) / 2;
        let bondRadius = 5;
        noStroke();
        
        emissiveMaterial(0, 0, 0);

        push(); translate(0, -len/2 + splitDistFromO/2, 0); ambientMaterial(255, 0, 0); cylinder(bondRadius, splitDistFromO, 24, 1); pop();
        let whiteLen = len - splitDistFromO;
        push(); translate(0, len/2 - whiteLen/2, 0); ambientMaterial(255); cylinder(bondRadius, whiteLen, 24, 1); pop();
        pop();
    }
}