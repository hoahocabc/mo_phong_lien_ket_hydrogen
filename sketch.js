let molecules = [];
let boxSize = 500; 
let showLabels = false;

// UI & Settings
let numMolecules = 0;
let currentLang = 'vi';
let currentMoleculeType = 'H2O';
let bondThickness = 1; 
let maxSpeed = 1.5;
let myFont; 
let isMouseOverUI = false; // Biến mới: Kiểm tra chuột có đang ở trên UI không

// Sidebar setup
const DESKTOP_SIDEBAR_WIDTH = 280; 

// Physics Constants
const BOND_STRENGTH = 0.003; 
const H_BOND_DISTANCE = 90; 
const MAX_MOLECULES = 100;

// --- CẤU HÌNH HÌNH HỌC CƠ BẢN ---
const TETRA_VECS = [
    { x: 1, y: 1, z: 1 },     
    { x: 1, y: -1, z: -1 },   
    { x: -1, y: 1, z: -1 },   
    { x: -1, y: -1, z: 1 }    
];

const MOLECULE_CONFIG = {
    'H2O': {
        centerAtom: 'O', centerRadius: 20, centerColor: [255, 0, 0], 
        hRadius: 12, bondLength: 38, 
        hIndices: [2, 3], lpIndices: [0, 1], 
        label: "H₂O",
        extraAtoms: [] 
    },
    'NH3': {
        centerAtom: 'N', centerRadius: 21, centerColor: [0, 0, 255], 
        hRadius: 12, bondLength: 38, 
        hIndices: [1, 2, 3], lpIndices: [0], 
        label: "NH₃",
        extraAtoms: []
    },
    'HF': {
        centerAtom: 'F', centerRadius: 19, centerColor: [50, 205, 50], 
        hRadius: 12, bondLength: 35, 
        hIndices: [0], lpIndices: [1, 2, 3], 
        label: "HF",
        extraAtoms: []
    },
    'C2H5OH': {
        centerAtom: 'O', centerRadius: 20, centerColor: [255, 0, 0], 
        hRadius: 12, bondLength: 38,
        hIndices: [0], 
        lpIndices: [1, 2],
        label: "C₂H₅OH",
        
        extraAtoms: [
            { 
                type: 'C', radius: 18, color: [80, 80, 80], 
                label: "C", 
                parentAtom: 'center', 
                posFunc: (bondLen) => {
                    let v = createVector(-1, -1, 1); 
                    return v.normalize().mult(bondLen * 1.4); 
                }
            },
            {
                type: 'C', radius: 18, color: [80, 80, 80],
                label: "C",
                parentAtom: 0, 
                posFunc: (bondLen) => {
                    let c1Pos = createVector(-1, -1, 1).normalize().mult(bondLen * 1.4);
                    let dir = createVector(-1, -1, -1).normalize(); 
                    return p5.Vector.add(c1Pos, dir.mult(bondLen * 1.5)); 
                }
            },
            {
                type: 'H', radius: 12, color: [220, 220, 220], label: "H",
                parentAtom: 0, 
                posFunc: (bondLen) => {
                    let c1Pos = createVector(-1, -1, 1).normalize().mult(bondLen * 1.4);
                    let dir = createVector(-1, 1, 1).normalize(); 
                    return p5.Vector.add(c1Pos, dir.mult(bondLen * 1.1));
                }
            },
            {
                type: 'H', radius: 12, color: [220, 220, 220], label: "H",
                parentAtom: 0, 
                posFunc: (bondLen) => {
                    let c1Pos = createVector(-1, -1, 1).normalize().mult(bondLen * 1.4);
                    let dir = createVector(1, -1, 1).normalize();
                    return p5.Vector.add(c1Pos, dir.mult(bondLen * 1.1));
                }
            },
            {
                type: 'H', radius: 12, color: [220, 220, 220], label: "H",
                parentAtom: 1, 
                posFunc: (bondLen) => {
                    let c1Pos = createVector(-1, -1, 1).normalize().mult(bondLen * 1.4);
                    let c2Pos = p5.Vector.add(c1Pos, createVector(-1, -1, -1).normalize().mult(bondLen * 1.5));
                    let dir = createVector(1, -1, -1).normalize(); 
                    return p5.Vector.add(c2Pos, dir.mult(bondLen * 1.1));
                }
            },
            {
                type: 'H', radius: 12, color: [220, 220, 220], label: "H",
                parentAtom: 1, 
                posFunc: (bondLen) => {
                    let c1Pos = createVector(-1, -1, 1).normalize().mult(bondLen * 1.4);
                    let c2Pos = p5.Vector.add(c1Pos, createVector(-1, -1, -1).normalize().mult(bondLen * 1.5));
                    let dir = createVector(-1, 1, -1).normalize(); 
                    return p5.Vector.add(c2Pos, dir.mult(bondLen * 1.1));
                }
            },
            {
                type: 'H', radius: 12, color: [220, 220, 220], label: "H",
                parentAtom: 1, 
                posFunc: (bondLen) => {
                    let c1Pos = createVector(-1, -1, 1).normalize().mult(bondLen * 1.4);
                    let c2Pos = p5.Vector.add(c1Pos, createVector(-1, -1, -1).normalize().mult(bondLen * 1.5));
                    let dir = createVector(-1, -1, 1).normalize(); 
                    return p5.Vector.add(c2Pos, dir.mult(bondLen * 1.1));
                }
            }
        ]
    }
};

