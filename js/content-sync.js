/**
 * bitwise. - Content Synchronization Engine
 * Seamlessly hydrates public website copy, photography showcase, graphic design carousel,
 * and founder pavilion portraits from the Executive Dashboard's synchronized data store.
 * 
 * Public Facing: Zero edit buttons or editor controls on the live website.
 */

(function () {
  'use strict';

  const STORAGE_KEY_CMS = 'bitwise_cms_content';
  const STORAGE_KEY_PHOTOS = 'bitwise_showcase_photos';
  const STORAGE_KEY_DESIGNS = 'bitwise_showcase_designs';
  const STORAGE_KEY_FOUNDERS = 'bitwise_founder_media';
  const CHANNEL_NAME = 'bitwise_data_bridge';

  // 1. Sync All Text Elements
  function syncAllCMSContent() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CMS);
      if (!raw) return;
      const cms = JSON.parse(raw);

      document.querySelectorAll('[data-editable-id]').forEach(el => {
        const id = el.getAttribute('data-editable-id');
        if (cms[id] !== undefined && cms[id] !== null && cms[id] !== '') {
          // Check if element is an anchor with mailto or tel
          if (el.tagName === 'A') {
            if (id === 'contact-email') {
              el.setAttribute('href', 'mailto:' + cms[id]);
              el.textContent = cms[id];
              return;
            } else if (id === 'contact-phone') {
              el.setAttribute('href', 'tel:' + cms[id].replace(/[^0-9+]/g, ''));
              el.textContent = cms[id];
              return;
            }
          if (id.endsWith('-content')) {
            el.innerHTML = cms[id];
          } else {
            el.textContent = cms[id];
          }
        }
      });
    } catch (e) {
      console.warn('[bitwise. sync] Notice reading CMS state:', e);
    }
  }

  // 2. Sync Photography Showcase
  function syncPhotographyShowcase() {
    const gallery = document.getElementById('photo-gallery');
    if (!gallery) return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY_PHOTOS);
      if (!raw) return;
      const photos = JSON.parse(raw);
      if (!Array.isArray(photos) || !photos.length) return;

      gallery.innerHTML = photos.map((photo, index) => {
        const src = photo.dataUrl || ('assets/showcase/photography/' + photo.name);
        let spanClass = '';
        if (photo.span === 'wide') spanClass = ' gallery-span-wide';
        else if (photo.span === 'tall') spanClass = ' gallery-span-tall';

        const altText = photo.alt || ('bitwise. Photography - ' + photo.name);

        return `
          <div class="gallery-item reveal-scale${spanClass}" data-editable-img-id="${photo.id || ('photo-' + (index + 1))}">
            <img src="${src}" alt="${altText}" loading="lazy">
          </div>
        `;
      }).join('');

      // Rebind lightbox if initLightbox is available
      if (typeof window.rebindLightbox === 'function') {
        window.rebindLightbox();
      }
    } catch (e) {
      console.warn('[bitwise. sync] Notice rendering photography showcase:', e);
    }
  }

  // 3. Sync Graphic Design Showcase
  function syncGraphicDesignShowcase() {
    const carousel = document.getElementById('design-carousel');
    if (!carousel) return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY_DESIGNS);
      if (!raw) return;
      const designs = JSON.parse(raw);
      if (!Array.isArray(designs) || !designs.length) return;

      carousel.innerHTML = designs.map((item, index) => {
        const imgHtml = item.image
          ? `<img src="${item.image}" alt="${item.title || 'Design Project'}" style="width:100%; height:100%; object-fit:cover;">`
          : `<div class="gallery-item-placeholder">
               <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
               <span>${item.title || ('Design ' + (index + 1))}</span>
             </div>`;

        return `
          <div class="design-card" data-design-id="${item.id || ('design-' + (index + 1))}">
            ${imgHtml}
            <div class="design-card-overlay">
              <div class="design-card-meta">
                <span class="design-card-category">${item.category || 'Visual Identity'}</span>
                <h3 class="design-card-title">${item.title || ('Project 0' + (index + 1))}</h3>
                ${item.description ? `<p class="design-card-desc">${item.description}</p>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');

      // Rebind lightbox if available
      if (typeof window.rebindLightbox === 'function') {
        window.rebindLightbox();
      }
    } catch (e) {
      console.warn('[bitwise. sync] Notice rendering graphic design showcase:', e);
    }
  }

  // 4. Sync Founder Portraits & Transparent Cutouts
  function syncFounderMedia() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_FOUNDERS);
      if (!raw) return;
      const founders = JSON.parse(raw);

      // Founder 1: Aaqib
      if (founders['founder-1-img']) {
        const img1 = document.querySelector('.pavilion-portal[data-founder="aaqib"] .portal-subject-img');
        if (img1) img1.src = founders['founder-1-img'];
      }
      // Founder 2: Ruhaim
      if (founders['founder-2-img']) {
        const img2 = document.querySelector('.pavilion-portal[data-founder="ruhaim"] .portal-subject-img');
        if (img2) img2.src = founders['founder-2-img'];
      }
      // Founder 3: Aneeq
      if (founders['founder-3-img']) {
        const img3 = document.querySelector('.pavilion-portal[data-founder="aneeq"] .portal-subject-img');
        if (img3) img3.src = founders['founder-3-img'];
      }
    } catch (e) {
      console.warn('[bitwise. sync] Notice syncing founder media:', e);
    }
  }

  // Master Sync Execution
  function syncAll() {
    syncAllCMSContent();
    syncPhotographyShowcase();
    syncGraphicDesignShowcase();
    syncFounderMedia();
  }

  // Real-time Bridge Listener
  function setupLiveBridge() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = function (event) {
          const { type } = event.data || {};
          if (type === 'CMS_UPDATE') {
            syncAllCMSContent();
          } else if (type === 'PHOTOS_UPDATE') {
            syncPhotographyShowcase();
          } else if (type === 'DESIGNS_UPDATE') {
            syncGraphicDesignShowcase();
          } else if (type === 'FOUNDERS_UPDATE') {
            syncFounderMedia();
          } else if (type === 'SYNC_ALL') {
            syncAll();
          }
        };
      } catch (e) {}
    }

    // Cross-tab storage event
    window.addEventListener('storage', function (e) {
      if (e.key === STORAGE_KEY_CMS) syncAllCMSContent();
      else if (e.key === STORAGE_KEY_PHOTOS) syncPhotographyShowcase();
      else if (e.key === STORAGE_KEY_DESIGNS) syncGraphicDesignShowcase();
      else if (e.key === STORAGE_KEY_FOUNDERS) syncFounderMedia();
    });

    // Window postMessage for live iframe previews
    window.addEventListener('message', function (event) {
      const { type } = event.data || {};
      if (type === 'CMS_UPDATE' || type === 'SYNC_ALL') syncAll();
      else if (type === 'PHOTOS_UPDATE') syncPhotographyShowcase();
      else if (type === 'DESIGNS_UPDATE') syncGraphicDesignShowcase();
      else if (type === 'FOUNDERS_UPDATE') syncFounderMedia();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      syncAll();
      setupLiveBridge();
    });
  } else {
    syncAll();
    setupLiveBridge();
  }
})();
