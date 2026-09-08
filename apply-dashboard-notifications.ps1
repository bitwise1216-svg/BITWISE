# BITWISE Dashboard Notifications & Desktop Alerts Integrator Script
# Seamlessly applies the desktop notifications, notification center, and visitor telemetry UI.

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$parentDir = Split-Path -Parent $PSScriptRoot
$dashboardDir = Join-Path $parentDir "BITWISE-Dashboard"

if (-not (Test-Path $dashboardDir)) {
    Write-Error "BITWISE-Dashboard directory not found at $dashboardDir"
    exit 1
}

$indexHtmlPath = Join-Path $dashboardDir "index.html"
$cssPath = Join-Path $dashboardDir "css\dashboard.css"
$jsPath = Join-Path $dashboardDir "js\dashboard.js"

Write-Host "Updating BITWISE-Dashboard with Executive Notifications..." -ForegroundColor Cyan

# -------------------------------------------------------------
# 1. UPDATE index.html
# -------------------------------------------------------------
$html = [System.IO.File]::ReadAllText($indexHtmlPath, [System.Text.Encoding]::UTF8)

# Check if already added
if (-not $html.Contains("id=`"notification-bell-wrapper`"")) {
    $bellSnippet = @"
        <!-- NOTIFICATIONS BELL & NOTIFICATION CENTER -->
        <div class="notification-bell-wrapper" id="notification-bell-wrapper">
          <button type="button" class="btn-topbar-notifications" id="btn-topbar-notifications" onclick="window.toggleNotificationCenter()" title="Executive Notifications" aria-label="Notifications">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span class="notification-badge" id="notification-badge" style="display: none;">0</span>
          </button>

          <!-- NOTIFICATION CENTER DROPDOWN -->
          <div class="notification-dropdown" id="notification-dropdown" style="display: none;">
            <div class="notification-dropdown-header">
              <div class="notif-header-title">
                <span class="notif-title-text">Notifications</span>
                <span class="notif-count-pill" id="notif-count-pill">0 new</span>
              </div>
              <div class="notif-header-actions">
                <button type="button" class="btn-notif-action" onclick="window.testNotificationAlert()" title="Send Test Notification">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  <span>Test</span>
                </button>
                <button type="button" class="btn-notif-action" onclick="window.clearAllNotifications()" title="Clear all notifications">
                  <span>Clear</span>
                </button>
              </div>
            </div>

            <!-- Permission status bar inside dropdown -->
            <div class="notif-permission-bar" id="notif-permission-bar">
              <div class="notif-perm-status">
                <span class="notif-perm-dot" id="notif-perm-dot"></span>
                <span class="notif-perm-text" id="notif-perm-text">Desktop Alerts: Default</span>
              </div>
              <button type="button" class="btn-perm-enable" id="btn-perm-enable" onclick="window.requestNotificationPermission()">
                <span>Enable</span>
              </button>
            </div>

            <!-- Notification Items List -->
            <div class="notification-dropdown-body" id="notification-items-list">
              <div class="notification-empty" id="notification-empty">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                <span>No new notifications</span>
                <p>Live visitors and client inquiries will stream here in real time.</p>
              </div>
            </div>
          </div>
        </div>

        <a href="https://bitwise1216-svg.github.io/BITWISE/"
"@
    $html = $html.Replace('<a href="https://bitwise1216-svg.github.io/BITWISE/"', $bellSnippet)
}

# Add Permission Banner in content-area
if (-not $html.Contains("id=`"notification-permission-banner`"")) {
    $bannerSnippet = @"
    <!-- CONTENT AREA -->
    <div class="content-area">

      <!-- FLOATING DESKTOP NOTIFICATION PERMISSION BANNER -->
      <div class="notification-permission-banner" id="notification-permission-banner" style="display: none;">
        <div class="notif-banner-content">
          <div class="notif-banner-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </div>
          <div class="notif-banner-text">
            <strong>Enable Desktop Notifications for bitwise.</strong>
            <span>Receive instant system notifications whenever visitors enter bitwise. studio or clients submit inquiries — even when this dashboard tab is in the background.</span>
          </div>
        </div>
        <div class="notif-banner-actions">
          <button type="button" class="btn btn-primary btn-sm" onclick="window.requestNotificationPermission()">
            <span>Allow Notifications</span>
          </button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="window.dismissNotificationBanner()">
            <span>Later</span>
          </button>
        </div>
      </div>
"@
    $targetContent = @"
    <!-- CONTENT AREA -->
    <div class="content-area">
"@
    $html = $html.Replace($targetContent, $bannerSnippet)
}

# Add Desktop Notifications Card to Settings
if (-not $html.Contains("id=`"settings-notif-status-label`"")) {
    $settingsSnippet = @"
          <!-- DESKTOP & REAL-TIME DASHBOARD NOTIFICATIONS -->
          <div class="dashboard-card animate-reveal stagger-2">
            <h3 class="card-title">Desktop &amp; Real-Time Dashboard Notifications</h3>
            <p class="card-subtitle" style="margin-bottom: 18px;">Get instant system alerts directly on this device when visitors enter bitwise. studio or send inquiries</p>

            <div style="display: flex; flex-direction: column; gap: 16px;">
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: var(--bg-hover); border-radius: 8px; border: 1px solid var(--border-subtle); flex-wrap: wrap; gap: 12px;">
                <div>
                  <div style="font-size: 13.5px; font-weight: 600; color: var(--text-primary);" id="settings-notif-status-label">Browser Desktop Notifications</div>
                  <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;" id="settings-notif-desc">Permission: Checking...</div>
                </div>
                <div style="display: flex; gap: 8px;">
                  <button type="button" class="btn btn-secondary btn-sm" onclick="window.testNotificationAlert()">
                    <span>Test Notification</span>
                  </button>
                  <button type="button" class="btn btn-primary btn-sm" id="btn-settings-request-perm" onclick="window.requestNotificationPermission()">
                    <span>Enable Alerts</span>
                  </button>
                </div>
              </div>

              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <div style="font-size: 13px; font-weight: 500;">Audio Chimes on Visitor Arrival</div>
                  <div style="font-size: 11.5px; color: var(--text-muted);">Play a soft executive chime when a visitor enters bitwise. studio</div>
                </div>
                <input type="checkbox" id="setting-sound-chime" checked style="width: 18px; height: 18px; cursor: pointer; accent-color: #38BDF8;" onchange="window.toggleSoundSetting(this.checked)">
              </div>

              <div style="font-size: 12px; color: var(--text-muted); line-height: 1.5; padding: 10px 12px; background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.15); border-radius: 6px;">
                💡 <strong>Notice:</strong> Automated visitor entry emails to Gmail have been discontinued to keep your inbox clean. All visitor telemetry is delivered in real-time through this executive dashboard and desktop notifications.
              </div>
            </div>
          </div>

          <!-- AUTOMATED EMAIL NOTIFICATIONS & AUTO-RESPONDER -->
"@
    $html = $html.Replace('<!-- AUTOMATED EMAIL NOTIFICATIONS & AUTO-RESPONDER -->', $settingsSnippet)
}

[System.IO.File]::WriteAllText($indexHtmlPath, $html, [System.Text.Encoding]::UTF8)
Write-Host "  [OK] Updated index.html successfully." -ForegroundColor Green

# -------------------------------------------------------------
# 2. UPDATE css/dashboard.css
# -------------------------------------------------------------
$css = [System.IO.File]::ReadAllText($cssPath, [System.Text.Encoding]::UTF8)

if (-not $css.Contains(".notification-bell-wrapper")) {
    $cssSnippet = @"

/* ==========================================================================
   Executive Notifications & Desktop Alerts System
   ========================================================================== */
.notification-bell-wrapper {
  position: relative;
  display: inline-flex;
}

.btn-topbar-notifications {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: var(--bg-hover);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-topbar-notifications:hover {
  color: var(--text-primary);
  border-color: var(--border-hover);
  background: rgba(255, 255, 255, 0.08);
}

.notification-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 9px;
  background: #38BDF8;
  color: #0F172A;
  font-size: 10px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.6);
  animation: pulseBadge 2s infinite ease-in-out;
}

@keyframes pulseBadge {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* Dropdown */
.notification-dropdown {
  position: absolute;
  top: 42px;
  right: 0;
  width: 360px;
  max-width: 90vw;
  background: #111116;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(24px);
  z-index: 1500;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: notifDropIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes notifDropIn {
  from { opacity: 0; transform: translateY(-8px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.notification-dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
}

.notif-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notif-title-text {
  font-size: 13px;
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: -0.01em;
}

.notif-count-pill {
  font-size: 10px;
  font-weight: 600;
  color: #38BDF8;
  background: rgba(56, 189, 248, 0.12);
  padding: 2px 7px;
  border-radius: 10px;
}

.notif-header-actions {
  display: flex;
  gap: 6px;
}

.btn-notif-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #94A3B8;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 3px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-notif-action:hover {
  color: #FFFFFF;
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.2);
}

/* Permission bar inside dropdown */
.notif-permission-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 11.5px;
}

.notif-perm-status {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #94A3B8;
}

.notif-perm-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #F59E0B;
}

.notif-perm-dot.granted {
  background: #10B981;
  box-shadow: 0 0 6px #10B981;
}

.notif-perm-dot.denied {
  background: #EF4444;
}

.btn-perm-enable {
  font-size: 10.5px;
  font-weight: 600;
  color: #38BDF8;
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.25);
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-perm-enable:hover {
  background: #38BDF8;
  color: #0F172A;
}

/* Dropdown Body */
.notification-dropdown-body {
  max-height: 340px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: background 0.15s ease;
}

.notification-item:hover {
  background: rgba(255, 255, 255, 0.04);
}

.notification-item.unread {
  background: rgba(56, 189, 248, 0.03);
}

.notif-item-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notif-item-icon.visit {
  background: rgba(56, 189, 248, 0.12);
  color: #38BDF8;
  border: 1px solid rgba(56, 189, 248, 0.25);
}

.notif-item-icon.inquiry {
  background: rgba(16, 185, 129, 0.12);
  color: #10B981;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.notif-item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.notif-item-title {
  font-size: 12.5px;
  font-weight: 600;
  color: #FFFFFF;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notif-item-sub {
  font-size: 11.5px;
  color: #94A3B8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notif-item-time {
  font-size: 10px;
  color: #64748B;
  margin-top: 2px;
}

.notification-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  text-align: center;
  color: #64748B;
  gap: 8px;
}

.notification-empty span {
  font-size: 13px;
  font-weight: 600;
  color: #94A3B8;
}

.notification-empty p {
  font-size: 11.5px;
  margin: 0;
  line-height: 1.4;
  max-width: 240px;
}

/* Permission Banner */
.notification-permission-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
  margin-bottom: 24px;
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(17, 24, 39, 0.85) 100%);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 12px;
  backdrop-filter: blur(16px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  animation: bannerSlideDown 0.4s var(--ease-apple-bounce);
  flex-wrap: wrap;
}

@keyframes bannerSlideDown {
  from { opacity: 0; transform: translateY(-15px); }
  to { opacity: 1; transform: translateY(0); }
}

.notif-banner-content {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 260px;
}

.notif-banner-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(56, 189, 248, 0.18);
  border: 1px solid rgba(56, 189, 248, 0.35);
  color: #38BDF8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.notif-banner-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.notif-banner-text strong {
  font-size: 13px;
  font-weight: 700;
  color: #FFFFFF;
}

.notif-banner-text span {
  font-size: 12px;
  color: #CBD5E1;
  line-height: 1.4;
}

.notif-banner-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

/* Visitor Arrival Toast */
.toast-visitor {
  background: #111116;
  border-left: 4px solid #38BDF8;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 14px 35px rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 189, 248, 0.15);
  max-width: 380px;
}

.toast-visitor-icon {
  position: relative;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #38BDF8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.toast-beacon-core {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10B981;
  box-shadow: 0 0 6px #10B981;
}
"@
    $css += $cssSnippet
    [System.IO.File]::WriteAllText($cssPath, $css, [System.Text.Encoding]::UTF8)
    Write-Host "  [OK] Updated css/dashboard.css successfully." -ForegroundColor Green
}

# -------------------------------------------------------------
# 3. UPDATE js/dashboard.js
# -------------------------------------------------------------
$js = [System.IO.File]::ReadAllText($jsPath, [System.Text.Encoding]::UTF8)

# Add state properties if not present
if (-not $js.Contains("notifications: []")) {
    $js = $js.Replace("currentDesignImage: null`n  };", "currentDesignImage: null,`n    notifications: [],`n    unreadNotificationsCount: 0,`n    soundEnabled: localStorage.getItem('bitwise_sound_enabled') !== 'false'`n  };")
}

