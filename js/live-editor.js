/**
 * bitwise. - Canva-style In-Browser Live Visual Editor
 * Allows non-technical clients to click and edit any text/images directly on the site,
 * save changes in localStorage, and export a clean updated index.html!
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'bitwise_live_edits_v1';
  let isEditing = false;
  let activeImageTarget = null;
  const defaultTexts = {};
  const defaultImages = {};

  // 0. CAPTURE ORIGINAL DEFAULT SNAPSHOTS
  function captureDefaults() {
    document.querySelectorAll('[data-editable-id]').forEach(el => {
      const id = el.getAttribute('data-editable-id');
      if (id) {
        defaultTexts[id] = el.innerHTML;
      }
    });

    document.querySelectorAll('[data-editable-img-id]').forEach(el => {
      const id = el.getAttribute('data-editable-img-id');
      if (id) {
        const img = el.tagName.toLowerCase() === 'img' ? el : el.querySelector('img');
        defaultImages[id] = img ? img.src : '';
      }
    });
  }

  // 1. RESTORE SAVED EDITS FROM LOCALSTORAGE ON PAGE LOAD
  function restoreSavedEdits() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const data = JSON.parse(saved);

      // Restore Text Content
      if (data.texts) {
        Object.keys(data.texts).forEach(id => {
          const el = document.querySelector(`[data-editable-id="${id}"]`);
          if (el) {
            el.innerHTML = data.texts[id];
          }
        });
      }

      // Restore Image Sources
      if (data.images) {
        Object.keys(data.images).forEach(id => {
          const el = document.querySelector(`[data-editable-img-id="${id}"]`);
          if (el && data.images[id]) {
            if (el.tagName.toLowerCase() === 'img') {
              el.src = data.images[id];
            } else {
              let img = el.querySelector('img');
              if (!img) {
                img = document.createElement('img');
                img.alt = id;
                img.loading = 'lazy';
                const placeholder = el.querySelector('.gallery-item-placeholder');
                if (placeholder) placeholder.style.display = 'none';
                el.appendChild(img);
              }
              img.src = data.images[id];
            }
          }
        });
      }
    } catch (err) {
      console.warn('Could not restore saved edits:', err);
    }
  }

  // 2. CREATE FLOATING EDITOR CONTROLS & MODALS
  function createEditorUI() {
    // Status banner at the top
    const banner = document.createElement('div');
    banner.className = 'editor-status-banner';
    banner.id = 'editor-status-banner';
    banner.innerHTML = 'LIVE EDIT MODE ACTIVE &mdash; Click any text to edit directly. Click images to replace.';
    document.body.appendChild(banner);

    // Floating Action Bar in the bottom right corner
    const bar = document.createElement('div');
    bar.className = 'live-editor-bar';
    bar.id = 'live-editor-bar';
    bar.innerHTML = `
      <button type="button" class="editor-toggle-btn" id="editor-toggle-btn" title="Toggle Live Edit Mode (Alt+E)">
        <span class="editor-toggle-icon">✏️</span>
        <span class="editor-toggle-label">Edit Mode</span>
      </button>
      <div class="editor-active-actions" id="editor-active-actions">
        <button type="button" class="editor-action-btn btn-save" id="editor-save-btn" title="Save changes to your browser">
          💾 Save
        </button>
        <button type="button" class="editor-action-btn btn-export" id="editor-export-btn" title="Download updated index.html with all your changes">
          📥 Export HTML
        </button>
        <button type="button" class="editor-action-btn" id="editor-reset-btn" title="Reset all changes back to original defaults">
          🔄 Reset
        </button>
      </div>
    `;
    document.body.appendChild(bar);

    // Toast Container
    const toast = document.createElement('div');
    toast.className = 'editor-toast';
    toast.id = 'editor-toast';
    document.body.appendChild(toast);

    // Image Swap Modal
    const modal = document.createElement('div');
    modal.className = 'image-swap-modal';
    modal.id = 'image-swap-modal';
    modal.innerHTML = `
      <div class="image-swap-card">
        <div class="image-swap-header">
          <h3 class="image-swap-title">Replace Image</h3>
          <button type="button" class="btn-pill" id="image-swap-close" style="padding:4px 10px;">✕</button>
        </div>
        <p style="font-size:0.9rem; color:#aaa;">Upload an image from your device or paste an image URL:</p>
        
        <div class="form-group">
          <label class="form-label">Upload Local File:</label>
          <input type="file" id="image-swap-file" accept="image/*" class="form-input" style="padding:8px;">
        </div>

        <div class="form-group">
          <label class="form-label">Or Image URL:</label>
          <input type="url" id="image-swap-url" placeholder="https://example.com/photo.jpg" class="form-input">
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:8px;">
          <button type="button" class="btn-pill btn-secondary" id="image-swap-cancel">Cancel</button>
          <button type="button" class="btn-pill btn-primary" id="image-swap-apply">Apply Image</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Wire up events
    setupEditorEvents();
  }

  // 3. TOAST NOTIFICATION HELPER
  function showToast(message) {
    const toast = document.getElementById('editor-toast');
    if (!toast) return;
    toast.innerHTML = message;
    toast.classList.add('visible');
    setTimeout(() => {
      toast.classList.remove('visible');
    }, 3800);
  }
  window.showEditorToast = showToast;

  // 4. TOGGLE LIVE EDIT MODE
  function toggleEditMode() {
    isEditing = !isEditing;
    const toggleBtn = document.getElementById('editor-toggle-btn');
    const toggleLabel = toggleBtn?.querySelector('.editor-toggle-label');

    if (isEditing) {
      document.body.classList.add('editing-active');
      if (toggleBtn) toggleBtn.classList.add('active');
      if (toggleLabel) toggleLabel.textContent = 'Exit Editor';

      // Make all editable elements editable
      document.querySelectorAll('[data-editable-id]').forEach(el => {
        el.setAttribute('contenteditable', 'true');
        el.setAttribute('spellcheck', 'false');
      });

      showToast('<strong>Live Edit Active:</strong> Click any text or image to customize!');
    } else {
      document.body.classList.remove('editing-active');
      if (toggleBtn) toggleBtn.classList.remove('active');
      if (toggleLabel) toggleLabel.textContent = 'Edit Mode';

      // Turn off contenteditable
      document.querySelectorAll('[data-editable-id]').forEach(el => {
        el.removeAttribute('contenteditable');
      });

      showToast('Live Edit closed. Your changes are visible.');
    }
  }

  // 5. SAVE EDITS TO LOCALSTORAGE
  function saveEdits() {
    const data = {
      texts: {},
      images: {}
    };

    document.querySelectorAll('[data-editable-id]').forEach(el => {
      const id = el.getAttribute('data-editable-id');
      if (id) {
        data.texts[id] = el.innerHTML;
      }
    });

    document.querySelectorAll('[data-editable-img-id]').forEach(el => {
      const id = el.getAttribute('data-editable-img-id');
      if (id) {
        const img = el.tagName.toLowerCase() === 'img' ? el : el.querySelector('img');
        if (img && img.src) {
          data.images[id] = img.src;
        }
      }
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    showToast('<strong>Saved!</strong> All your text & image edits are saved in your browser.');
  }

  // 6. EXPORT CLEAN FULL HTML FILE
  function exportCleanHTML() {
    // Clone document
    const clone = document.documentElement.cloneNode(true);

    // Remove editor injected markup from clone
    const editorBar = clone.querySelector('#live-editor-bar');
    const editorBanner = clone.querySelector('#editor-status-banner');
    const editorToast = clone.querySelector('#editor-toast');
    const editorModal = clone.querySelector('#image-swap-modal');

    editorBar?.remove();
    editorBanner?.remove();
    editorToast?.remove();
    editorModal?.remove();

    // Clean up contenteditable & edit classes
    clone.querySelector('body')?.classList.remove('editing-active');
    clone.querySelectorAll('[contenteditable]').forEach(el => {
      el.removeAttribute('contenteditable');
      el.removeAttribute('spellcheck');
    });

    const fullHTML = '<!DOCTYPE html>\n' + clone.outerHTML;
    const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'bitwise-updated.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);

    showToast('<strong>Export Complete!</strong> Downloaded updated index.html with all your changes permanently saved.');
  }

  // 7. RESET TO ORIGINAL DEFAULTS (IN-PLACE DOM & STORAGE CLEAR)
  function resetDefaults() {
    if (confirm('Are you sure you want to reset all edits back to original default content?')) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (err) {
        console.warn('Could not clear localStorage:', err);
      }

      // In-place restore of text content
      Object.keys(defaultTexts).forEach(id => {
        const el = document.querySelector(`[data-editable-id="${id}"]`);
        if (el) {
          el.innerHTML = defaultTexts[id];
        }
      });

      // In-place restore of images
      Object.keys(defaultImages).forEach(id => {
        const el = document.querySelector(`[data-editable-img-id="${id}"]`);
        if (el) {
          if (el.tagName.toLowerCase() === 'img') {
            el.src = defaultImages[id];
          } else {
            const img = el.querySelector('img');
            const placeholder = el.querySelector('.gallery-item-placeholder');
            if (defaultImages[id]) {
              if (img) img.src = defaultImages[id];
            } else {
              if (img) img.remove();
              if (placeholder) placeholder.style.display = '';
            }
          }
        }
      });

      showToast('<strong>Reset Complete:</strong> All content restored to original design defaults.');
    }
  }

  // 8. IMAGE SWAPPING LOGIC
  function openImageSwapModal(targetEl) {
    activeImageTarget = targetEl;
    const modal = document.getElementById('image-swap-modal');
    const urlInput = document.getElementById('image-swap-url');
    const fileInput = document.getElementById('image-swap-file');

    const img = targetEl.tagName.toLowerCase() === 'img' ? targetEl : targetEl.querySelector('img');
    const currentSrc = img ? img.src : '';

    if (urlInput) urlInput.value = currentSrc.startsWith('data:') ? '' : currentSrc;
    if (fileInput) fileInput.value = '';

    modal?.classList.add('active');
  }

  function closeImageSwapModal() {
    const modal = document.getElementById('image-swap-modal');
    modal?.classList.remove('active');
    activeImageTarget = null;
  }

  function applyImageSwap() {
    if (!activeImageTarget) return;

    const fileInput = document.getElementById('image-swap-file');
    const urlInput = document.getElementById('image-swap-url');

    function commitImage(newSrc) {
      if (activeImageTarget.tagName.toLowerCase() === 'img') {
        activeImageTarget.src = newSrc;
      } else {
        let img = activeImageTarget.querySelector('img');
        if (!img) {
          img = document.createElement('img');
          img.alt = activeImageTarget.getAttribute('data-editable-img-id') || 'Showcase image';
          img.loading = 'lazy';
          const placeholder = activeImageTarget.querySelector('.gallery-item-placeholder');
          if (placeholder) placeholder.style.display = 'none';
          activeImageTarget.appendChild(img);
        }
        img.src = newSrc;
      }
      showToast('Image updated successfully!');
      saveEdits();
      closeImageSwapModal();
    }

    if (fileInput?.files && fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = function (e) {
        commitImage(e.target.result);
      };
      reader.readAsDataURL(fileInput.files[0]);
    } else if (urlInput && urlInput.value.trim() !== '') {
      commitImage(urlInput.value.trim());
    } else {
      closeImageSwapModal();
    }
  }

  // 9. WIRE UP EVENT LISTENERS
  function setupEditorEvents() {
    document.getElementById('editor-toggle-btn')?.addEventListener('click', toggleEditMode);
    document.getElementById('editor-save-btn')?.addEventListener('click', saveEdits);
    document.getElementById('editor-export-btn')?.addEventListener('click', exportCleanHTML);
    document.getElementById('editor-reset-btn')?.addEventListener('click', resetDefaults);

    // Image Swap Modal Buttons
    document.getElementById('image-swap-close')?.addEventListener('click', closeImageSwapModal);
    document.getElementById('image-swap-cancel')?.addEventListener('click', closeImageSwapModal);
    document.getElementById('image-swap-apply')?.addEventListener('click', applyImageSwap);

    // Listen for clicks on editable images & placeholder cards
    document.addEventListener('click', (e) => {
      if (!isEditing) return;
      const targetEl = e.target.closest('[data-editable-img-id]');
      if (targetEl) {
        e.preventDefault();
        e.stopPropagation();
        openImageSwapModal(targetEl);
      }
    });

    // Keyboard shortcut Alt+E to toggle edit mode
    document.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        toggleEditMode();
      }
    });
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    captureDefaults();
    restoreSavedEdits();
    createEditorUI();
  });
})();
