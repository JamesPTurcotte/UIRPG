UIRPG.Characters = (() => {
  const STORAGE_KEY = 'uirpg_characters';
  const SHARED_BANK_KEY = 'uirpg_shared_bank';

  function loadCharacterList() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load character list:', e);
      return [];
    }
  }

  function saveCharacterList(characters) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
    } catch (e) {
      console.error('Failed to save character list:', e);
    }
  }

  function loadSharedBank() {
    try {
      const data = localStorage.getItem(SHARED_BANK_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load shared bank:', e);
      return [];
    }
  }

  function saveSharedBank(bank) {
    try {
      localStorage.setItem(SHARED_BANK_KEY, JSON.stringify(bank));
    } catch (e) {
      console.error('Failed to save shared bank:', e);
    }
  }

  function createCharacter(name, mode = 'normal') {
    const characters = loadCharacterList();
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    const character = {
      id,
      name: name || `Character ${characters.length + 1}`,
      mode, // 'normal', 'ironman', 'hardcore'
      createdAt: Date.now(),
      lastPlayed: Date.now(),
      level: 1,
      saveKey: `uirpg_char_${id}`,
    };

    characters.push(character);
    saveCharacterList(characters);

    // Create initial state
    const state = UIRPG.State.create();
    state.player.name = character.name;
    state.characterId = id;
    state.characterMode = mode;
    
    // Give player a starter sword
    const starterSword = UIRPG.Drops.genStarterSword();
    state.inventory.push(starterSword);
    state.equipment.main_hand = starterSword;
    
    // Ironman characters don't use shared bank
    if (mode !== 'ironman') {
      state.bank = loadSharedBank();
    }

    UIRPG.Save.saveCharacter(state, character.saveKey);
    return character;
  }

  function deleteCharacter(id) {
    const characters = loadCharacterList();
    const char = characters.find(c => c.id === id);
    if (!char) return false;

    // Remove character save
    localStorage.removeItem(char.saveKey);
    
    // Remove from list
    const filtered = characters.filter(c => c.id !== id);
    saveCharacterList(filtered);

    return true;
  }

  function loadCharacter(id) {
    const characters = loadCharacterList();
    const char = characters.find(c => c.id === id);
    if (!char) return null;

    const state = UIRPG.Save.loadCharacter(char.saveKey);
    if (!state) return null;

    // Update last played
    char.lastPlayed = Date.now();
    saveCharacterList(characters);

    // Load shared bank for non-ironman characters
    if (char.mode !== 'ironman') {
      state.bank = loadSharedBank();
    }

    return state;
  }

  function saveCharacterState(state) {
    const characters = loadCharacterList();
    const char = characters.find(c => c.id === state.characterId);
    if (!char) return;

    // Update character info
    char.level = state.player.level;
    char.lastPlayed = Date.now();
    saveCharacterList(characters);

    // Save shared bank for non-ironman characters
    if (char.mode !== 'ironman') {
      saveSharedBank(state.bank);
    }

    // Save character state
    UIRPG.Save.saveCharacter(state, char.saveKey);
  }

  function getCharacterList() {
    return loadCharacterList();
  }

  function simulateOfflineForCharacter(id) {
    const characters = loadCharacterList();
    const char = characters.find(c => c.id === id);
    if (!char) return null;

    const state = UIRPG.Save.loadCharacter(char.saveKey);
    if (!state) return null;

    const now = Date.now();
    const elapsed = state.saveTime ? now - state.saveTime : 0;
    
    if (elapsed > 5000) { // More than 5 seconds
      const summary = UIRPG.Engine.simulateOffline(state, elapsed);
      state.saveTime = now;
      UIRPG.Save.saveCharacter(state, char.saveKey);
      return summary;
    }

    return null;
  }

  return {
    createCharacter,
    deleteCharacter,
    loadCharacter,
    saveCharacterState,
    getCharacterList,
    simulateOfflineForCharacter,
    loadSharedBank,
    saveSharedBank,
  };
})();