# Add initDesktopNotifications call in init() if not present
if (-not $js.Contains("initDesktopNotifications();")) {
    $js = $js.Replace("setup3DCardTilt();", "setup3DCardTilt();`n    initDesktopNotifications();`n    syncRemoteAnalyticsEvents();")
}

# Add functions implementation if not present
if (-not $js.Contains("function initDesktopNotifications()")) {
    $functionsSnippet = @"

  // ==========================================================================
  // EXECUTIVE NOTIFICATIONS & DESKTOP ALERTS CONTROLLER
  // ==========================================================================
  function initDesktopNotifications() {
    updateNotificationPermissionUI();

    // Load persisted notifications
    try {
      const saved = localStorage.getItem('bitwise_dashboard_notifications');
      if (saved) {
        state.notifications = JSON.parse(saved) || [];
      }
    } catch (e) {
      state.notifications = [];
    }
    renderNotificationCenter();

    // Check if permission banner should be shown
    const isDefault = (typeof Notification !== 'undefined') && Notification.permission === 'default';
    const isDismissed = sessionStorage.getItem('bitwise_notif_banner_dismissed') === 'true';
    const banner = document.getElementById('notification-permission-banner');
    if (banner) {
      banner.style.display = (isDefault && !isDismissed) ? 'flex' : 'none';
    }

    // Set sound checkbox state in settings
    const soundCb = document.getElementById('setting-sound-chime');
    if (soundCb) {
      soundCb.checked = state.soundEnabled;
    }

    // Close dropdown on outside click
    document.addEventListener('click', function (e) {
      const wrapper = document.getElementById('notification-bell-wrapper');
      const dropdown = document.getElementById('notification-dropdown');
      if (wrapper && dropdown && dropdown.style.display !== 'none') {
        if (!wrapper.contains(e.target)) {
          dropdown.style.display = 'none';
        }
      }
    });
  }

  function updateNotificationPermissionUI() {
    const perm = (typeof Notification !== 'undefined') ? Notification.permission : 'unsupported';
    const dot = document.getElementById('notif-perm-dot');
    const text = document.getElementById('notif-perm-text');
    const btnEnable = document.getElementById('btn-perm-enable');
    const settingsDesc = document.getElementById('settings-notif-desc');
    const settingsBtn = document.getElementById('btn-settings-request-perm');

    if (perm === 'granted') {
      if (dot) { dot.className = 'notif-perm-dot granted'; }
      if (text) { text.textContent = 'Desktop Alerts: Enabled'; }
      if (btnEnable) { btnEnable.style.display = 'none'; }
      if (settingsDesc) { settingsDesc.innerHTML = '<span style=\"color:#10B981; font-weight:600;\">✓ Active</span> — Instant system alerts enabled'; }
      if (settingsBtn) { settingsBtn.disabled = true; settingsBtn.textContent = 'Active'; settingsBtn.style.opacity = '0.6'; }
    } else if (perm === 'denied') {
      if (dot) { dot.className = 'notif-perm-dot denied'; }
      if (text) { text.textContent = 'Desktop Alerts: Blocked'; }
      if (btnEnable) { btnEnable.style.display = 'none'; }
      if (settingsDesc) { settingsDesc.innerHTML = '<span style=\"color:#EF4444; font-weight:600;\">Blocked</span> in browser settings. Please allow notifications in site permissions.'; }
      if (settingsBtn) { settingsBtn.disabled = true; settingsBtn.textContent = 'Blocked in Browser'; }
    } else {
      if (dot) { dot.className = 'notif-perm-dot'; }
      if (text) { text.textContent = 'Desktop Alerts: Default'; }
      if (btnEnable) { btnEnable.style.display = 'inline-block'; }
      if (settingsDesc) { settingsDesc.textContent = 'Click Enable Alerts to grant browser notification permission.'; }
      if (settingsBtn) { settingsBtn.disabled = false; settingsBtn.textContent = 'Enable Alerts'; }
    }
  }

  window.requestNotificationPermission = async function () {
    if (typeof Notification === 'undefined') {
      showToast('Notifications are not supported in this browser.', 'error');
      return;
    }

    try {
      const result = await Notification.requestPermission();
      updateNotificationPermissionUI();

      const banner = document.getElementById('notification-permission-banner');
      if (banner) banner.style.display = 'none';

      if (result === 'granted') {
        showToast('✓ Desktop Notifications Enabled! You will receive live alerts.', 'success');
        sendDesktopNotification('bitwise. Official Dashboard', {
          body: 'Desktop notifications are active. You will receive live visitor and inquiry alerts.',
          tag: 'welcome-notif'
        });
      } else if (result === 'denied') {
        showToast('Notifications blocked. You can re-enable them in browser site settings.', 'info');
      }
    } catch (err) {
      console.warn('Notification permission error:', err);
    }
  };

  window.dismissNotificationBanner = function () {
    const banner = document.getElementById('notification-permission-banner');
    if (banner) banner.style.display = 'none';
    sessionStorage.setItem('bitwise_notif_banner_dismissed', 'true');
  };

  function sendDesktopNotification(title, options) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    try {
      const opts = {
        body: options.body || '',
        tag: options.tag || ('notif-' + Date.now()),
        renotify: true,
        silent: !state.soundEnabled
      };
      const notif = new Notification(title, opts);
      notif.onclick = function () {
        window.focus();
        if (options.tab) switchTab(options.tab);
        notif.close();
      };
    } catch (e) {
      console.warn('Desktop notification dispatch warning:', e);
    }
  }

  function playVisitorChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.50, now); // C6
      osc.frequency.exponentialRampToValueAtTime(1567.98, now + 0.12); // G6

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.55);
    } catch (e) {}
  }

  function showVisitorToast(data) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast toast-visitor';
    toast.style.cursor = 'pointer';

    const locationStr = data.location || 'Direct / Private';
    const deviceStr = (data.device || 'Desktop') + ' • ' + (data.browser || 'Browser');
    const pageStr = data.page || '/';

    toast.innerHTML =
      '<div class=\"toast-visitor-icon\">' +
        '<span class=\"toast-beacon-core\"></span>' +
        '<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">' +
          '<path d=\"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2\"></path>' +
          '<circle cx=\"9\" cy=\"7\" r=\"4\"></circle>' +
          '<path d=\"M23 21v-2a4 4 0 0 0-3-3.87\"></path>' +
          '<path d=\"M16 3.13a4 4 0 0 1 0 7.75\"></path>' +
        '</svg>' +
      '</div>' +
      '<div style=\"display:flex; flex-direction:column; gap:3px; text-align:left; flex:1;\">' +
        '<div style=\"display:flex; align-items:center; justify-content:space-between; gap:8px;\">' +
          '<strong style=\"font-size:13px; font-weight:700; color:#FFFFFF;\">Live Visitor Arrival</strong>' +
          '<span style=\"font-size:10.5px; padding:2px 6px; border-radius:4px; background:rgba(56,189,248,0.2); color:#38BDF8; font-weight:600;\">NEW</span>' +
        '</div>' +
        '<div style=\"font-size:12px; color:#E0E7FF; font-weight:500;\">' + escapeHtml(locationStr) + '</div>' +
        '<div style=\"font-size:11px; color:#94A3B8;\">' + escapeHtml(deviceStr) + ' &bull; Page: ' + escapeHtml(pageStr) + '</div>' +
        '<div style=\"margin-top:4px;\">' +
          '<span style=\"font-size:10.5px; text-decoration:underline; font-weight:600; color:#38BDF8;\">View in Telemetry Stream &rarr;</span>' +
        '</div>' +
      '</div>';

    toast.onclick = function () {
      switchTab('analytics');
      const table = document.getElementById('tab-analytics');
      if (table) table.scrollIntoView({ behavior: 'smooth' });
      toast.remove();
    };

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      setTimeout(() => toast.remove(), 250);
    }, 5500);
  }

  function addNotificationFeedItem(item) {
    if (!item) return;
    state.notifications.unshift(item);
    if (state.notifications.length > 50) state.notifications.length = 50;

    state.unreadNotificationsCount = (state.unreadNotificationsCount || 0) + 1;

    try {
      localStorage.setItem('bitwise_dashboard_notifications', JSON.stringify(state.notifications));
    } catch (e) {}

    renderNotificationCenter();
  }

  function renderNotificationCenter() {
    const badge = document.getElementById('notification-badge');
    const pill = document.getElementById('notif-count-pill');
    const list = document.getElementById('notification-items-list');

    const unread = state.unreadNotificationsCount || 0;
    if (badge) {
      if (unread > 0) {
        badge.textContent = unread > 99 ? '99+' : unread;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }

    if (pill) {
      pill.textContent = unread + ' new';
    }

    if (!list) return;

    if (!state.notifications.length) {
      list.innerHTML =
        '<div class=\"notification-empty\" id=\"notification-empty\">' +
          '<svg width=\"22\" height=\"22\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"><path d=\"M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9\"></path><path d=\"M13.73 21a2 2 0 0 1-3.46 0\"></path></svg>' +
          '<span>No new notifications</span>' +
          '<p>Live visitors and client inquiries will stream here in real time.</p>' +
        '</div>';
      return;
    }

    list.innerHTML = state.notifications.map(n => {
      const isVisit = n.type === 'visit';
      const icon = isVisit
        ? '<svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2\"></path><circle cx=\"9\" cy=\"7\" r=\"4\"></circle></svg>'
        : '<svg width=\"15\" height=\"15\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z\"></path><polyline points=\"22,6 12,13 2,6\"></polyline></svg>';

      const timeStr = n.timestamp ? new Date(n.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Just now';

      return (
        '<div class=\"notification-item\" onclick=\"window.handleNotificationItemClick(\'' + (n.id || '') + '\', \'' + (n.type || '') + '\')\">' +
          '<div class=\"notif-item-icon ' + (isVisit ? 'visit' : 'inquiry') + '\">' + icon + '</div>' +
          '<div class=\"notif-item-info\">' +
            '<div class=\"notif-item-title\">' + escapeHtml(n.title || 'Event') + '</div>' +
            '<div class=\"notif-item-sub\">' + escapeHtml(n.subtitle || '') + '</div>' +
            '<div class=\"notif-item-time\">' + escapeHtml(timeStr) + '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  window.handleNotificationItemClick = function (id, type) {
    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown) dropdown.style.display = 'none';

    if (type === 'visit') {
      switchTab('analytics');
    } else if (type === 'inquiry') {
      switchTab('inquiries');
      if (typeof window.viewInquiry === 'function') {
        window.viewInquiry(id);
      }
    }
  };

  window.toggleNotificationCenter = function () {
    const dropdown = document.getElementById('notification-dropdown');
    if (!dropdown) return;

    if (dropdown.style.display === 'none' || !dropdown.style.display) {
      dropdown.style.display = 'flex';
      // Mark notifications read
      state.unreadNotificationsCount = 0;
      const badge = document.getElementById('notification-badge');
      if (badge) badge.style.display = 'none';
      const pill = document.getElementById('notif-count-pill');
      if (pill) pill.textContent = '0 new';
    } else {
      dropdown.style.display = 'none';
    }
  };

  window.clearAllNotifications = function () {
    state.notifications = [];
    state.unreadNotificationsCount = 0;
    try {
      localStorage.removeItem('bitwise_dashboard_notifications');
    } catch (e) {}
    renderNotificationCenter();
    showToast('All notifications cleared', 'info');
  };

  window.testNotificationAlert = function () {
    const testData = {
      id: 'test_' + Date.now(),
      device: 'Desktop',
      browser: 'Chrome',
      page: '/portfolio',
      location: 'New York, United States',
      timestamp: new Date().toISOString()
    };

    if (state.soundEnabled) {
      playVisitorChime();
    }
    showVisitorToast(testData);

    sendDesktopNotification('bitwise. Official Dashboard', {
      body: 'Live Test Alert: New visitor from New York, United States (Chrome on Desktop)',
      tag: 'test-' + Date.now(),
      tab: 'analytics'
    });

    addNotificationFeedItem({
      id: testData.id,
      type: 'visit',
      title: 'Visitor from New York, United States',
      subtitle: 'Desktop • Chrome • /portfolio',
      timestamp: testData.timestamp,
      data: testData
    });
  };

  window.toggleSoundSetting = function (enabled) {
    state.soundEnabled = !!enabled;
    localStorage.setItem('bitwise_sound_enabled', state.soundEnabled ? 'true' : 'false');
    if (state.soundEnabled) {
      playVisitorChime();
      showToast('Notification sound chimes enabled', 'success');
    } else {
      showToast('Notification sound chimes muted', 'info');
    }
  };

  function syncRemoteAnalyticsEvents() {
    try {
      fetch('/api/analytics/events')
        .then(function (r) { return r.json(); })
        .then(function (remoteEvents) {
          if (Array.isArray(remoteEvents) && remoteEvents.length > 0) {
            let updated = false;
            remoteEvents.forEach(function (rev) {
              if (rev && rev.id && !state.analyticsEvents.some(function (ev) { return ev.id === rev.id; })) {
                state.analyticsEvents.push(rev);
                updated = true;
              }
            });
            if (updated) {
              state.analyticsEvents.sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
              if (state.analyticsEvents.length > 500) state.analyticsEvents.length = 500;
              localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(state.analyticsEvents));
              renderAnalytics();
            }
          }
        })
        .catch(function () {});
    } catch (e) {}
  }
"@
    $js += $functionsSnippet
}

# Now update handleIncomingData in setupRealtimeBridge
$oldIncomingData = @"
      if (type === 'NEW_VISIT') {
        if (state.analyticsEvents.some(e => e.id === data.id)) return;
        showToast('Real-Time Visitor on ' + (data.page || 'Home') + ' via ' + (data.device || 'Web'), 'info');
        state.analyticsEvents.unshift(data);
        if (state.analyticsEvents.length > 500) state.analyticsEvents.length = 500;
        localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(state.analyticsEvents));
        renderAnalytics();
      } else if (type === 'NEW_INQUIRY') {
        if (state.inquiries.some(i => i.id === data.id)) return;
        playNotificationChime();
        showInquiryToast(data);
        state.inquiries.unshift(data);
        localStorage.setItem(STORAGE_KEY_INQUIRIES, JSON.stringify(state.inquiries));
        renderInquiries();
        renderAnalytics();
        updateNavBadges();
      }
"@

$newIncomingData = @"
      if (type === 'NEW_VISIT') {
        if (state.analyticsEvents.some(e => e.id === data.id)) return;
        state.analyticsEvents.unshift(data);
        if (state.analyticsEvents.length > 500) state.analyticsEvents.length = 500;
        localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(state.analyticsEvents));

        // 1. In-Dashboard Rich Toast
        showVisitorToast(data);

        // 2. Subtle Audio Chime
        if (state.soundEnabled) {
          playVisitorChime();
        }

        // 3. Native Browser Desktop Notification
        const loc = data.location || 'Direct / Private';
        const dev = data.device || 'Desktop';
        const pg = data.page || 'Home';
        sendDesktopNotification('bitwise. Official Dashboard', {
          body: 'New visitor entered studio from ' + loc + ' (' + dev + ') on ' + pg,
          tag: 'visit-' + data.id,
          tab: 'analytics'
        });

        // 4. Add to Activity Center
        addNotificationFeedItem({
          id: data.id,
          type: 'visit',
          title: 'Visitor from ' + loc,
          subtitle: dev + ' • ' + (data.browser || 'Browser') + ' • ' + pg,
          timestamp: data.timestamp || new Date().toISOString(),
          data: data
        });

        renderAnalytics();
      } else if (type === 'NEW_INQUIRY') {
        if (state.inquiries.some(i => i.id === data.id)) return;
        playNotificationChime();
        showInquiryToast(data);
        state.inquiries.unshift(data);
        localStorage.setItem(STORAGE_KEY_INQUIRIES, JSON.stringify(state.inquiries));

        sendDesktopNotification('bitwise. Official Dashboard', {
          body: 'New inquiry received from ' + (data.name || 'Client') + ': \"' + (data.message || '').substring(0, 60) + '\"',
          tag: 'inq-' + data.id,
          tab: 'inquiries'
        });

        addNotificationFeedItem({
          id: data.id,
          type: 'inquiry',
          title: 'Inquiry from ' + (data.name || 'Client'),
          subtitle: (data.email || '') + ' • ' + (data.message || '').substring(0, 45) + '...',
          timestamp: data.timestamp || new Date().toISOString(),
          data: data
        });

        renderInquiries();
        renderAnalytics();
        updateNavBadges();
      }
"@

if ($js.Contains($oldIncomingData)) {
    $js = $js.Replace($oldIncomingData, $newIncomingData)
}

[System.IO.File]::WriteAllText($jsPath, $js, [System.Text.Encoding]::UTF8)
Write-Host "  [OK] Updated js/dashboard.js successfully." -ForegroundColor Green

Write-Host "Executive Notifications system applied cleanly to BITWISE-Dashboard!" -ForegroundColor Green
