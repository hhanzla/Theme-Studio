const fs = require('fs');
const path = require('path');
const { STATE_FILE, getUserDataPath } = require('./paths');

function getStateFilePath() {
  const userData = getUserDataPath();
  if (!fs.existsSync(userData)) {
    fs.mkdirSync(userData, { recursive: true });
  }
  return path.join(userData, 'installed.json');
}

function loadState() {
  const filePath = getStateFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return { items: parsed, settings: {} };
      }
      return {
        items: Array.isArray(parsed.items) ? parsed.items : [],
        settings: parsed.settings || {}
      };
    }
  } catch (err) {
    console.error('[StateStore] Error loading state:', err);
  }
  return { items: [], settings: {} };
}

function saveState(state) {
  const filePath = getStateFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('[StateStore] Error saving state:', err);
  }
}

function getInstalledItems() {
  return loadState().items;
}

function isInstalled(id) {
  const { items } = loadState();
  return items.some((item) => item.id === id);
}

function getInstalledItem(id) {
  const { items } = loadState();
  return items.find((item) => item.id === id) || null;
}

function addInstalled(itemData) {
  const state = loadState();
  const existingIndex = state.items.findIndex((item) => item.id === itemData.id);
  const entry = {
    ...itemData,
    installed_at: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    state.items[existingIndex] = entry;
  } else {
    state.items.push(entry);
  }
  saveState(state);
  return entry;
}

function removeInstalled(id) {
  const state = loadState();
  state.items = state.items.filter((item) => item.id !== id);
  saveState(state);
  return true;
}

function getSettings() {
  const state = loadState();
  return state.settings || {};
}

function getSetting(key, defaultValue = null) {
  const state = loadState();
  return state.settings && state.settings[key] !== undefined ? state.settings[key] : defaultValue;
}

function setSetting(key, value) {
  const state = loadState();
  if (!state.settings) state.settings = {};
  state.settings[key] = value;
  saveState(state);
}

module.exports = {
  loadState,
  saveState,
  getInstalledItems,
  isInstalled,
  getInstalledItem,
  addInstalled,
  removeInstalled,
  getSettings,
  getSetting,
  setSetting
};
