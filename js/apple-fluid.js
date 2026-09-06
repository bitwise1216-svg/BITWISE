/**
 * bitwise. — Apple Fluid Gestures & Momentum Physics Engine
 * Implementation of Apple's WWDC "Designing Fluid Interfaces" principles:
 * - 1:1 Direct Manipulation with grab-offset tracking
 * - Real-time velocity history tracking
 * - Apple's exponential decay momentum projection: project(v, 0.998)
 * - Apple boundary rubber-banding: rubberband(overshoot, dim, 0.55)
 * - Interruptible critically damped springs (damping 1.0, response 0.35s)
 * - Zero external dependencies. Native Pointer Events & RAF.
 */

(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Apple Fluid Physics Formulas ──

  /**
   * Apple's momentum projection function (WWDC 2018 Designing Fluid Interfaces)
   * Projects resting position based on release velocity using exponential deceleration.
   */
  function projectMomentum(initialVelocity, decelerationRate) {
    var d = decelerationRate || 0.998;
    return (initialVelocity / 1000) * d / (1 - d);
  }

  /**
   * Apple's rubber-band boundary resistance formula
   * Real physical boundaries resist progressively rather than stopping dead.
   */
  function rubberband(overshoot, dimension, constant) {
    var c = constant || 0.55;
    return (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));
  }

  // ── Direct Manipulation Carousel with Apple Physics ──
  function initAppleFluidCarousel() {
    var carousel = document.getElementById('design-carousel');
    if (!carousel) return;

    var isDragging = false;
    var startX = 0;
    var startScrollLeft = 0;
    var currentX = 0;

    // Velocity history buffer (last 100ms)
    var history = [];
    var rafId = null;

    // Spring simulation state
    var spring = {
      current: 0,
      target: 0,
      velocity: 0,
      damping: 1.0,   // Critically damped default
      response: 0.35, // Snappy 350ms settle
      running: false
    };

    function recordHistory(x) {
      var now = performance.now();
      history.push({ x: x, t: now });
      // Keep only events from the last 100ms
      while (history.length > 0 && now - history[0].t > 100) {
        history.shift();
      }
    }

    function computeReleaseVelocity() {
      if (history.length < 2) return 0;
      var first = history[0];
      var last = history[history.length - 1];
      var dt = (last.t - first.t) / 1000;
      if (dt <= 0) return 0;
      // Invert sign because scrollLeft is opposite to pointer movement
      return -(last.x - first.x) / dt;
    }

    function getSnapPoints() {
      var cards = carousel.querySelectorAll('.design-card');
      var points = [];
      var containerLeft = carousel.getBoundingClientRect().left;

      cards.forEach(function (card) {
        var cardLeft = card.getBoundingClientRect().left;
        var offset = cardLeft - containerLeft + carousel.scrollLeft;
        // Center alignment snap
        var centerOffset = offset - (carousel.clientWidth / 2 - card.clientWidth / 2);
        points.push(Math.max(0, centerOffset));
      });
      return points;
    }

    function nearestSnap(projectedVal) {
      var points = getSnapPoints();
      if (!points.length) return projectedVal;

      var best = points[0];
      var minDist = Math.abs(projectedVal - best);

      for (var i = 1; i < points.length; i++) {
        var dist = Math.abs(projectedVal - points[i]);
        if (dist < minDist) {
          minDist = dist;
          best = points[i];
        }
      }
      return best;
    }

    // ── Critically Damped Spring Animation Loop ──
    var lastFrameTime = performance.now();

    function stepSpring(now) {
      if (!spring.running) return;

      var dt = (now - lastFrameTime) / 1000;
      lastFrameTime = now;
      if (dt > 0.06) dt = 0.06; // Clamp lag spikes

      // Spring physics (damping ratio + response parameterization)
      var omega = (2 * Math.PI) / spring.response;
      var f = 1 + 2 * dt * spring.damping * omega;
      var oo = omega * omega;
      var hoo = dt * oo;
      var hhoo = dt * hoo;
      var detInv = 1 / (f + hhoo);

      var diff = spring.current - spring.target;
      var nextCurrent = (f * spring.current + dt * spring.velocity + hhoo * spring.target) * detInv;
      var nextVelocity = (spring.velocity - hoo * diff) * detInv;

      spring.current = nextCurrent;
      spring.velocity = nextVelocity;

      carousel.scrollLeft = spring.current;

      // Stop condition: close enough and low velocity
      if (Math.abs(spring.current - spring.target) < 0.5 && Math.abs(spring.velocity) < 5) {
        carousel.scrollLeft = spring.target;
        spring.running = false;
        rafId = null;
        return;
      }

      rafId = requestAnimationFrame(stepSpring);
    }

    function startSpringTo(target, initialVelocity, dampingRatio) {
      if (prefersReduced) {
        carousel.scrollLeft = target;
        return;
      }
      spring.current = carousel.scrollLeft;
      spring.target = target;
      spring.velocity = initialVelocity || 0;
      spring.damping = dampingRatio || 1.0; // Critically damped
      spring.running = true;
      lastFrameTime = performance.now();

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(stepSpring);
    }

    // ── Pointer Event Handlers (Direct Manipulation) ──

    carousel.addEventListener('pointerdown', function (e) {
      // Allow interruptibility: if spring is already animating, grab it mid-motion!
      if (spring.running) {
        spring.running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      }

      isDragging = true;
      carousel.setPointerCapture(e.pointerId);
      startX = e.clientX;
      startScrollLeft = carousel.scrollLeft;
      currentX = e.clientX;

      history = [];
      recordHistory(e.clientX);

      carousel.style.scrollBehavior = 'auto';
      carousel.style.userSelect = 'none';
      carousel.style.cursor = 'grabbing';
    });

    carousel.addEventListener('pointermove', function (e) {
      if (!isDragging) return;

      currentX = e.clientX;
      recordHistory(e.clientX);

      var delta = startX - currentX;
      var newScroll = startScrollLeft + delta;
      var maxScroll = carousel.scrollWidth - carousel.clientWidth;

      // Apply Apple rubber-banding if dragging past boundaries
      if (newScroll < 0) {
        newScroll = -rubberband(Math.abs(newScroll), carousel.clientWidth, 0.45);
      } else if (newScroll > maxScroll) {
        var overshoot = newScroll - maxScroll;
        newScroll = maxScroll + rubberband(overshoot, carousel.clientWidth, 0.45);
      }

      carousel.scrollLeft = newScroll;
    });

    function endDrag(e) {
      if (!isDragging) return;
      isDragging = false;

      carousel.style.userSelect = '';
      carousel.style.cursor = '';

      var releaseVelocity = computeReleaseVelocity();
      var currentPos = carousel.scrollLeft;
      var maxScroll = carousel.scrollWidth - carousel.clientWidth;

      // Momentum projection: project where gesture is going
      var projected = currentPos + projectMomentum(releaseVelocity, 0.998);

      // Clamp projected target to valid boundaries
      var clamped = Math.max(0, Math.min(maxScroll, projected));
      var snapTarget = nearestSnap(clamped);

      // Apple rule: use under-damped spring (damping 0.82) only if flick carried momentum
      var isFlick = Math.abs(releaseVelocity) > 250;
      var damping = isFlick ? 0.85 : 1.0;

      // Hand off release velocity into the spring
      startSpringTo(snapTarget, releaseVelocity, damping);
    }

    carousel.addEventListener('pointerup', endDrag);
    carousel.addEventListener('pointercancel', endDrag);

    // Prevent image dragging from interfering with fluid gesture
    carousel.querySelectorAll('img').forEach(function (img) {
      img.setAttribute('draggable', 'false');
    });
  }

  // ── Apple Tactile Haptic Emulation ──
  function initAppleTactileFeedback() {
    var interactiveElements = document.querySelectorAll('.btn-primary, .btn-secondary, .nav-cta-btn, .carousel-btn, .faq-question');

    interactiveElements.forEach(function (el) {
      el.addEventListener('pointerdown', function () {
        if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
          try {
            navigator.vibrate(8); // Subtle 8ms tactile click
          } catch (err) {}
        }
      }, { passive: true });
    });
  }

  // ── Run on Ready ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAppleFluidCarousel();
      initAppleTactileFeedback();
    });
  } else {
    initAppleFluidCarousel();
    initAppleTactileFeedback();
  }

})();
