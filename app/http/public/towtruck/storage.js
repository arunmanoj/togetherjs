/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define(["util"], function (util) {
  var assert = util.assert;
  var Deferred = util.Deferred;
  var DEFAULT_SETTINGS = {
    name: "",
    defaultName: "",
    avatar: null,
    stickyShare: null,
    color: null,
    seenIntroDialog: false,
    seenWalkthrough: false,
    dontShowRtcInfo: false
  };

  var DEBUG_STORAGE = false;

  var Storage = util.Class({
    constructor: function (storage, prefix) {
      this.storage = storage;
      this.prefix = prefix;
    },

    get: function (key, defaultValue) {
      var self = this;
      return Deferred(function (def) {
        // Strictly this isn't necessary, but eventually I want to move to something more
        // async for the storage, and this simulates that much better.
        setTimeout(util.resolver(def, function () {
          key = self.prefix + key;
          var value = self.storage.getItem(key);
          if (! value) {
            value = defaultValue;
            if (DEBUG_STORAGE) {
              console.debug("Get storage", key, "defaults to", value);
            }
          } else {
            value = JSON.parse(value);
            if (DEBUG_STORAGE) {
              console.debug("Get storage", key, "=", value);
            }
          }
          return value;
        }));
      });
    },

    set: function (key, value) {
      var self = this;
      return Deferred(function (def) {
        setTimeout(util.resolver(def, function () {
          key = self.prefix + key;
          if (value === undefined) {
            self.storage.removeItem(key);
            if (DEBUG_STORAGE) {
              console.debug("Delete storage", key);
            }
          } else {
            self.storage.setItem(key, JSON.stringify(value));
            if (DEBUG_STORAGE) {
              console.debug("Set storage", key, value);
            }
          }
        }));
      });
    },

    clear: function () {
      var self = this;
      var promises = [];
      return this.keys().then(function (keys) {
        keys.forEach(function (key) {
          // FIXME: technically we're ignoring the promise returned by all
          // these sets:
          promises.push(self.set(key, undefined));
        });
        return util.resolveMany(promises);
      });
    },

    keys: function (prefix, excludePrefix) {
      // Returns a list of keys, potentially with the given prefix
      var self = this;
      return Deferred(function (def) {
        setTimeout(util.resolver(def, function () {
          prefix = prefix || "";
          var result = [];
          for (var i=0; i<self.storage.length; i++) {
            var key = self.storage.key(i);
            if (key.indexOf(self.prefix + prefix) === 0) {
              var shortKey = key.substr(self.prefix.length);
              if (excludePrefix) {
                shortKey = shortKey.substr(prefix.length);
              }
              result.push(shortKey);
            }
          }
          return result;
        }));
      });
    }

  });

  var storage = Storage(localStorage, "towtruck.");

  storage.settings = util.mixinEvents({
    defaults: DEFAULT_SETTINGS,

    get: function (name) {
      assert(storage.settings.defaults.hasOwnProperty(name), "Unknown setting:", name);
      return storage.get("settings." + name, storage.settings.defaults[name]);
    },

    set: function (name, value) {
      assert(storage.settings.defaults.hasOwnProperty(name), "Unknown setting:", name);
      return storage.set("settings." + name, value);
    }

  });

  storage.tab = Storage(sessionStorage, "towtruck-session.");

  return storage;
});
