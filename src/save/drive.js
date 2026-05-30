UIRPG.Drive = (() => {
  const TOKEN_KEY = 'uirpg_drive_token';
  const EMAIL_KEY = 'uirpg_drive_email';
  const FILE_NAME = 'uirpg_save.json';

  let accessToken = null;
  let userEmail = null;
  let fileId = null;
  let signedIn = false;
  let lastSyncTime = 0;
  let tokenClient = null;
  let gisLoaded = false;

  function isSignedIn() { return signedIn; }
  function getEmail() { return userEmail; }
  function getLastSync() { return lastSyncTime; }

  function init() {
    gisLoaded = typeof google !== 'undefined' && google.accounts && google.accounts.oauth2;
    const stored = localStorage.getItem(TOKEN_KEY);
    const email = localStorage.getItem(EMAIL_KEY);
    if (stored && email) {
      accessToken = stored;
      userEmail = email;
      signedIn = true;
      return true;
    }
    return false;
  }

  function clearToken() {
    accessToken = null;
    userEmail = null;
    signedIn = false;
    fileId = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
  }

  function hasValidClientId() {
    const id = UIRPG.Config.GOOGLE_CLIENT_ID;
    return id && id.length > 15 && id.includes('.apps.googleusercontent.com') && !id.includes('YOUR_GOOGLE');
  }

  function signIn() {
    return new Promise((resolve, reject) => {
      if (!hasValidClientId()) {
        reject(new Error('Cloud save requires a Google Client ID. See README.'));
        return;
      }
      if (!gisLoaded) {
        reject(new Error('Google sign-in library not loaded. Try refreshing.'));
        return;
      }
      try {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: UIRPG.Config.GOOGLE_CLIENT_ID,
          scope: UIRPG.Config.DRIVE_SCOPE,
          callback: (response) => {
            if (response.error) {
              reject(new Error(response.error));
              return;
            }
            accessToken = response.access_token;
            signedIn = true;
            localStorage.setItem(TOKEN_KEY, accessToken);
            userEmail = 'Google Account';
            localStorage.setItem(EMAIL_KEY, userEmail);
            resolve();
          },
        });
        tokenClient.requestAccessToken();
      } catch (err) {
        reject(err);
      }
    });
  }

  function signOut() {
    if (accessToken && gisLoaded) {
      google.accounts.oauth2.revoke(accessToken, () => {});
    }
    clearToken();
  }

  async function ensureFile() {
    if (fileId) return fileId;
    if (!accessToken) throw new Error('Not signed in');

    const listUrl = 'https://www.googleapis.com/drive/v3/files?q=' +
      encodeURIComponent(`name='${FILE_NAME}' and trashed=false`) +
      '&spaces=appDataFolder&fields=files(id)';

    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (listRes.status === 401) {
      clearToken();
      throw new Error('Session expired. Please sign in again.');
    }
    const listData = await listRes.json();

    if (listData.files && listData.files.length > 0) {
      fileId = listData.files[0].id;
      return fileId;
    }

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?uploadType=media', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: FILE_NAME, parents: ['appDataFolder'] }),
    });
    const createData = await createRes.json();
    fileId = createData.id;
    return fileId;
  }

  async function upload(bundle) {
    try {
      const id = await ensureFile();
      const url = `https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`;
      await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bundle),
      });
      lastSyncTime = Date.now();
      return true;
    } catch (err) {
      console.warn('Drive upload failed:', err);
      return false;
    }
  }

  async function download() {
    try {
      const id = await ensureFile();
      const url = `https://www.googleapis.com/drive/v3/files/${id}?alt=media`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.status === 401) {
        clearToken();
        return null;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('Drive download failed:', err);
      return null;
    }
  }

  function syncOnClose(bundle) {
    if (!signedIn || !fileId || !accessToken) return;
    const xhr = new XMLHttpRequest();
    xhr.open('PATCH', `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, false);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(bundle));
  }

  return { init, signIn, signOut, isSignedIn, getEmail, getLastSync,
    ensureFile, upload, download, syncOnClose };
})();
