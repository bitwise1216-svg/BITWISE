/**
 * bitwise. — 3D Interactive Elements & Holographic Depth Engine
 * Multi-plane Z-axis parallax, 3D card tilt with dynamic specular glare,
 * hero logo 3D levitation, and magnetic 3D buttons.
 * Zero external dependencies. Hardware-accelerated CSS 3D Transforms.
 */

(function () {
  'use strict';

  var isTouch = window.matchMedia('(hover: none)').matches;
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) return;

  // ── 1. 3D CARD TILT & SPECULAR GLARE ──
  function init3DCards() {
    var selectors = [
      '.service-row',
      '.gallery-item',
      '.design-card',
      '.faq-item',
      '.contact-card',
      '.contact-form',
      '[data-tilt-3d]'
    ];

    var cards = document.querySelectorAll(selectors.join(', '));

    cards.forEach(function (card) {
      // Ensure preserve-3d
      card.classList.add('preserve-3d');

      // Create glare overlay if not present
      var glare = card.querySelector('.card-3d-glare');
      if (!glare) {
        glare = document.createElement('div');
        glare.className = 'card-3d-glare';
        card.appendChild(glare);
      }

      var bounds;
      var isHovered = false;
      var currentRotX = 0, currentRotY = 0;
      var targetRotX = 0, targetRotY = 0;
      var currentScale = 1, targetScale = 1;
      var glareX = 50, glareY = 50;
      var targetGlareX = 50, targetGlareY = 50;
      var glareOpacity = 0, targetGlareOpacity = 0;
      var rafId = null;

      var maxTilt = card.classList.contains('service-row') ? 7 : 10;

      function updateTransform() {
        if (!isHovered && Math.abs(currentRotX) < 0.05 && Math.abs(currentRotY) < 0.05 && Math.abs(currentScale - 1) < 0.005) {
          card.style.transform = '';
          if (glare) glare.style.opacity = '0';
          rafId = null;
          return;
        }

        // Spring interpolation
        currentRotX += (targetRotX - currentRotX) * 0.12;
        currentRotY += (targetRotY - currentRotY) * 0.12;
        currentScale += (targetScale - currentScale) * 0.12;
        glareX += (targetGlareX - glareX) * 0.12;
        glareY += (targetGlareY - glareY) * 0.12;
        glareOpacity += (targetGlareOpacity - glareOpacity) * 0.15;

        card.style.transform = 'perspective(1100px) rotateX(' + currentRotX.toFixed(2) + 'deg) rotateY(' + currentRotY.toFixed(2) + 'deg) scale3d(' + currentScale.toFixed(3) + ', ' + currentScale.toFixed(3) + ', ' + currentScale.toFixed(3) + ')';

        if (glare) {
          glare.style.opacity = glareOpacity.toFixed(2);
          glare.style.background = 'radial-gradient(circle at ' + glareX.toFixed(1) + '% ' + glareY.toFixed(1) + '%, rgba(255, 255, 255, 0.42) 0%, rgba(255, 255, 255, 0) 70%)';
        }

        rafId = requestAnimationFrame(updateTransform);
      }

      function onMouseEnter() {
        if (isTouch) return;
        bounds = card.getBoundingClientRect();
        isHovered = true;
        targetScale = 1.025;
        targetGlareOpacity = 1;
        if (!rafId) rafId = requestAnimationFrame(updateTransform);
      }

      function onMouseMove(e) {
        if (isTouch || !isHovered) return;
        if (!bounds) bounds = card.getBoundingClientRect();

        var mouseX = e.clientX - bounds.left;
        var mouseY = e.clientY - bounds.top;

        // Normalized [-0.5, 0.5]
        var nx = (mouseX / bounds.width) - 0.5;
        var ny = (mouseY / bounds.height) - 0.5;

        targetRotY = nx * maxTilt * 2;
        targetRotX = -ny * maxTilt * 2;

        targetGlareX = (mouseX / bounds.width) * 100;
        targetGlareY = (mouseY / bounds.height) * 100;
      }

      function onMouseLeave() {
        isHovered = false;
        targetRotX = 0;
        targetRotY = 0;
        targetScale = 1;
        targetGlareOpacity = 0;
      }

      card.addEventListener('mouseenter', onMouseEnter, { passive: true });
      card.addEventListener('mousemove', onMouseMove, { passive: true });
      card.addEventListener('mouseleave', onMouseLeave, { passive: true });
    });
  }

  // ── 2. HERO LOGO 3D LEVITATION & MOUSE PARALLAX ──
  function initHero3DLogo() {
    var hero = document.getElementById('hero');
    var wrapper = document.getElementById('hero-logo-wrapper');
    var logo = wrapper ? wrapper.querySelector('.hero-logo') : null;
    if (!hero || !wrapper || !logo) return;

    // Create 3D floating shadow element if not already present
    var shadow3D = wrapper.querySelector('.hero-logo-shadow-3d');
    if (!shadow3D) {
      shadow3D = document.createElement('div');
      shadow3D.className = 'hero-logo-shadow-3d';
      shadow3D.setAttribute('aria-hidden', 'true');
      wrapper.appendChild(shadow3D);
    }

    wrapper.classList.add('preserve-3d');

    var currentX = 0, currentY = 0;
    var targetX = 0, targetY = 0;
    var currentTiltX = 0, currentTiltY = 0;
    var targetTiltX = 0, targetTiltY = 0;
    var rafId = null;

    function updateHero3D() {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      currentTiltX += (targetTiltX - currentTiltX) * 0.08;
      currentTiltY += (targetTiltY - currentTiltY) * 0.08;

      var now = performance.now() * 0.0018;
      var ambientY = Math.sin(now) * 9;
      var ambientTiltX = Math.sin(now * 0.8) * 2.2;
      var ambientTiltY = Math.cos(now * 0.6) * 2.5;

      var totalTiltX = currentTiltX + ambientTiltX;
      var totalTiltY = currentTiltY + ambientTiltY;
      var totalY = currentY * 8 + ambientY;

      // Apply 3D perspective transform to logo
      logo.style.transform = 'perspective(900px) rotateX(' + totalTiltX.toFixed(2) + 'deg) rotateY(' + totalTiltY.toFixed(2) + 'deg) translateZ(45px) translateX(' + (currentX * 12).toFixed(1) + 'px) translateY(' + totalY.toFixed(1) + 'px)';

      // Floating shadow breathes and moves inversely in 3D
      var shadowY = 22 - totalY * 0.6;
      var shadowScale = Math.max(0.7, 1 - totalY * 0.02);
      var shadowAlpha = Math.max(0.12, 0.26 - ambientY * 0.01 + (Math.abs(currentTiltX) + Math.abs(currentTiltY)) * 0.012);

      shadow3D.style.transform = 'translateZ(-40px) translateX(' + (-currentX * 16).toFixed(1) + 'px) translateY(' + shadowY.toFixed(1) + 'px) scale(' + shadowScale.toFixed(2) + ')';
      shadow3D.style.opacity = shadowAlpha.toFixed(2);

      rafId = requestAnimationFrame(updateHero3D);
    }

    hero.addEventListener('mousemove', function (e) {
      if (isTouch) return;
      var rect = hero.getBoundingClientRect();
      var nx = (e.clientX - rect.left) / rect.width - 0.5;
      var ny = (e.clientY - rect.top) / rect.height - 0.5;

      targetX = nx;
      targetY = ny;
      targetTiltY = nx * 18;
      targetTiltX = -ny * 16;

      if (!rafId) rafId = requestAnimationFrame(updateHero3D);
    }, { passive: true });

    hero.addEventListener('mouseleave', function () {
      targetX = 0;
      targetY = 0;
      targetTiltX = 0;
      targetTiltY = 0;
    });

    rafId = requestAnimationFrame(updateHero3D);
  }

  // ── 3. MAGNETIC 3D BUTTONS ──
  function initMagneticButtons() {
    if (isTouch) return;

    var buttons = document.querySelectorAll('.btn-primary, .btn-secondary, .nav-cta-btn, .form-submit, .mobile-toggle');

    buttons.forEach(function (btn) {
      btn.classList.add('magnetic-3d-btn');

      var rect;
      var currentX = 0, currentY = 0;
      var targetX = 0, targetY = 0;
      var currentRotX = 0, currentRotY = 0;
      var targetRotX = 0, targetRotY = 0;
      var isHovered = false;
      var rafId = null;

      function updateMagnetic() {
        if (!isHovered && Math.abs(currentX) < 0.1 && Math.abs(currentY) < 0.1) {
          btn.style.transform = '';
          rafId = null;
          return;
        }

        currentX += (targetX - currentX) * 0.18;
        currentY += (targetY - currentY) * 0.18;
        currentRotX += (targetRotX - currentRotX) * 0.18;
        currentRotY += (targetRotY - currentRotY) * 0.18;

        btn.style.transform = 'perspective(600px) translate3d(' + currentX.toFixed(1) + 'px, ' + currentY.toFixed(1) + 'px, 8px) rotateX(' + currentRotX.toFixed(1) + 'deg) rotateY(' + currentRotY.toFixed(1) + 'deg)';

        rafId = requestAnimationFrame(updateMagnetic);
      }

      btn.addEventListener('mouseenter', function () {
        rect = btn.getBoundingClientRect();
        isHovered = true;
        if (!rafId) rafId = requestAnimationFrame(updateMagnetic);
      });

      btn.addEventListener('mousemove', function (e) {
        if (!rect) rect = btn.getBoundingClientRect();
        var mx = e.clientX - (rect.left + rect.width / 2);
        var my = e.clientY - (rect.top + rect.height / 2);

        targetX = mx * 0.35;
        targetY = my * 0.35;
        targetRotY = (mx / (rect.width / 2)) * 8;
        targetRotX = -(my / (rect.height / 2)) * 8;
      });

      btn.addEventListener('mouseleave', function () {
        isHovered = false;
        targetX = 0;
        targetY = 0;
        targetRotX = 0;
        targetRotY = 0;
      });
    });
  }

  // ── 4. 3D GYROSCOPE FOR MOBILE (TILT SENSOR) ──
  function initMobileGyro() {
    if (!window.DeviceOrientationEvent || !isTouch) return;

    var heroWrapper = document.getElementById('hero-logo-wrapper');
    if (!heroWrapper) return;

    var logo = heroWrapper.querySelector('.hero-logo');
    if (!logo) return;

    window.addEventListener('deviceorientation', function (e) {
      if (e.beta === null || e.gamma === null) return;
      // Clamp tilt values
      var gamma = Math.max(-25, Math.min(25, e.gamma)); // left/right
      var beta = Math.max(-25, Math.min(25, e.beta - 45)); // forward/back

      logo.style.transform = 'perspective(800px) rotateY(' + (gamma * 0.4).toFixed(1) + 'deg) rotateX(' + (-beta * 0.4).toFixed(1) + 'deg) translateZ(20px)';
    }, { passive: true });
  }

  // ── Run when DOM is ready ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      init3DCards();
      initHero3DLogo();
      initMagneticButtons();
      initMobileGyro();
    });
  } else {
    init3DCards();
    initHero3DLogo();
    initMagneticButtons();
    initMobileGyro();
  }

})();
