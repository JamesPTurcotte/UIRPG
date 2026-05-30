UIRPG.UI = UIRPG.UI || {};

UIRPG.UI.Settings = (() => {
  const GOOGLE_SVG = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18"><g><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 0 0 0 24c0 3.77.87 7.35 2.56 10.56l7.97-5.97z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.97C6.51 42.62 14.62 48 24 48z"/></g></svg>`;

  function open(s, error) {
    const drive = UIRPG.Drive;
    const isSignedIn = drive && drive.isSignedIn && drive.isSignedIn();

    const errorHtml = error
      ? `<div style="margin-bottom:10px;padding:6px 8px;background:rgba(204,68,68,0.15);border:1px solid var(--danger);color:var(--danger);font-size:10px;border-radius:2px;">${esc(error)}</div>`
      : '';

    let cloudSection;
    if (isSignedIn) {
      const lastSync = drive.getLastSync ? drive.getLastSync() : 0;
      const syncLabel = lastSync ? `Last synced: ${formatAgo(lastSync)}` : '';
      cloudSection = `
        <div style="margin-bottom:4px;color:var(--text);">✓ Signed in</div>
        ${syncLabel ? `<div style="margin-bottom:10px;color:var(--text-dim);font-size:10px;">${syncLabel}</div>` : ''}
        <div style="display:flex;gap:8px;">
          <div class="modal-item" data-action="sync-now" style="flex:1;justify-content:center;color:var(--accent);font-weight:bold;">◆ Sync Now</div>
          <div class="modal-item" data-action="cloud-sign-out" style="flex:1;justify-content:center;color:var(--danger);">Sign Out</div>
        </div>`;
    } else {
      cloudSection = `
        <div class="modal-item" data-action="cloud-sign-in" style="justify-content:center;padding:8px 12px;display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #dcdcdc;border-radius:2px;color:#555;font-weight:500;font-family:Roboto,Helvetica,Arial,sans-serif;font-size:13px;cursor:pointer;">
          ${GOOGLE_SVG}
          <span style="flex:1;text-align:center;">Sign in with Google</span>
        </div>`;
    }

    const html = `
      <div class="modal-title">◆ Settings</div>

      ${errorHtml}

      <div style="margin-bottom:6px;color:var(--accent);text-transform:uppercase;letter-spacing:1px;font-size:9px;">Local Saves</div>
      <div style="display:flex;gap:8px;margin-bottom:16px;">
        <div class="modal-item" data-action="export-save" style="flex:1;justify-content:center;color:var(--text);">Export Save</div>
        <div class="modal-item" data-action="import-save" style="flex:1;justify-content:center;color:var(--text);">Import Save</div>
      </div>

      <div style="margin-bottom:6px;color:var(--accent);text-transform:uppercase;letter-spacing:1px;font-size:9px;">Cloud Save</div>
      ${cloudSection}

      <div style="margin-top:16px;text-align:center;">
        <a href="privacy.html" target="_blank" style="color:var(--text-dim);font-size:9px;text-decoration:none;">Privacy</a>
      </div>
      <div class="close-hint" data-action="close-modal" style="margin-top:4px;">done</div>
    `;

    UIRPG.UI.Modal.show(html);
  }

  function formatAgo(ts) {
    const sec = Math.floor((Date.now() - ts) / 1000);
    if (sec < 60) return 'just now';
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    return `${Math.floor(sec / 3600)}h ago`;
  }

  const esc = UIRPG.Utils.esc;
  return { open };
})();
