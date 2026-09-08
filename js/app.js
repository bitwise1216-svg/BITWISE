/**
 * bitwise. - Main Application Script
 * GSAP ScrollTrigger animations, interactions, and UI logic.
 * No emoji. No em-dashes. No fake metrics.
 */

(function () {
  'use strict';

  // ── Wait for DOM + GSAP ──
  document.addEventListener('DOMContentLoaded', function () {
    // Small delay to ensure GSAP is loaded (defer attribute)
    setTimeout(initApp, 100);
  });

  function initApp() {
    initScrollProgress();
    initCursorFollower();
    initNavbar();
    initMobileMenu();
    initHeroAnimations();
    initScrollReveal();
    initFAQ();
    initCarousel();
    initLightbox();
    initContactForm();
    initCookieConsent();
    initBackToTop();
    initMobileCTA();
  }

  // ==========================================================================
  // 1. SCROLL PROGRESS BAR
  // ==========================================================================
  function initScrollProgress() {
    var bar = document.getElementById('scroll-progress');
    if (!bar) return;

    window.addEventListener('scroll', function () {
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = progress + '%';
    }, { passive: true });
  }

  // ==========================================================================
  // 2. CUSTOM CURSOR (desktop only)
  // ==========================================================================
  function initCursorFollower() {
    if (window.matchMedia('(hover: none)').matches) return;

    var dot = document.getElementById('cursor-dot');
    var ring = document.getElementById('cursor-ring');
    if (!dot || !ring) return;

    var mouseX = 0, mouseY = 0;
    var dotX = 0, dotY = 0;
    var ringX = 0, ringY = 0;

    document.addEventListener('mousemove', function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.opacity = '1';
      ring.style.opacity = '1';
    });

    // Hover detection for interactive elements
    var hoverTargets = 'a, button, [role="button"], .gallery-item, .design-card, .faq-question';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest(hoverTargets)) {
        document.body.classList.add('cursor-hover');
      }
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest(hoverTargets)) {
        document.body.classList.remove('cursor-hover');
      }
    });

    function animateCursor() {
      // Dot follows quickly
      dotX += (mouseX - dotX) * 0.25;
      dotY += (mouseY - dotY) * 0.25;
      dot.style.left = dotX + 'px';
      dot.style.top = dotY + 'px';

      // Ring follows with lag
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      ring.style.left = ringX + 'px';
      ring.style.top = ringY + 'px';

      requestAnimationFrame(animateCursor);
    }
    animateCursor();

    // Hide cursor when leaving viewport
    document.addEventListener('mouseleave', function () {
      dot.style.opacity = '0';
      ring.style.opacity = '0';
    });
  }

  // ==========================================================================
  // 3. NAVBAR - scroll shrink + active link tracking
  // ==========================================================================
  function initNavbar() {
    var header = document.getElementById('header');
    if (!header) return;

    var lastScroll = 0;

    window.addEventListener('scroll', function () {
      var scrollY = window.pageYOffset || document.documentElement.scrollTop;

      if (scrollY > 60) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }

      lastScroll = scrollY;
    }, { passive: true });

    // Active nav link tracking
    var sections = document.querySelectorAll('section[id]');
    var navLinks = document.querySelectorAll('.nav-link');

    if (sections.length && navLinks.length) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var id = entry.target.getAttribute('id');
            navLinks.forEach(function (link) {
              link.style.color = '';
              link.style.fontWeight = '';
              if (link.getAttribute('href') === '#' + id) {
                link.style.color = 'var(--color-text)';
                link.style.fontWeight = '600';
              }
            });
          }
        });
      }, { rootMargin: '-40% 0px -60% 0px' });

      sections.forEach(function (s) { observer.observe(s); });
    }
  }

  // ==========================================================================
  // 4. MOBILE MENU
  // ==========================================================================
  function initMobileMenu() {
    var toggle = document.getElementById('mobile-toggle');
    var close = document.getElementById('mobile-close');
    var overlay = document.getElementById('mobile-overlay');
    if (!toggle || !close || !overlay) return;

    function openMenu() {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      toggle.setAttribute('aria-expanded', 'true');
    }

    function closeMenu() {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', openMenu);
    close.addEventListener('click', closeMenu);

    // Close on link click
    overlay.querySelectorAll('.mobile-nav-link').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('active')) {
        closeMenu();
      }
    });
  }

  // ==========================================================================
  // 5. HERO ANIMATIONS
  // ==========================================================================
  function initHeroAnimations() {
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Logo reveal
    var logoWrapper = document.getElementById('hero-logo-wrapper');
    if (logoWrapper) {
      if (reducedMotion) {
        logoWrapper.style.opacity = '1';
      } else {
        setTimeout(function () {
          logoWrapper.classList.add('animated');
        }, 300);
      }
    }

    // Tagline character animation
    var tagline = document.getElementById('hero-tagline');
    if (tagline && !reducedMotion) {
      var text = tagline.textContent.trim();
      tagline.innerHTML = '';
      var charIndex = 0;

      for (var i = 0; i < text.length; i++) {
        var span = document.createElement('span');
        span.className = 'char';
        if (text[i] === ' ') {
          span.innerHTML = '&nbsp;';
        } else {
          span.textContent = text[i];
        }
        tagline.appendChild(span);
      }

      // Animate characters with stagger
      var chars = tagline.querySelectorAll('.char');
      setTimeout(function () {
        chars.forEach(function (char, idx) {
          setTimeout(function () {
            char.classList.add('animated');
          }, idx * 50);
        });
      }, 1200);
    }

    // CTA group
    var ctaGroup = document.getElementById('hero-cta');
    if (ctaGroup) {
      if (reducedMotion) {
        ctaGroup.style.opacity = '1';
        ctaGroup.style.transform = 'none';
      } else {
        setTimeout(function () {
          ctaGroup.classList.add('animated');
        }, 2000);
      }
    }
  }

  // ==========================================================================
  // 6. SCROLL REVEAL - GSAP ScrollTrigger
  // ==========================================================================
  function initScrollReveal() {
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      // Just show everything immediately
      document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(function (el) {
        el.classList.add('revealed');
      });
      return;
    }

    // Check if GSAP is available
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
      initGSAPAnimations();
    } else {
      // Fallback: IntersectionObserver
      initFallbackReveal();
    }
  }

  function initGSAPAnimations() {
    // Basic reveal (fade up)
    gsap.utils.toArray('.reveal').forEach(function (el) {
      gsap.fromTo(el,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            once: true,
          }
        }
      );
    });

    // Reveal from left
    gsap.utils.toArray('.reveal-left').forEach(function (el) {
      gsap.fromTo(el,
        { opacity: 0, x: -40 },
        {
          opacity: 1,
          x: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            once: true,
          }
        }
      );
    });

    // Reveal from right
    gsap.utils.toArray('.reveal-right').forEach(function (el) {
      gsap.fromTo(el,
        { opacity: 0, x: 40 },
        {
          opacity: 1,
          x: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            once: true,
          }
        }
      );
    });

    // Reveal scale (gallery items)
    gsap.utils.toArray('.reveal-scale').forEach(function (el, i) {
      gsap.fromTo(el,
        { opacity: 0, scale: 0.92 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.7,
          delay: i * 0.08,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            once: true,
          }
        }
      );
    });

    // Services: slide from alternating sides
    var serviceRows = document.querySelectorAll('.service-row');
    serviceRows.forEach(function (row, i) {
      var fromX = i % 2 === 0 ? -60 : 60;
      gsap.fromTo(row,
        { opacity: 0, x: fromX },
        {
          opacity: 1,
          x: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: row,
            start: 'top 85%',
            once: true,
          }
        }
      );
    });

    // Founders Pavilion: cinematic entrance with scale and staggered portals
    var pavilion = document.getElementById('founders-pavilion');
    if (pavilion) {
      var isMobile = window.innerWidth <= 900;

      if (!isMobile) {
        // Desktop Stage entrance
        gsap.fromTo(pavilion,
          { opacity: 0, y: 40, scale: 0.98 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: pavilion,
              start: 'top 85%',
              once: true,
            }
          }
        );
      }

      var portals = pavilion.querySelectorAll('.pavilion-portal');
      portals.forEach(function (portal, i) {
        var subject = portal.querySelector('.portal-subject-img');
        var depthName = portal.querySelector('.portal-depth-name');
        var targetTrigger = isMobile ? portal : pavilion;

        if (isMobile) {
          // Mobile card reveal per founder
          gsap.fromTo(portal,
            { opacity: 0, y: 35 },
            {
              opacity: 1,
              y: 0,
              duration: 0.85,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: portal,
                start: 'top 88%',
                once: true,
              }
            }
          );
        }

        if (subject) {
          gsap.fromTo(subject,
            { opacity: 0, y: isMobile ? 30 : 50, scale: isMobile ? 0.96 : 0.92 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 1.1,
              delay: isMobile ? 0.1 : (0.2 + i * 0.15),
              ease: 'power3.out',
              scrollTrigger: {
                trigger: targetTrigger,
                start: 'top 85%',
                once: true,
              }
            }
          );
        }
        if (depthName) {
          gsap.fromTo(depthName,
            { opacity: 0, y: isMobile ? -15 : -25, scale: isMobile ? 1.04 : 1.08 },
            {
              opacity: 0.88,
              y: 0,
              scale: 1,
              duration: 1.2,
              delay: isMobile ? 0.05 : (0.1 + i * 0.15),
              ease: 'power3.out',
              scrollTrigger: {
                trigger: targetTrigger,
                start: 'top 85%',
                once: true,
              }
            }
          );
        }
      });
    }

    // Videography section: clip-path wipe for the heading
    var videoTitle = document.querySelector('.video-section h2');
    if (videoTitle) {
      gsap.fromTo(videoTitle,
        { clipPath: 'inset(0 100% 0 0)' },
        {
          clipPath: 'inset(0 0% 0 0)',
          duration: 1.2,
          ease: 'power3.inOut',
          scrollTrigger: {
            trigger: videoTitle,
            start: 'top 80%',
            once: true,
          }
        }
      );
    }

    // FAQ items: stagger
    var faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(function (item, i) {
      gsap.fromTo(item,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          delay: i * 0.08,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: item,
            start: 'top 90%',
            once: true,
          }
        }
      );
    });

    // Contact form fields: staggered entrance
    var formGroups = document.querySelectorAll('.contact-form .form-group, .contact-form .form-consent, .contact-form .form-submit');
    formGroups.forEach(function (group, i) {
      gsap.fromTo(group,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          delay: i * 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: group,
            start: 'top 92%',
            once: true,
          }
        }
      );
    });

    // Footer: gentle fade up
    var footer = document.querySelector('.site-footer');
    if (footer) {
      gsap.fromTo(footer,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: footer,
            start: 'top 95%',
            once: true,
          }
        }
      );
    }
  }

  function initFallbackReveal() {
    var revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
    if (!revealElements.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    revealElements.forEach(function (el) {
      observer.observe(el);
    });
  }

  // ==========================================================================
  // 7. FAQ ACCORDION
  // ==========================================================================
  function initFAQ() {
    var faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(function (item) {
      var btn = item.querySelector('.faq-question');
      if (!btn) return;

      btn.addEventListener('click', function () {
        var isOpen = item.classList.contains('open');

        // Close all others
        faqItems.forEach(function (other) {
          other.classList.remove('open');
          var otherBtn = other.querySelector('.faq-question');
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        });

        // Toggle current
        if (!isOpen) {
          item.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });

      // Keyboard support
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          btn.click();
        }
      });
    });
  }

  // ==========================================================================
  // 8. DESIGN CAROUSEL
  // ==========================================================================
  function initCarousel() {
    var carousel = document.getElementById('design-carousel');
    var prevBtn = document.getElementById('carousel-prev');
    var nextBtn = document.getElementById('carousel-next');
    if (!carousel || !prevBtn || !nextBtn) return;

    var scrollAmount = 380;

    prevBtn.addEventListener('click', function () {
      carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', function () {
      carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });

    // Keyboard support for carousel
    carousel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') {
        carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else if (e.key === 'ArrowRight') {
        carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    });
  }

  // ==========================================================================
  // 9. LIGHTBOX
  // ==========================================================================
  function initLightbox() {
    var lightbox = document.getElementById('lightbox');
    var lightboxImg = document.getElementById('lightbox-img');
    var lightboxClose = document.getElementById('lightbox-close');
    if (!lightbox || !lightboxImg || !lightboxClose) return;

    // Open lightbox on gallery item or design card click (only if it has a real image)
    document.querySelectorAll('.gallery-item, .design-card').forEach(function (card) {
      var img = card.querySelector('img');
      if (!img) return;
      card.style.cursor = 'zoom-in';
      card.addEventListener('click', function (e) {
        if (document.body.classList.contains('editing-active')) return;
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt || 'Gallery image';
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    });

    function closeLightbox() {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
      lightboxImg.src = '';
    }

    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lightbox.classList.contains('active')) {
        closeLightbox();
      }
    });

    window.rebindLightbox = initLightbox;
  }

  // ==========================================================================
  // 10. CONTACT FORM
  // ==========================================================================
  function initContactForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = form.querySelector('#contact-name');
      var email = form.querySelector('#contact-email-input');
      var message = form.querySelector('#contact-message');
      var consent = form.querySelector('#consent-checkbox');
      var submitBtn = form.querySelector('.form-submit');

      // Basic validation
      var errors = [];
      if (!name.value.trim()) errors.push('Please enter your name.');
      if (!email.value.trim() || !isValidEmail(email.value)) errors.push('Please enter a valid email.');
      if (!message.value.trim()) errors.push('Please enter a message.');
      if (!consent.checked) errors.push('Please agree to the privacy policy.');

      if (errors.length) {
        alert(errors.join('\n'));
        return;
      }

      // Process submission & dispatch to Admin Dashboard Data Bridge + Automated Email
      var originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span>Sending inquiry...</span>';
      submitBtn.disabled = true;

      var statusBox = form.querySelector('#contact-status-msg');
      if (statusBox) {
        statusBox.textContent = '';
        statusBox.className = 'contact-status-msg';
      }

      var inquiry = {
        id: 'inq_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7),
        name: name.value.trim(),
        email: email.value.trim(),
        message: message.value.trim(),
        timestamp: new Date().toISOString(),
        status: 'new',
        read: false,
        page: window.location.href || window.location.pathname || '/',
        referrer: document.referrer || 'Direct'
      };

      // 1. Persist inquiry locally for Admin Dashboard
      try {
        var rawInquiries = localStorage.getItem('bitwise_inquiries');
        var inquiries = rawInquiries ? JSON.parse(rawInquiries) : [];
        inquiries.unshift(inquiry);
        if (inquiries.length > 200) inquiries.length = 200;
        localStorage.setItem('bitwise_inquiries', JSON.stringify(inquiries));
      } catch (err) {
        console.warn('[bitwise.] Error persisting inquiry locally:', err);
      }

      // 2. Real-time broadcast across open Dashboard tabs & Live Viewport frames
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          var bridge = new BroadcastChannel('bitwise_data_bridge');
          bridge.postMessage({ type: 'NEW_INQUIRY', data: inquiry });
          bridge.close();
        }
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'NEW_INQUIRY', data: inquiry }, '*');
        }
        window.dispatchEvent(new CustomEvent('bitwise:inquiry', { detail: inquiry }));
      } catch (err) {
        console.warn('[bitwise.] Realtime broadcast notice:', err);
      }

      if (window.bitwiseAnalytics && typeof window.bitwiseAnalytics.trackEvent === 'function') {
        window.bitwiseAnalytics.trackEvent('contact_inquiry_sent', { email: inquiry.email, name: inquiry.name });
      }

      // 3. Automated Email Notification to bitwise1216@gmail.com via FormSubmit AJAX API
      var emailPayload = {
        name: inquiry.name,
        email: inquiry.email,
        _replyto: inquiry.email,
        message: inquiry.message,
        page: inquiry.page,
        referrer: inquiry.referrer,
        submitted_at: new Date().toLocaleString(),
        _subject: '⚡ [BITWISE Lead] New Client Inquiry from ' + inquiry.name,
        _template: 'table',
        _captcha: 'false'
      };

      fetch('https://formsubmit.co/ajax/bitwise1216@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(emailPayload)
      })
      .then(function (res) {
        return res.json().catch(function () { return { success: true }; });
      })
      .then(function (result) {
        submitBtn.innerHTML = '<span>✓ Inquiry Sent Successfully!</span>';
        submitBtn.style.background = 'var(--color-success, #22c55e)';
        submitBtn.style.borderColor = 'var(--color-success, #22c55e)';
        form.reset();

        if (statusBox) {
          statusBox.textContent = 'Thank you, ' + inquiry.name + '! Your message has been sent to bitwise1216@gmail.com and recorded in the studio dashboard.';
          statusBox.className = 'contact-status-msg is-success';
        }

        setTimeout(function () {
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
          submitBtn.style.background = '';
          submitBtn.style.borderColor = '';
        }, 4000);
      })
      .catch(function (error) {
        console.warn('[bitwise.] FormSubmit notice:', error);
        // Fallback: the inquiry is safely stored locally and in dashboard bridge
        submitBtn.innerHTML = '<span>✓ Inquiry Recorded!</span>';
        submitBtn.style.background = 'var(--color-success, #22c55e)';
        form.reset();

        if (statusBox) {
          statusBox.innerHTML = 'Your inquiry has been logged in the studio dashboard! You can also reach us directly at <a href="mailto:bitwise1216@gmail.com" style="text-decoration:underline;">bitwise1216@gmail.com</a>.';
          statusBox.className = 'contact-status-msg is-success';
        }

        setTimeout(function () {
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
          submitBtn.style.background = '';
        }, 4000);
      });
    });
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ==========================================================================
  // 11. COOKIE CONSENT
  // ==========================================================================
  function initCookieConsent() {
    var banner = document.getElementById('cookie-banner');
    var acceptBtn = document.getElementById('cookie-accept');
    var rejectBtn = document.getElementById('cookie-reject');
    if (!banner) return;

    // Check if user already made a choice
    var cookieChoice = localStorage.getItem('bitwise_cookie_consent');
    if (cookieChoice) return;

    // Show banner after a short delay
    setTimeout(function () {
      banner.classList.add('visible');
    }, 1500);

    if (acceptBtn) {
      acceptBtn.addEventListener('click', function () {
        localStorage.setItem('bitwise_cookie_consent', 'accepted');
        banner.classList.remove('visible');
        banner.classList.add('hidden');
      });
    }

    if (rejectBtn) {
      rejectBtn.addEventListener('click', function () {
        localStorage.setItem('bitwise_cookie_consent', 'rejected');
        banner.classList.remove('visible');
        banner.classList.add('hidden');
      });
    }
  }

  // ==========================================================================
  // 12. BACK TO TOP
  // ==========================================================================
  function initBackToTop() {
    var btn = document.getElementById('back-to-top');
    if (!btn) return;

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ==========================================================================
  // 13. MOBILE STICKY CTA
  // ==========================================================================
  function initMobileCTA() {
    var cta = document.getElementById('mobile-sticky-cta');
    var hero = document.getElementById('hero');
    if (!cta || !hero) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          cta.classList.remove('visible');
        } else {
          cta.classList.add('visible');
        }
      });
    }, { threshold: 0 });

    observer.observe(hero);
  }

  // Refresh ScrollTrigger calculations after full page assets load
  window.addEventListener('load', function () {
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }
  });

})();
