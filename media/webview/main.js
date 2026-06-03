/* global acquireVsCodeApi */

/**
 * Shelby Blob Browser — Webview client-side logic.
 *
 * Communicates with the extension host via the VS Code webview API
 * using postMessage-based IPC.
 */
(function () {
  const vscode = acquireVsCodeApi();

  // ── State ────────────────────────────────────
  /** @type {{ accounts: Array<{name: string, address: string}>, network: string, blobs: Array<any> }} */
  const state = {
    accounts: [],
    network: 'testnet',
    blobs: [],
  };

  // ── DOM References ───────────────────────────
  const tabButtons = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const accountSelect = document.getElementById('account-select');
  const refreshBtn = document.getElementById('refresh-btn');
  const blobList = document.getElementById('blob-list');
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const uploadForm = document.querySelector('.upload-form');
  const uploadName = document.getElementById('upload-name');
  const uploadAccount = document.getElementById('upload-account');
  const uploadExpiration = document.getElementById('upload-expiration');
  const uploadBtn = document.getElementById('upload-btn');
  const uploadProgress = document.getElementById('upload-progress');
  const configDisplay = document.getElementById('config-display');

  let selectedFile = null;

  // ── Tab Navigation ───────────────────────────
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      tabButtons.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      const content = document.getElementById('tab-' + tab);
      if (content) {
        content.classList.add('active');
      }
    });
  });

  // ── Message Handling ─────────────────────────
  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (!msg || !msg.type) {
      return;
    }

    switch (msg.type) {
      case 'blobsLoaded':
        state.blobs = msg.blobs;
        renderBlobs();
        break;
      case 'config':
        state.accounts = msg.config.accounts || [];
        state.network = msg.config.network || 'testnet';
        renderConfig();
        updateAccountSelects();
        break;
      case 'uploadProgress':
        uploadProgress.value = msg.percent;
        break;
      case 'uploadComplete':
        uploadProgress.hidden = true;
        uploadBtn.disabled = false;
        showError('Upload complete: ' + msg.blobName, false);
        // Refresh blob list
        fetchBlobs();
        break;
      case 'uploadError':
        uploadProgress.hidden = true;
        uploadBtn.disabled = false;
        showError(msg.message, true);
        break;
      case 'error':
        showError(msg.message, true);
        break;
    }
  });

  // ── Fetch Blobs ──────────────────────────────
  function fetchBlobs() {
    const account = accountSelect.value;
    if (!account) {
      blobList.innerHTML = '<p class="placeholder">Select an account to browse blobs.</p>';
      return;
    }
    blobList.innerHTML = '<p class="placeholder">Loading...</p>';
    vscode.postMessage({ type: 'fetchBlobs', account });
  }

  accountSelect.addEventListener('change', fetchBlobs);
  refreshBtn.addEventListener('click', fetchBlobs);

  // ── Render Blobs ─────────────────────────────
  function renderBlobs() {
    if (!state.blobs || state.blobs.length === 0) {
      blobList.innerHTML = '<p class="placeholder">No blobs found for this account.</p>';
      return;
    }

    blobList.innerHTML = state.blobs
      .map(
        (b) => `
        <div class="blob-card" data-blob="${escapeHtml(b.name)}">
          <div class="name">${escapeHtml(b.name)}</div>
          <div class="meta">
            <span>${formatBytes(b.sizeBytes)}</span>
            <span>Expires ${formatDate(b.expiresAt)}</span>
          </div>
        </div>`,
      )
      .join('');

    // Click to download
    document.querySelectorAll('.blob-card').forEach((card) => {
      card.addEventListener('click', () => {
        const name = card.dataset.blob;
        const account = accountSelect.value;
        if (name && account) {
          vscode.postMessage({
            type: 'downloadBlob',
            account,
            blobName: name,
            savePath: name,
          });
        }
      });
    });
  }

  // ── Render Config ────────────────────────────
  function renderConfig() {
    const accountNames =
      state.accounts.length > 0
        ? state.accounts.map((a) => a.name).join(', ')
        : 'None configured';

    configDisplay.innerHTML = `
      <div class="row">
        <span class="label">Network</span>
        <span>${escapeHtml(state.network)}</span>
      </div>
      <div class="row">
        <span class="label">Accounts</span>
        <span>${escapeHtml(accountNames)}</span>
      </div>
      <div class="row">
        <span class="label">Blobs Loaded</span>
        <span>${state.blobs.length}</span>
      </div>
    `;
  }

  // ── Upload: Drag & Drop ──────────────────────
  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  });

  function handleFileSelect(file) {
    selectedFile = file;
    uploadName.value = file.name;
    dropZone.hidden = true;
    uploadForm.hidden = false;
    uploadBtn.disabled = false;
  }

  uploadBtn.addEventListener('click', () => {
    if (!selectedFile) {
      return;
    }

    const account = uploadAccount.value;
    if (!account) {
      showError('Please select an account.', true);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      uploadBtn.disabled = true;
      uploadProgress.hidden = false;
      uploadProgress.value = 0;

      vscode.postMessage({
        type: 'uploadBlob',
        account,
        name: uploadName.value || selectedFile.name,
        data: base64,
        expirationDays: parseInt(uploadExpiration.value, 10) || 30,
      });
    };
    reader.readAsDataURL(selectedFile);
  });

  function updateAccountSelects() {
    const options = state.accounts
      .map((a) => `<option value="${escapeHtml(a.name)}">${escapeHtml(a.name)}</option>`)
      .join('');

    accountSelect.innerHTML =
      '<option value="">-- Select Account --</option>' + options;
    uploadAccount.innerHTML = options;
  }

  // ── Error Display ────────────────────────────
  function showError(message, isError) {
    let banner = document.querySelector('.error-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'error-banner';
      document.querySelector('.app').prepend(banner);
    }
    banner.textContent = isError ? 'Error: ' + message : message;
    banner.classList.add('visible');
    if (!isError) {
      setTimeout(() => banner?.classList.remove('visible'), 5000);
    }
  }

  // ── Helpers ──────────────────────────────────
  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(1) + ' GB';
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ── Init ─────────────────────────────────────
  vscode.postMessage({ type: 'getConfig' });
})();
