/**
 * bitwise. - Content Synchronization Engine
 * Seamlessly hydrates public website copy, photography showcase, graphic design carousel,
 * and founder pavilion portraits from the Executive Dashboard's synchronized data store.
 * 
 * Supports:
 * 1. window.BITWISE_SITE_DATA (Canonical static baseline store)
 * 2. LocalStorage (Live overrides on the active device)
 * 3. BroadcastChannel & Window postMessage (Real-time live bridge from Executive Dashboard)
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
  function syncAllCMSContent(dataOverride) {
    try {
      let cms = dataOverride;
      if (!cms) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY_CMS);
          if (raw) cms = JSON.parse(raw);
        } catch (e) {}
      }
      if (!cms && window.BITWISE_SITE_DATA && window.BITWISE_SITE_DATA.cms) {
        cms = window.BITWISE_SITE_DATA.cms;
      }
      if (!cms) return;

      document.querySelectorAll('[data-editable-id]').forEach(el => {
        const id = el.getAttribute('data-editable-id');
        if (cms[id] !== undefined && cms[id] !== null && cms[id] !== '') {
          // Anchor special handling
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

  // 2. Sync Photography Showcase (Limit: 12 photos)
  const MAX_PHOTO_SLOTS = 12;
  function syncPhotographyShowcase(dataOverride) {
    const gallery = document.getElementById('photo-gallery');
    if (!gallery) return;

    try {
      let photos = dataOverride;
      if (!photos) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY_PHOTOS);
          if (raw) photos = JSON.parse(raw);
        } catch (e) {}
      }
      if (!photos && window.BITWISE_SITE_DATA && Array.isArray(window.BITWISE_SITE_DATA.photos)) {
        photos = window.BITWISE_SITE_DATA.photos;
      }
      if (!Array.isArray(photos) || photos.length === 0) return;

      const validPhotos = photos.slice(0, MAX_PHOTO_SLOTS);

      let html = validPhotos.map((photo, index) => {
        let src = photo.dataUrl;
        if (!src) {
          if (!photo.name) src = '';
          else if (photo.name.startsWith('assets/') || photo.name.startsWith('http') || photo.name.startsWith('data:')) {
            src = photo.name;
          } else {
            src = 'assets/showcase/photography/' + photo.name;
          }
        }
        let spanClass = '';
        if (photo.span === 'wide') spanClass = ' gallery-span-wide';
        else if (photo.span === 'tall') spanClass = ' gallery-span-tall';

        const altText = photo.alt || ('bitwise. Photography - ' + (photo.name || 'Showcase'));

        return `
          <div class="gallery-item reveal-scale${spanClass}" data-editable-img-id="${photo.id || ('photo-' + (index + 1))}">
            <img src="${src}" alt="${altText}" loading="lazy">
          </div>
        `;
      }).join('');

      // Keep space for remaining slots up to 12
      for (let i = validPhotos.length; i < MAX_PHOTO_SLOTS; i++) {
        const slotNum = i + 1;
        const formattedNum = slotNum < 10 ? '0' + slotNum : slotNum;
        html += `
          <div class="gallery-item gallery-item-slot reveal-scale" data-editable-img-id="photo-${slotNum}">
            <div class="gallery-item-placeholder slot-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              <span>Photo ${formattedNum} // Available</span>
            </div>
          </div>
        `;
      }

      gallery.innerHTML = html;

      // Rebind lightbox if initLightbox is available
      if (typeof window.rebindLightbox === 'function') {
        window.rebindLightbox();
      }
    } catch (e) {
      console.warn('[bitwise. sync] Notice rendering photography showcase:', e);
    }
  }

  // 3. Sync Graphic Design Showcase (Limit: 6 designs)
  const MAX_DESIGN_SLOTS = 6;
  function syncGraphicDesignShowcase(dataOverride) {
    const carousel = document.getElementById('design-carousel');
    if (!carousel) return;

    try {
      let designs = dataOverride;
      if (!designs) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY_DESIGNS);
          if (raw) designs = JSON.parse(raw);
        } catch (e) {}
      }
      if (!designs && window.BITWISE_SITE_DATA && Array.isArray(window.BITWISE_SITE_DATA.designs)) {
        designs = window.BITWISE_SITE_DATA.designs;
      }
      if (!Array.isArray(designs) || designs.length === 0) return;

      const validDesigns = designs.slice(0, MAX_DESIGN_SLOTS);

      let html = validDesigns.map((item, index) => {
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

      // Keep space for remaining slots up to 6
      for (let i = validDesigns.length; i < MAX_DESIGN_SLOTS; i++) {
        const slotNum = i + 1;
        html += `
          <div class="design-card" data-editable-img-id="design-${slotNum}">
            <div class="gallery-item-placeholder">
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              <span>Design ${slotNum}</span>
            </div>
          </div>
        `;
      }

      carousel.innerHTML = html;

      // Rebind lightbox if available
      if (typeof window.rebindLightbox === 'function') {
        window.rebindLightbox();
      }
    } catch (e) {
      console.warn('[bitwise. sync] Notice rendering graphic design showcase:', e);
    }
  }

  // 4. Sync Founder Portraits & Transparent Cutouts
  function syncFounderMedia(dataOverride) {
    try {
      let founders = dataOverride;
      if (!founders) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY_FOUNDERS);
          if (raw) founders = JSON.parse(raw);
        } catch (e) {}
      }
      if (!founders && window.BITWISE_SITE_DATA && window.BITWISE_SITE_DATA.founders) {
        founders = window.BITWISE_SITE_DATA.founders;
      }
      if (!founders) return;

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
  function syncAll(bundle) {
    if (bundle) {
      syncAllCMSContent(bundle.cms);
      syncPhotographyShowcase(bundle.photos);
      syncGraphicDesignShowcase(bundle.designs);
      syncFounderMedia(bundle.founders);
    } else {
      syncAllCMSContent();
      syncPhotographyShowcase();
      syncGraphicDesignShowcase();
      syncFounderMedia();
    }
  }

  // Real-time Bridge Listener
  function setupLiveBridge() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = function (event) {
          const { type, data } = event.data || {};
          if (type === 'CMS_UPDATE') {
            syncAllCMSContent(data);
          } else if (type === 'PHOTOS_UPDATE') {
            syncPhotographyShowcase(data);
          } else if (type === 'DESIGNS_UPDATE') {
            syncGraphicDesignShowcase(data);
          } else if (type === 'FOUNDERS_UPDATE') {
            syncFounderMedia(data);
          } else if (type === 'SYNC_ALL') {
            syncAll(data);
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

    // Window postMessage for live iframe previews & cross-window bridge
    window.addEventListener('message', function (event) {
      const { type, data } = event.data || {};
      if (type === 'CMS_UPDATE') {
        syncAllCMSContent(data);
      } else if (type === 'PHOTOS_UPDATE') {
        syncPhotographyShowcase(data);
      } else if (type === 'DESIGNS_UPDATE') {
        syncGraphicDesignShowcase(data);
      } else if (type === 'FOUNDERS_UPDATE') {
        syncFounderMedia(data);
      } else if (type === 'SYNC_ALL') {
        syncAll(data);
      }
    });
  }

  // Export globally for direct programmatic trigger
  window.BITWISE_SYNC = {
    syncAll: syncAll,
    syncCMS: syncAllCMSContent,
    syncPhotos: syncPhotographyShowcase,
    syncDesigns: syncGraphicDesignShowcase,
    syncFounders: syncFounderMedia
  };

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
