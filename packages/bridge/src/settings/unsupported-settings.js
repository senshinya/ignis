// Obsidian 1.13 opens settings in a separate window by default, which Ignis can only render into a hidden popup iframe.
// Keep settings modals in the page and hide the toggle for it.
// The vault's stored value is left alone, so a desktop install sharing the vault keeps its own behavior.

const POPOUT_KEY = "settingsPopoutWindow";

function isBoundTo(def, keys) {
  if (def.control && keys.includes(def.control.key)) {
    return true;
  }

  // Imperative settings read their key as a string literal inside render.
  if (typeof def.render === "function") {
    const src = def.render.toString();
    return keys.some((key) => src.includes(JSON.stringify(key)));
  }

  return false;
}

// Returns the definitions without the entries bound to any of the keys, recursing into groups and pages.
export function filterSettingDefinitions(defs, keys) {
  return defs
    .filter((def) => !isBoundTo(def, keys))
    .map((def) =>
      Array.isArray(def.items)
        ? { ...def, items: filterSettingDefinitions(def.items, keys) }
        : def,
    );
}

// Replaces obj[name] with wrap(original) and returns a function that puts the original back.
function override(obj, name, wrap) {
  const hadOwn = Object.prototype.hasOwnProperty.call(obj, name);
  const original = obj[name];

  obj[name] = wrap(original);

  return () => {
    if (hadOwn) {
      obj[name] = original;
    } else {
      delete obj[name];
    }
  };
}

// Tabs cache their definitions in settingItems through update(); some fill it at boot, before the guard exists.
function refreshCached(tab) {
  if (
    typeof tab.update === "function" &&
    Array.isArray(tab.settingItems) &&
    tab.settingItems.length > 0
  ) {
    tab.update();
  }
}

// Returns a function that undoes the guard.
export function guardUnsupportedSettings(app) {
  const restores = [
    override(
      app.vault,
      "getConfig",
      (original) =>
        function (key) {
          if (key === POPOUT_KEY) {
            return false;
          }

          return original.call(this, key);
        },
    ),
  ];

  const tabs = (app.setting.settingTabs || []).filter(
    (tab) => typeof tab.getSettingDefinitions === "function",
  );

  for (const tab of tabs) {
    restores.push(
      override(
        tab,
        "getSettingDefinitions",
        (original) =>
          function (...args) {
            return filterSettingDefinitions(original.apply(this, args), [
              POPOUT_KEY,
            ]);
          },
      ),
    );
    refreshCached(tab);
  }

  return () => {
    for (const restore of restores) {
      restore();
    }

    tabs.forEach(refreshCached);
  };
}
