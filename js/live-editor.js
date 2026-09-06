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

    document.querySelectorAll('[data-editable-img-id]').forEach(img => {
      const id = img.getAttribute('data-editable-img-id');
      if (id) {
        defaultImages[id] = img.src;
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
          const img = document.querySelector(`[data-editable-img-id="${id}"]`);
          if (img) {
            img.src = data.images[id];
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

    document.querySelectorAll('[data-editable-img-id]').forEach(img => {
      const id = img.getAttribute('data-editable-img-id');
      if (id) {
        data.images[id] = img.src;
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
        const img = document.querySelector(`[data-editable-img-id="${id}"]`);
        if (img) {
          img.src = defaultImages[id];
        }
      });

      showToast('<strong>Reset Complete:</strong> All content restored to original design defaults.');
    }
  }

  // 8. IMAGE SWAPPING LOGIC
  function openImageSwapModal(imgEl) {
    activeImageTarget = imgEl;
    const modal = document.getElementById('image-swap-modal');
    const urlInput = document.getElementById('image-swap-url');
    const fileInput = document.getElementById('image-swap-file');

    if (urlInput) urlInput.value = imgEl.src.startsWith('data:') ? '' : imgEl.src;
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

    if (fileInput?.files && fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = function (e) {
        if (activeImageTarget) {
          activeImageTarget.src = e.target.result;
          showToast('Image replaced from your local file!');
          saveEdits();
          closeImageSwapModal();
        }
      };
      reader.readAsDataURL(fileInput.files[0]);
    } else if (urlInput && urlInput.value.trim() !== '') {
      activeImageTarget.src = urlInput.value.trim();
      showToast('Image replaced from URL!');
      saveEdits();
      closeImageSwapModal();
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

    // Listen for clicks on editable images
    document.addEventListener('click', (e) => {
      if (!isEditing) return;
      const targetImg = e.target.closest('[data-editable-img-id]');
      if (targetImg) {
        e.preventDefault();
        e.stopPropagation();
        const img = targetImg.tagName.toLowerCase() === 'img' ? targetImg : targetImg.querySelector('img');
        if (img) openImageSwapModal(img);
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