function preload() {
    try { myFont = loadFont('Arial.ttf'); } catch (e) { console.log("Font default"); }
}

function setup() {
    pixelDensity(min(window.devicePixelRatio, 2)); 
    let dims = calculateCanvasSize();
    let canvas = createCanvas(dims.w, dims.h, WEBGL);
    canvas.parent('canvas-container');
    
    setAttributes('antialias', true);
    setAttributes('perPixelLighting', true);
    
    if(myFont) textFont(myFont);
    adjustCamera();
    setupUI();
    setupMobileMenu(); 
}

function calculateCanvasSize() {
    let w, h;
    if (windowWidth <= 768) {
        w = windowWidth; h = windowHeight;
    } else {
        w = windowWidth - DESKTOP_SIDEBAR_WIDTH; h = windowHeight;
    }
    return { w: w, h: h };
}

function setupMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const closeBtn = document.getElementById('close-sidebar-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    function openMenu() { sidebar.classList.add('active'); overlay.classList.add('active'); }
    function closeMenu() { sidebar.classList.remove('active'); overlay.classList.remove('active'); }

    menuBtn.addEventListener('click', openMenu);
    closeBtn.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);
}

function setupUI() {
    const countInput = document.getElementById('moleculeCount');
    const labelBtn = document.getElementById('toggleLabelsBtn');
    const langSelect = document.getElementById('langSelect');
    const speedSlider = document.getElementById('speedSlider');
    const typeSelect = document.getElementById('moleculeType');
    
    // MỚI: Xử lý sự kiện chuột trên Sidebar để tắt orbitControl
    const sidebar = document.getElementById('sidebar');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');

    const setMouseOverTrue = () => { isMouseOverUI = true; };
    const setMouseOverFalse = () => { isMouseOverUI = false; };

    if (sidebar) {
        sidebar.addEventListener('mouseenter', setMouseOverTrue);
        sidebar.addEventListener('mouseleave', setMouseOverFalse);
        // Hỗ trợ touch trên mobile để chắc chắn không xoay khi chạm sidebar
        sidebar.addEventListener('touchstart', setMouseOverTrue, {passive: true});
        sidebar.addEventListener('touchend', setMouseOverFalse);
    }

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('mouseenter', setMouseOverTrue);
        mobileMenuBtn.addEventListener('mouseleave', setMouseOverFalse);
    }

    updateInterfaceLanguage();

    langSelect.addEventListener('change', (e) => {
        currentLang = e.target.value;
        updateInterfaceLanguage();
    });

    typeSelect.addEventListener('change', (e) => {
        currentMoleculeType = e.target.value;
        let currentCount = parseInt(countInput.value);
        molecules = [];
        updateMoleculeCount(currentCount);
    });

    countInput.addEventListener('input', (e) => {
        let val = parseInt(e.target.value);
        if (isNaN(val) || val < 0) val = 0;
        if (val > MAX_MOLECULES) val = MAX_MOLECULES; 
        updateMoleculeCount(val);
    });

    speedSlider.addEventListener('input', (e) => {
        maxSpeed = parseFloat(e.target.value);
    });

    labelBtn.addEventListener('click', () => {
        showLabels = !showLabels;
        updateToggleBtnText();
        if(showLabels) labelBtn.classList.add('active');
        else labelBtn.classList.remove('active');
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
    let typeToCreate = currentMoleculeType;
    if (currentMoleculeType === 'MIX_H2O_C2H5OH') {
        typeToCreate = random() < 0.5 ? 'H2O' : 'C2H5OH';
    }

    let m = new Molecule(id, typeToCreate);
    let safe = false;
    let attempts = 0;
    
    let maxR = m.getMaxExtent(); 

    while (!safe && attempts < 100) {
        safe = true;
        m.randomizePosition();
        
        for (let other of molecules) {
            let otherMaxR = other.getMaxExtent();
            let safeDist = (maxR + otherMaxR) * 1.2;
            if (m.pos.dist(other.pos) < safeDist) { 
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

    const options = document.querySelectorAll('option[data-vi]');
    options.forEach(opt => {
        const text = opt.getAttribute(`data-${currentLang}`);
        if (text) opt.innerText = text;
    });

    if(currentLang === 'vi') {
        document.title = "Mô Phỏng Liên Kết Hydrogen - Hóa Học ABC";
    } else {
        document.title = "H-Bond Simulation - Hóa Học ABC";
    }

    updateToggleBtnText();
}

function updateToggleBtnText() {
    const btn = document.getElementById('toggleLabelsBtn');
    const state = showLabels ? 'on' : 'off';
    const text = btn.getAttribute(`data-${currentLang}-${state}`);
    if (text) btn.innerText = text;
}

function windowResized() {
    let dims = calculateCanvasSize();
    resizeCanvas(dims.w, dims.h);
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
    
    let sidebar = document.getElementById('sidebar');
    let isSidebarActive = sidebar && sidebar.classList.contains('active');
    
    // CẬP NHẬT: Chỉ bật Orbit Control khi Sidebar trên mobile tắt
    // VÀ chuột không nằm trên UI (cho desktop)
    if (!isSidebarActive && !isMouseOverUI) {
        orbitControl();
    }

    push();
    noFill(); stroke(80); strokeWeight(1);
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

// --- PHYSICS & BOND LOGIC ---

function solveDetailedCollisions() {
    let iterations = 5; 
    
    for (let k = 0; k < iterations; k++) { 
        for (let i = 0; i < molecules.length; i++) {
            let mA = molecules[i];
            let atomsA = mA.getAtomSpheres(); 

            for (let j = i + 1; j < molecules.length; j++) {
                let mB = molecules[j];
                let maxDist = mA.getMaxExtent() + mB.getMaxExtent();
                if (mA.pos.dist(mB.pos) > maxDist + 15) continue; 

                let atomsB = mB.getAtomSpheres();
                for (let atomA of atomsA) {
                    for (let atomB of atomsB) {
                        let distVec = p5.Vector.sub(atomA.pos, atomB.pos);
                        let dSq = distVec.magSq();
                        let minDist = atomA.r + atomB.r; 
                        let minDistSq = (minDist * minDist);

                        if (dSq < minDistSq && dSq > 0.001) {
                            let d = Math.sqrt(dSq);
                            let overlap = (minDist - d); 
                            
                            let pushDir = distVec.copy().normalize();
                            let separationVec = pushDir.mult(overlap * 0.55); 
                            
                            mA.pos.add(separationVec);
                            mB.pos.sub(separationVec);
                            
                            let normal = p5.Vector.sub(mA.pos, mB.pos).normalize();
                            let relativeVel = p5.Vector.sub(mA.vel, mB.vel);
                            let vDotN = relativeVel.dot(normal);
                            
                            if (vDotN < 0) {
                                let restitution = 0.9; 
                                let impulse = normal.mult(vDotN * restitution); 
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

function processAndDrawBonds() {
    let potentialBonds = [];

    for (let i = 0; i < molecules.length; i++) {
        let mA = molecules[i]; 
        let hPositionsA = mA.getGlobalHPositions(); 

        for (let j = 0; j < molecules.length; j++) {
            if (i === j) continue;
            let mB = molecules[j]; 
            if (mA.pos.dist(mB.pos) > H_BOND_DISTANCE + mA.getMaxExtent() + mB.getMaxExtent()) continue;

            let posCenterB = mB.pos.copy();

            for (let hIdx = 0; hIdx < hPositionsA.length; hIdx++) {
                let posH = hPositionsA[hIdx];
                let bondInfo = checkBondPotential(mA, mB, posH, posCenterB, i, j);
                if (bondInfo) {
                    potentialBonds.push({
                        hMolIdx: i, hIdx: hIdx, oMolIdx: j,
                        dist: bondInfo.dist, score: bondInfo.score, 
                        posH: posH, posCenter: posCenterB
                    });
                }
            }
        }
    }

    potentialBonds.sort((a, b) => a.score - b.score);
    let hUsed = {}; 
    let centerUsedCount = {}; 
    
    for (let bond of potentialBonds) {
        let acceptorConfig = molecules[bond.oMolIdx].config;
        let maxAcceptorBonds = acceptorConfig.lpIndices.length;

        let hKey = `${bond.hMolIdx}_${bond.hIdx}`;
        let centerKey = `${bond.oMolIdx}`;
        if (hUsed[hKey]) continue;
        if ((centerUsedCount[centerKey] || 0) >= maxAcceptorBonds) continue;

        hUsed[hKey] = true;
        centerUsedCount[centerKey] = (centerUsedCount[centerKey] || 0) + 1;
        applyBondPhysicsAndVisuals(bond);
    }
}

function checkBondPotential(molH, molAcceptor, posH, posAcceptorCenter, idxH, idxO) {
    let d = posH.dist(posAcceptorCenter);
    if (d > H_BOND_DISTANCE) return null;

    let posDonorCenter = molH.pos;
    let dirCovalent = p5.Vector.sub(posH, posDonorCenter).normalize();
    let dirHBond = p5.Vector.sub(posAcceptorCenter, posH).normalize();

    if (dirCovalent.dot(dirHBond) < 0.6) return null; 

    let dirAcceptorToH = p5.Vector.mult(dirHBond, -1); 
    let lpDirs = molAcceptor.getGlobalLPDirections();
    let maxLPAlign = -1;
    for (let lpDir of lpDirs) {
        let align = dirAcceptorToH.dot(lpDir);
        if (align > maxLPAlign) maxLPAlign = align;
    }

    if (maxLPAlign < 0.5) return null; 
    
    if (molecules.length < 30) {
        if (isPathObstructedGeneric(posH, posAcceptorCenter, idxH, idxO)) return null;
    }

    let angleQuality = (dirCovalent.dot(dirHBond) + maxLPAlign) / 2; 
    let score = d * (2.0 - angleQuality); 
    return { dist: d, score: score };
}

function isPathObstructedGeneric(start, end, ignoreIdx1, ignoreIdx2) {
    let vecBond = p5.Vector.sub(end, start);
    let bondLen = vecBond.mag();
    let bondDir = vecBond.copy().normalize();

    for (let k = 0; k < molecules.length; k++) {
        if (k === ignoreIdx1 || k === ignoreIdx2) continue;
        let m = molecules[k];
        if (checkSphereIntersection(start, bondDir, bondLen, m.pos, m.config.centerRadius)) return true;
    }
    return false;
}

function checkSphereIntersection(start, dir, len, sphereCenter, radius) {
    let vToCenter = p5.Vector.sub(sphereCenter, start);
    let t = vToCenter.dot(dir);
    if (t > 0 && t < len) {
        let closestPoint = p5.Vector.add(start, p5.Vector.mult(dir, t));
        if (closestPoint.dist(sphereCenter) < radius) return true;
    }
    return false;
}

function applyBondPhysicsAndVisuals(bond) {
    let mA = molecules[bond.hMolIdx]; 
    let mB = molecules[bond.oMolIdx]; 
    let d = bond.dist;
    let alpha = map(d, 0, H_BOND_DISTANCE, 255, 50); 
    
    drawFineDashedLineSurface(bond.posH, bond.posCenter, alpha, [255, 255, 0]);

    let force = p5.Vector.sub(bond.posCenter, bond.posH).normalize();
    let strength = BOND_STRENGTH * map(d, 0, H_BOND_DISTANCE, 0.5, 1.5);
    force.mult(strength);
    
    mB.applyForce(force.copy().mult(-1));
    mA.applyForce(force);
}

function drawFineDashedLineSurface(centerH, centerAcceptor, alphaVal, colorRGB) {
    let vecHO = p5.Vector.sub(centerAcceptor, centerH);
    let distTotal = vecHO.mag();
    let dir = vecHO.copy().normalize();
    
    let startPoint = centerH; 
    let drawDist = distTotal; 
    
    if (drawDist <= 0) return;
    
    let dashLen = 3; let gapLen = 2; let cycle = dashLen + gapLen;
    let segments = Math.floor(drawDist / cycle);

    push();
    let [r, g, b] = colorRGB;
    emissiveMaterial(r, g, b); 
    fill(r, g, b, alphaVal);
    noStroke();
    
    let step = (segments > 20) ? 2 : 1;

    for (let i = 0; i <= segments; i+=step) {
        let currentLocalDist = i * cycle;
        if (currentLocalDist >= drawDist) break;
        let actualDashLen = min(dashLen, drawDist - currentLocalDist);
        let p1 = p5.Vector.add(startPoint, p5.Vector.mult(dir, currentLocalDist));
        let p2 = p5.Vector.add(startPoint, p5.Vector.mult(dir, currentLocalDist + actualDashLen));
        drawCylinderBetweenPoints(p1, p2, bondThickness);
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
    cylinder(radius, len, 12, 1); 
    pop();
}

function draw3DLabel(txt, x, y, z, size = 14, radius = 0) {
    if (!showLabels) return;
    push();
    translate(x, y, z);
    
    let cam = _renderer._curCamera;
    let camPos = createVector(cam.eyeX, cam.eyeY, cam.eyeZ);
    let objPos = createVector(x, y, z);
    
    let f = p5.Vector.sub(camPos, objPos).normalize();
    let u = createVector(cam.upX, cam.upY, cam.upZ).normalize();
    let r = u.cross(f).normalize();
    u = f.cross(r).normalize();
    
    applyMatrix(r.x, r.y, r.z, 0, u.x, u.y, u.z, 0, f.x, f.y, f.z, 0, 0, 0, 0, 1);
    translate(0, 0, radius + 10); 
    
    textAlign(CENTER, CENTER);
    textSize(size);
    fill(0); stroke(255); strokeWeight(3);
    text(txt, 0, 0);
    pop();
}

// --- MOLECULE CLASS ---
class Molecule {
    constructor(id, type) {
        this.id = id; this.type = type;
        this.config = MOLECULE_CONFIG[type];
        this.pos = createVector(0, 0, 0);
        this.vel = p5.Vector.random3D().mult(0.5);
        this.acc = createVector(0, 0, 0);
        this.rot = createVector(random(TWO_PI), random(TWO_PI), random(TWO_PI));
        this.baseRotVel = p5.Vector.random3D().mult(0.02);
        this.initGeometry();
        this.maxExtent = this.calculateMaxExtent();
    }
    
    initGeometry() {
        this.hLocalPositions = []; this.lpLocalDirections = []; this.extraAtomsLocal = [];
        let bondLen = this.config.bondLength;
        
        for (let idx of this.config.hIndices) {
            let v = createVector(TETRA_VECS[idx].x, TETRA_VECS[idx].y, TETRA_VECS[idx].z).normalize().mult(bondLen);
            this.hLocalPositions.push(v);
        }
        for (let idx of this.config.lpIndices) {
            let v = createVector(TETRA_VECS[idx].x, TETRA_VECS[idx].y, TETRA_VECS[idx].z).normalize();
            this.lpLocalDirections.push(v);
        }
        if (this.config.extraAtoms) {
            for (let i = 0; i < this.config.extraAtoms.length; i++) {
                let atomConf = this.config.extraAtoms[i];
                let pos = atomConf.posFunc(bondLen);
                this.extraAtomsLocal.push(pos);
            }
        }
    }

    calculateMaxExtent() {
        let maxR = this.config.centerRadius;
        for (let hVec of this.hLocalPositions) {
            let d = hVec.mag() + this.config.hRadius;
            if (d > maxR) maxR = d;
        }
        if (this.config.extraAtoms) {
            for (let i = 0; i < this.extraAtomsLocal.length; i++) {
                let pos = this.extraAtomsLocal[i];
                let radius = this.config.extraAtoms[i].radius;
                let d = pos.mag() + radius;
                if (d > maxR) maxR = d;
            }
        }
        return maxR;
    }

    getMaxExtent() {
        return this.maxExtent;
    }

    randomizePosition() {
        let extent = this.getMaxExtent();
        let limit = boxSize - extent;
        this.pos = createVector(random(-limit, limit), random(-limit, limit), random(-limit, limit));
    }

    applyForce(force) { this.acc.add(force); }

    update() {
        this.vel.add(this.acc);
        if (maxSpeed <= 0.01) this.vel.mult(0);
        else {
            if (this.vel.mag() === 0) this.vel = p5.Vector.random3D();
            this.vel.normalize().mult(maxSpeed);
            this.pos.add(this.vel);
            this.rot.add(p5.Vector.mult(this.baseRotVel, maxSpeed / 1.5));
        }
        this.acc.mult(0); 
    }

    checkEdges() {
        let atomSpheres = this.getAtomSpheres();
        let bouncedX = false, bouncedY = false, bouncedZ = false;
        let damping = 0.8;
        
        for (let atom of atomSpheres) {
            let r = atom.r;
            
            // X Axis
            if (atom.pos.x > boxSize - r) {
                let overshoot = atom.pos.x - (boxSize - r);
                this.pos.x -= overshoot; 
                if (!bouncedX) { this.vel.x *= -1 * damping; bouncedX = true; }
            } else if (atom.pos.x < -boxSize + r) {
                let overshoot = (-boxSize + r) - atom.pos.x;
                this.pos.x += overshoot;
                if (!bouncedX) { this.vel.x *= -1 * damping; bouncedX = true; }
            }
            
            // Y Axis
            if (atom.pos.y > boxSize - r) {
                let overshoot = atom.pos.y - (boxSize - r);
                this.pos.y -= overshoot;
                if (!bouncedY) { this.vel.y *= -1 * damping; bouncedY = true; }
            } else if (atom.pos.y < -boxSize + r) {
                let overshoot = (-boxSize + r) - atom.pos.y;
                this.pos.y += overshoot;
                if (!bouncedY) { this.vel.y *= -1 * damping; bouncedY = true; }
            }
            
            // Z Axis
            if (atom.pos.z > boxSize - r) {
                let overshoot = atom.pos.z - (boxSize - r);
                this.pos.z -= overshoot;
                if (!bouncedZ) { this.vel.z *= -1 * damping; bouncedZ = true; }
            } else if (atom.pos.z < -boxSize + r) {
                let overshoot = (-boxSize + r) - atom.pos.z;
                this.pos.z += overshoot;
                if (!bouncedZ) { this.vel.z *= -1 * damping; bouncedZ = true; }
            }
        }
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

    getGlobalPos(localVec) { return this.rotateVectorOnly(localVec).add(this.pos); }
    getGlobalHPositions() { return this.hLocalPositions.map(local => this.getGlobalPos(local)); }
    getGlobalLPDirections() { return this.lpLocalDirections.map(local => this.rotateVectorOnly(local)); }
    
    getAtomSpheres() {
        let list = [{pos: this.pos.copy(), r: this.config.centerRadius}];
        
        let hPos = this.getGlobalHPositions();
        for(let hp of hPos) list.push({pos: hp, r: this.config.hRadius});

        for(let i=0; i<this.extraAtomsLocal.length; i++) {
            let pos = this.getGlobalPos(this.extraAtomsLocal[i]);
            let r = this.config.extraAtoms[i].radius;
            list.push({pos: pos, r: r});
        }
        return list;
    }

    display() {
        push();
        translate(this.pos.x, this.pos.y, this.pos.z);
        rotateX(this.rot.x); rotateY(this.rot.y); rotateZ(this.rot.z);
        
        // 1. Vẽ H và liên kết H-O (tại Center)
        for (let hLocal of this.hLocalPositions) {
            this.drawStructureBond(
                createVector(0,0,0), hLocal, 
                this.config.centerColor, [255,255,255], 
                3, 
                this.config.centerRadius, this.config.hRadius 
            );
            
            push(); translate(hLocal.x, hLocal.y, hLocal.z);
            noStroke(); ambientMaterial(255); 
            sphere(this.config.hRadius, 32, 32); 
            pop();
        }

        // 2. Vẽ Extra Atoms
        if (this.extraAtomsLocal.length > 0) {
            for (let i = 0; i < this.extraAtomsLocal.length; i++) {
                let localPos = this.extraAtomsLocal[i];
                let atomConf = this.config.extraAtoms[i];
                
                let parentPos = createVector(0,0,0);
                let parentColor = this.config.centerColor;
                let parentRadius = this.config.centerRadius;

                if (atomConf.parentAtom !== 'center') {
                    parentPos = this.extraAtomsLocal[atomConf.parentAtom];
                    parentColor = this.config.extraAtoms[atomConf.parentAtom].color;
                    parentRadius = this.config.extraAtoms[atomConf.parentAtom].radius;
                }
                
                let myColor = (atomConf.type === 'H') ? [255,255,255] : atomConf.color;
                let bRad = (atomConf.type === 'H') ? 3 : 4; 

                this.drawStructureBond(parentPos, localPos, parentColor, myColor, bRad, parentRadius, atomConf.radius);

                push();
                translate(localPos.x, localPos.y, localPos.z);
                noStroke();
                let c = atomConf.color;
                ambientMaterial(c[0], c[1], c[2]);
                sphere(atomConf.radius, 32, 32);
                pop();
            }
        }
        
        // 3. Vẽ Atom trung tâm
        noStroke();
        let c = this.config.centerColor;
        ambientMaterial(c[0], c[1], c[2]);
        emissiveMaterial(c[0]/4, c[1]/4, c[2]/4); 
        sphere(this.config.centerRadius, 48, 48);
        pop();

        // 4. Vẽ Nhãn (Labels)
        if (showLabels) {
            draw3DLabel(this.config.centerAtom, this.pos.x, this.pos.y, this.pos.z, 24, this.config.centerRadius);
            
            let hPos = this.getGlobalHPositions();
            for (let hp of hPos) draw3DLabel("H", hp.x, hp.y, hp.z, 12, this.config.hRadius);
            
            for(let i=0; i<this.extraAtomsLocal.length; i++) {
                let gp = this.getGlobalPos(this.extraAtomsLocal[i]);
                let lbl = this.config.extraAtoms[i].label;
                draw3DLabel(lbl, gp.x, gp.y, gp.z, 14, this.config.extraAtoms[i].radius);
            }
        }
    }

    drawStructureBond(p1, p2, color1, color2, bondRadius, r1, r2) {
        let v = p5.Vector.sub(p2, p1);
        let dist = v.mag();
        if (dist <= 0) return;
        
        let splitDist = (dist + r1 - r2) / 2;
        
        if (splitDist < 0) splitDist = 0;
        if (splitDist > dist) splitDist = dist;

        let dir = v.copy().normalize();
        let splitPoint = p5.Vector.add(p1, p5.Vector.mult(dir, splitDist));

        let up = createVector(0, 1, 0);
        let axis = up.cross(v);
        let angle = acos(up.dot(v) / dist);
        
        noStroke();

        let center1 = p5.Vector.add(p1, splitPoint).div(2);
        let len1 = splitDist;
        
        if (len1 > 0.01) {
            push();
            translate(center1.x, center1.y, center1.z);
            if (axis.mag() > 0.001) rotate(angle, axis);
            else if (up.dot(v) < 0) rotateX(PI);
            ambientMaterial(color1[0], color1[1], color1[2]);
            cylinder(bondRadius, len1, 32, 1);
            pop();
        }

        let center2 = p5.Vector.add(splitPoint, p2).div(2);
        let len2 = dist - splitDist;

        if (len2 > 0.01) {
            push();
            translate(center2.x, center2.y, center2.z);
            if (axis.mag() > 0.001) rotate(angle, axis);
            else if (up.dot(v) < 0) rotateX(PI);
            ambientMaterial(color2[0], color2[1], color2[2]);
            cylinder(bondRadius, len2, 32, 1);
            pop();
        }
    }
}