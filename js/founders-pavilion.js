/**
 * bitwise. — Architectural Depth Pavilion Controller
 * Multi-plane stereoscopic parallax, dynamic column spring physics,
 * Bebas Neue first-name depth occlusion, and mobile segmented switcher.
 */

(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouch = window.matchMedia('(hover: none)').matches;

  var pavilion = document.getElementById('founders-pavilion');
  var pills = document.getElementById('pavilion-pills');
  if (!pavilion) return;

  var portals = pavilion.querySelectorAll('.pavilion-portal');
  var pillButtons = pills ? pills.querySelectorAll('.pavilion-pill') : [];

  // ── 1. MOBILE / TOUCH PILL SELECTOR ──
  if (pillButtons.length > 0) {
    pillButtons.forEach(function (pill) {
      pill.addEventListener('click', function () {
        var targetIndex = parseInt(this.getAttribute('data-index'), 10);

        pillButtons.forEach(function (p) { p.classList.remove('active'); });
        this.classList.add('active');

        portals.forEach(function (portal) {
          var pIdx = parseInt(portal.getAttribute('data-index'), 10);
          if (pIdx === targetIndex) {
            portal.classList.add('active');
          } else {
            portal.classList.remove('active');
          }
        });
      });
    });
  }

  if (prefersReduced) return;

  // ── 2. DESKTOP STEREOSCOPIC DEPTH PARALLAX ──
  portals.forEach(function (portal) {
    var depthName = portal.querySelector('.portal-depth-name');
    var subjectImg = portal.querySelector('.portal-subject-img');
    var lightBeam = portal.querySelector('.portal-light-beam');

    var bounds = null;
    var isHovered = false;
    var targetNx = 0, targetNy = 0;
    var currentNx = 0, currentNy = 0;
    var rafId = null;

    function renderParallax() {
      if (!isHovered && Math.abs(currentNx) < 0.005 && Math.abs(currentNy) < 0.005) {
        if (depthName) depthName.style.transform = '';
        if (subjectImg) subjectImg.style.transform = '';
        if (lightBeam) lightBeam.style.transform = '';
        rafId = null;
        return;
      }

      // Smooth critically damped lerp
      currentNx += (targetNx - currentNx) * 0.12;
      currentNy += (targetNy - currentNy) * 0.12;

      // Bebas Neue first name shifts slightly away from cursor (deeper Z-plane)
      if (depthName) {
        var textTx = (-currentNx * 22).toFixed(1);
        var textTy = (-currentNy * 14).toFixed(1);
        depthName.style.transform = 'translate(calc(-50% + ' + textTx + 'px), ' + textTy + 'px) translateZ(32px) scale(1.03)';
      }

      // Subject cutout moves forward and follows cursor (foreground Z-plane)
      if (subjectImg) {
        var subTx = (currentNx * 18).toFixed(1);
        var subTy = (currentNy * 12).toFixed(1);
        var shadowX = (-currentNx * 16).toFixed(1);
        var shadowY = (22 + currentNy * 8).toFixed(1);
        subjectImg.style.transform = 'translate3d(' + subTx + 'px, ' + (subTy - 8) + 'px, 75px) scale(1.055)';
        subjectImg.style.filter = 'drop-shadow(' + shadowX + 'px ' + shadowY + 'px 36px rgba(0, 0, 0, 0.36))';
      }

      // Light beam shifts with cursor
      if (lightBeam) {
        var beamTx = (currentNx * 35).toFixed(1);
        lightBeam.style.transform = 'translateX(calc(-50% + ' + beamTx + 'px))';
      }

      rafId = requestAnimationFrame(renderParallax);
    }

    portal.addEventListener('mouseenter', function () {
      if (isTouch) return;
      bounds = portal.getBoundingClientRect();
      isHovered = true;
      if (!rafId) rafId = requestAnimationFrame(renderParallax);
    }, { passive: true });

    portal.addEventListener('mousemove', function (e) {
      if (isTouch || !isHovered) return;
      if (!bounds) bounds = portal.getBoundingClientRect();

      var mouseX = e.clientX - bounds.left;
      var mouseY = e.clientY - bounds.top;

      // Normalized [-0.5, 0.5]
      targetNx = (mouseX / bounds.width) - 0.5;
      targetNy = (mouseY / bounds.height) - 0.5;
    }, { passive: true });

    portal.addEventListener('mouseleave', function () {
      isHovered = false;
      targetNx = 0;
      targetNy = 0;
    }, { passive: true });
  });

})();
