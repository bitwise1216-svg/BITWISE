/**
 * bitwise. — 3D Motion Graphic Background Engine
 * High-performance 3D particle lattice, rotating geometric wireframes,
 * mouse-interactive perspective camera, and scroll-driven depth flythrough.
 * Zero external dependencies. Hardware-accelerated Canvas 3D mathematics.
 */

(function () {
  'use strict';

  var canvas = document.getElementById('bg-motion-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'bg-motion-canvas';
    canvas.className = 'bg-motion-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(canvas, document.body.firstChild);
  }

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Canvas Dimensions & DPI ──
  var width = 0;
  var height = 0;
  var cx = 0;
  var cy = 0;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    cx = width / 2;
    cy = height / 2;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();

  // ── 3D Camera & Scene State ──
  var FOV = 650;
  var camera = {
    x: 0,
    y: 0,
    z: 0,
    rotX: 0,
    rotY: 0,
    targetRotX: 0,
    targetRotY: 0,
    targetZ: 0,
    scrollZSpeed: 0
  };

  // Mouse tracking
  var mouse = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    screenX: cx,
    screenY: cy,
    active: false
  };

  window.addEventListener('mousemove', function (e) {
    mouse.screenX = e.clientX;
    mouse.screenY = e.clientY;
    // Normalized [-1, 1]
    mouse.targetX = (e.clientX - cx) / cx;
    mouse.targetY = (e.clientY - cy) / cy;
    mouse.active = true;
  }, { passive: true });

  window.addEventListener('mouseleave', function () {
    mouse.targetX = 0;
    mouse.targetY = 0;
  });

  // Scroll velocity tracking
  var lastScrollY = window.pageYOffset || document.documentElement.scrollTop;
  var scrollVelocity = 0;

  window.addEventListener('scroll', function () {
    var currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
    var delta = currentScrollY - lastScrollY;
    scrollVelocity += delta * 0.8;
    lastScrollY = currentScrollY;
  }, { passive: true });

  // ── 3D Particle Class ──
  var NUM_PARTICLES = width < 768 ? 90 : 180;
  var particles = [];

  function Particle() {
    this.reset(true);
  }

  Particle.prototype.reset = function (initial) {
    var spreadX = Math.max(width * 1.4, 1200);
    var spreadY = Math.max(height * 2.2, 1800);
    var spreadZ = 2400;

    this.x = (Math.random() - 0.5) * spreadX;
    this.y = (Math.random() - 0.5) * spreadY;
    this.z = initial ? (Math.random() - 0.5) * spreadZ : (camera.z + 1200 + Math.random() * 400);

    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
    this.vz = -0.35 - Math.random() * 0.3;

    this.baseRadius = 1.2 + Math.random() * 2.2;
    this.alpha = 0.2 + Math.random() * 0.55;
    this.pulseSpeed = 0.02 + Math.random() * 0.03;
    this.pulsePhase = Math.random() * Math.PI * 2;

    // Is it a special geometric node or bit-cube particle?
    this.isSpecial = Math.random() < 0.15;
    this.cubeSize = 4 + Math.random() * 5;
    this.rotAngle = Math.random() * Math.PI * 2;
  };

  Particle.prototype.update = function (speedZ, time) {
    this.x += this.vx;
    this.y += this.vy;
    this.z += this.vz - speedZ;

    this.pulsePhase += this.pulseSpeed;
    this.rotAngle += 0.02;

    // Wrap around camera depth
    var relZ = this.z - camera.z;
    if (relZ < -400) {
      this.z += 2200;
      this.x = (Math.random() - 0.5) * Math.max(width * 1.4, 1200);
      this.y = (Math.random() - 0.5) * Math.max(height * 2.2, 1800);
    } else if (relZ > 1800) {
      this.z -= 2200;
    }
  };

  for (var i = 0; i < NUM_PARTICLES; i++) {
    particles.push(new Particle());
  }

  // ── 3D Wireframe Polyhedron (Bit Cube & Icosahedron) ──
  function create3DCube(size) {
    var s = size / 2;
    var vertices = [
      { x: -s, y: -s, z: -s },
      { x:  s, y: -s, z: -s },
      { x:  s, y:  s, z: -s },
      { x: -s, y:  s, z: -s },
      { x: -s, y: -s, z:  s },
      { x:  s, y: -s, z:  s },
      { x:  s, y:  s, z:  s },
      { x: -s, y:  s, z:  s }
    ];
    var edges = [
      [0,1], [1,2], [2,3], [3,0],
      [4,5], [5,6], [6,7], [7,4],
      [0,4], [1,5], [2,6], [3,7]
    ];
    return { vertices: vertices, edges: edges };
  }

  function create3DOctahedron(size) {
    var s = size;
    var vertices = [
      { x:  s, y:  0, z:  0 },
      { x: -s, y:  0, z:  0 },
      { x:  0, y:  s, z:  0 },
      { x:  0, y: -s, z:  0 },
      { x:  0, y:  0, z:  s },
      { x:  0, y:  0, z: -s }
    ];
    var edges = [
      [0,2], [2,1], [1,3], [3,0],
      [0,4], [4,1], [1,5], [5,0],
      [2,4], [4,3], [3,5], [5,2]
    ];
    return { vertices: vertices, edges: edges };
  }

  // Two interactive floating wireframes in Hero/upper space
  var heroWireframe1 = {
    model: create3DCube(140),
    x: 0,
    y: -80,
    z: 220,
    rotX: 0.2,
    rotY: 0.3,
    rotZ: 0.1,
    spinX: 0.006,
    spinY: 0.009,
    spinZ: 0.004
  };

  var heroWireframe2 = {
    model: create3DOctahedron(210),
    x: 0,
    y: -80,
    z: 220,
    rotX: 0.1,
    rotY: 0.2,
    rotZ: 0,
    spinX: -0.004,
    spinY: 0.007,
    spinZ: 0.003
  };

  // Secondary drifting 3D bit cubes in the section background
  var floatingObjects = [
    {
      model: create3DCube(75),
      x: -width * 0.35,
      y: 500,
      z: 400,
      rotX: 0.4, rotY: 0.2, rotZ: 0,
      spinX: 0.008, spinY: 0.012, spinZ: 0.005
    },
    {
      model: create3DCube(65),
      x: width * 0.38,
      y: 1100,
      z: 500,
      rotX: 0.1, rotY: 0.5, rotZ: 0.2,
      spinX: -0.007, spinY: 0.01, spinZ: -0.006
    },
    {
      model: create3DOctahedron(90),
      x: -width * 0.3,
      y: 1800,
      z: 450,
      rotX: 0.2, rotY: 0.1, rotZ: 0.3,
      spinX: 0.009, spinY: -0.006, spinZ: 0.008
    },
    {
      model: create3DCube(80),
      x: width * 0.32,
      y: 2500,
      z: 400,
      rotX: 0.3, rotY: 0.4, rotZ: 0.1,
      spinX: 0.006, spinY: 0.009, spinZ: 0.005
    }
  ];

  // ── 3D Projection Helper ──
  function project(x, y, z, camRotX, camRotY) {
    var cosY = Math.cos(camRotY);
    var sinY = Math.sin(camRotY);
    var x1 = x * cosY - z * sinY;
    var z1 = z * cosY + x * sinY;

    var cosX = Math.cos(camRotX);
    var sinX = Math.sin(camRotX);
    var y2 = y * cosX - z1 * sinX;
    var z2 = z1 * cosX + y * sinX;

    var depth = FOV + z2;
    if (depth < 10) return null;

    var scale = FOV / depth;
    return {
      x: cx + x1 * scale,
      y: cy + y2 * scale,
      scale: scale,
      depth: z2
    };
  }

  // ── Rotate Model Vertices Helper ──
  function rotatePoint(p, rx, ry, rz) {
    var y1 = p.y * Math.cos(rx) - p.z * Math.sin(rx);
    var z1 = p.z * Math.cos(rx) + p.y * Math.sin(rx);
    var x2 = p.x * Math.cos(ry) + z1 * Math.sin(ry);
    var z2 = z1 * Math.cos(ry) - p.x * Math.sin(ry);
    var x3 = x2 * Math.cos(rz) - y1 * Math.sin(rz);
    var y3 = y1 * Math.cos(rz) + x2 * Math.sin(rz);

    return { x: x3, y: y3, z: z2 };
  }

  // ── Render 3D Wireframe ──
  function renderWireframe(obj, camRotX, camRotY, globalScrollOffset, alphaMultiplier) {
    var relY = obj.y - globalScrollOffset;
    if (relY < -height * 1.5 || relY > height * 1.5) return;

    var model = obj.model;
    var projected = [];

    for (var i = 0; i < model.vertices.length; i++) {
      var rotated = rotatePoint(model.vertices[i], obj.rotX, obj.rotY, obj.rotZ);
      var worldX = obj.x + rotated.x;
      var worldY = relY + rotated.y;
      var worldZ = obj.z + rotated.z;

      var p = project(worldX, worldY, worldZ, camRotX, camRotY);
      if (!p) return;
      projected.push(p);
    }

    var avgScale = projected.reduce(function (sum, p) { return sum + p.scale; }, 0) / projected.length;
    var baseAlpha = Math.min(Math.max(avgScale * 0.35, 0.05), 0.45) * (alphaMultiplier || 1);

    ctx.save();
    ctx.lineWidth = Math.max(1 * avgScale, 0.7);

    // Draw edges
    for (var j = 0; j < model.edges.length; j++) {
      var p1 = projected[model.edges[j][0]];
      var p2 = projected[model.edges[j][1]];

      ctx.strokeStyle = 'rgba(20, 20, 20, ' + baseAlpha + ')';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Draw vertex nodes
    for (var k = 0; k < projected.length; k++) {
      var pk = projected[k];
      var nodeR = Math.max(2 * pk.scale, 1);
      ctx.fillStyle = 'rgba(10, 10, 10, ' + (baseAlpha * 1.5) + ')';
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, nodeR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ── Main Animation Loop ──
  var lastTime = performance.now();
  var animId = null;

  function render(now) {
    animId = requestAnimationFrame(render);

    var dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;

    var currentScrollY = window.pageYOffset || document.documentElement.scrollTop;

    // Smooth Camera Interpolation
    if (!prefersReduced) {
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      camera.targetRotY = mouse.x * 0.18;
      camera.targetRotX = -mouse.y * 0.14;

      camera.rotY += (camera.targetRotY - camera.rotY) * 0.08;
      camera.rotX += (camera.targetRotX - camera.rotX) * 0.08;

      scrollVelocity *= 0.92;
      var speedZ = scrollVelocity * 0.35;
      camera.z += speedZ;
    } else {
      camera.rotX = 0;
      camera.rotY = 0;
    }

    // Clear Canvas
    ctx.clearRect(0, 0, width, height);

    // Update & Project Particles
    var projectedParticles = [];

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      if (!prefersReduced) {
        p.update(scrollVelocity * 0.25, now * 0.001);
      }

      var relY = p.y - currentScrollY * 0.3;
      var proj = project(p.x, relY, p.z - camera.z, camera.rotX, camera.rotY);

      if (proj && proj.x >= -50 && proj.x <= width + 50 && proj.y >= -50 && proj.y <= height + 50) {
        projectedParticles.push({
          p: p,
          proj: proj
        });
      }
    }

    // Draw Constellation Lines
    var maxDist2D = width < 768 ? 70 : 105;
    ctx.lineWidth = 0.65;

    for (var a = 0; a < projectedParticles.length; a++) {
      var pa = projectedParticles[a];
      for (var b = a + 1; b < projectedParticles.length; b++) {
        var pb = projectedParticles[b];

        var dx = pa.proj.x - pb.proj.x;
        var dy = pa.proj.y - pb.proj.y;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDist2D) {
          var depthDiff = Math.abs(pa.p.z - pb.p.z);
          if (depthDiff < 320) {
            var lineAlpha = (1 - dist / maxDist2D) * (1 - depthDiff / 320) * 0.18;
            ctx.strokeStyle = 'rgba(20, 20, 20, ' + lineAlpha + ')';
            ctx.beginPath();
            ctx.moveTo(pa.proj.x, pa.proj.y);
            ctx.lineTo(pb.proj.x, pb.proj.y);
            ctx.stroke();
          }
        }
      }
    }

    // Draw Particles & Micro Bit Cubes
    for (var k = 0; k < projectedParticles.length; k++) {
      var item = projectedParticles[k];
      var part = item.p;
      var pr = item.proj;

      var currentRadius = (part.baseRadius + Math.sin(part.pulsePhase) * 0.4) * pr.scale;
      if (currentRadius < 0.4) currentRadius = 0.4;

      var currentAlpha = Math.min(Math.max(part.alpha * pr.scale * 1.5, 0.08), 0.75);

      if (part.isSpecial) {
        var halfSize = (part.cubeSize * pr.scale) / 2;
        ctx.save();
        ctx.translate(pr.x, pr.y);
        ctx.rotate(part.rotAngle);
        ctx.strokeStyle = 'rgba(25, 25, 25, ' + (currentAlpha * 0.8) + ')';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-halfSize, -halfSize, halfSize * 2, halfSize * 2);
        ctx.fillStyle = 'rgba(20, 20, 20, ' + (currentAlpha * 0.3) + ')';
        ctx.fillRect(-halfSize, -halfSize, halfSize * 2, halfSize * 2);
        ctx.restore();
      } else {
        ctx.fillStyle = 'rgba(20, 20, 20, ' + currentAlpha + ')';
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, currentRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Render Floating 3D Wireframes
    if (!prefersReduced) {
      heroWireframe1.rotX += heroWireframe1.spinX;
      heroWireframe1.rotY += heroWireframe1.spinY;
      heroWireframe1.rotZ += heroWireframe1.spinZ;

      heroWireframe2.rotX += heroWireframe2.spinX;
      heroWireframe2.rotY += heroWireframe2.spinY;
      heroWireframe2.rotZ += heroWireframe2.spinZ;

      for (var f = 0; f < floatingObjects.length; f++) {
        var fo = floatingObjects[f];
        fo.rotX += fo.spinX;
        fo.rotY += fo.spinY;
        fo.rotZ += fo.spinZ;
      }
    }

    var heroAlpha = Math.max(1 - (currentScrollY / (height * 0.8)), 0);
    if (heroAlpha > 0.01) {
      heroWireframe1.x = mouse.x * 35;
      heroWireframe1.y = -80 + mouse.y * 25;
      heroWireframe2.x = mouse.x * 25;
      heroWireframe2.y = -80 + mouse.y * 18;

      renderWireframe(heroWireframe1, camera.rotX, camera.rotY, currentScrollY * 0.4, heroAlpha);
      renderWireframe(heroWireframe2, camera.rotX, camera.rotY, currentScrollY * 0.4, heroAlpha * 0.8);
    }

    for (var s = 0; s < floatingObjects.length; s++) {
      renderWireframe(floatingObjects[s], camera.rotX, camera.rotY, currentScrollY * 0.5, 0.7);
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (animId) cancelAnimationFrame(animId);
      animId = null;
    } else {
      lastTime = performance.now();
      if (!animId) animId = requestAnimationFrame(render);
    }
  });

  animId = requestAnimationFrame(render);

  window.Bitwise3DMotion = {
    triggerWarp: function (intensity) {
      scrollVelocity += (intensity || 40);
    }
  };

})();
