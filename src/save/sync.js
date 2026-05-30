UIRPG.Sync = (() => {
  function buildBundle(s) {
    const list = UIRPG.Characters.getCharacterList();
    const characters = {};
    for (const entry of list) {
      const cs = UIRPG.Save.loadCharacter(entry.id);
      if (cs) characters[entry.id] = cs;
    }
    const bank = UIRPG.Characters.loadSharedBank ? UIRPG.Characters.loadSharedBank() : [];

    return {
      version: 1,
      timestamp: Date.now(),
      characterList: list,
      characters: characters,
      sharedBank: bank,
    };
  }

  function saveBundleToLocal(bundle) {
    for (const [id, cs] of Object.entries(bundle.characters || {})) {
      UIRPG.Save.saveCharacter(cs, id);
    }
    if (bundle.sharedBank && UIRPG.Characters.saveSharedBank) {
      UIRPG.Characters.saveSharedBank(bundle.sharedBank);
    }
  }

  function pickNewest(local, drive) {
    if (!local) return drive;
    if (!drive) return local;
    const localTime = local.saveTime || 0;
    const driveTime = drive.timestamp || 0;
    return driveTime > localTime ? drive : local;
  }

  function mergeBundles(localBundle, driveBundle) {
    if (!localBundle) return driveBundle;
    if (!driveBundle) return localBundle;

    const merged = {
      version: 1,
      timestamp: Date.now(),
      characterList: [],
      characters: {},
      sharedBank: [],
    };

    const allIds = new Set();
    for (const c of (localBundle.characterList || [])) allIds.add(c.id);
    for (const c of (driveBundle.characterList || [])) allIds.add(c.id);

    for (const id of allIds) {
      const localChar = (localBundle.characters || {})[id];
      const driveChar = (driveBundle.characters || {})[id];
      const best = pickNewest(localChar, driveChar);
      if (best) {
        merged.characters[id] = best;
        const listEntry = (localBundle.characterList || []).find(c => c.id === id)
          || (driveBundle.characterList || []).find(c => c.id === id);
        if (listEntry) merged.characterList.push(listEntry);
      }
    }

    const localBank = localBundle.sharedBank || [];
    const driveBank = driveBundle.sharedBank || [];
    merged.sharedBank = localBank.length >= driveBank.length ? localBank : driveBank;

    return merged;
  }

  async function uploadAll(s) {
    const bundle = buildBundle(s);
    return UIRPG.Drive.upload(bundle);
  }

  async function downloadAll(s) {
    const driveBundle = await UIRPG.Drive.download();
    if (!driveBundle) return null;

    const localBundle = buildBundle(s);
    const merged = mergeBundles(localBundle, driveBundle);

    saveBundleToLocal(merged);
    return merged;
  }

  function syncOnClose(s) {
    if (!UIRPG.Drive.isSignedIn()) return;
    const bundle = buildBundle(s);
    UIRPG.Drive.syncOnClose(bundle);
  }

  return { buildBundle, mergeBundles, pickNewest, uploadAll, downloadAll, syncOnClose };
})();
