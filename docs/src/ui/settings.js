UIRPG.UI = UIRPG.UI || {};

UIRPG.UI.Settings = (() => {
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
        <div class="modal-item" data-action="cloud-sign-in" style="justify-content:center;color:var(--accent);font-weight:bold;">◆ Sign in with Google</div>`;
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

      <div class="close-hint" data-action="close-modal" style="margin-top:16px;">done</div>
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
