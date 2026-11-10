/* Languages. Every string the player sees passes through K.tr. The English text is the key, so the
   content files stay in plain English and each other language is one dictionary (js/i18n/<lang>.js).
   A string with no entry falls back to English, and the tests list every such string.

   Tokens inside strings:
     {name} {origin} {teacher} {path} {spouse} {friend} {child} {king}   filled by K.fmt from the life
     {they} {them} {their} {They} {theyre}                              English pronouns (K.fmt)
     {g:masc|fem|neutral}   the form that matches the player (he / she / they); neutral falls back to masc.
                            Used by the Hindi text, where verbs agree with the speaker's gender.
     {x}                    a value passed to K.tr(str, { x: ... })
     {x!}                   the same, lower-cased in English only (vow and path names mid-sentence) */
(function (K) {
  "use strict";
  const DICT = {};
  K.LANGS = { en: { name: "English", htmlLang: "en" }, hi: { name: "हिन्दी", htmlLang: "hi" } };
  K.lang = "en";
  K.addStrings = (lang, map) => { DICT[lang] = Object.assign(DICT[lang] || {}, map); };
  K.hasStrings = (lang) => !!DICT[lang];
  K.missing = null;  // a Set while the tests collect untranslated strings
  K.seenText = null; // a Set while the string collector records every key

  const DEVA = /[ऀ-ॿ]/;
  const LATIN = /[A-Za-z]/;

  // Translate one string. Already-translated text (Devanagari) passes through untouched.
  K.tr = function (s, params) {
    if (s == null || s === "") return s;
    if (typeof s !== "string") s = String(s);
    if (K.seenText && !DEVA.test(s)) K.seenText.add(s);
    let out = s;
    if (K.lang !== "en" && !DEVA.test(s)) {
      const d = DICT[K.lang];
      const hit = d && d[s];
      if (hit != null) out = hit;
      else if (K.missing && LATIN.test(s.replace(/\{[^}]*\}/g, ""))) K.missing.add(s);
    }
    return params ? K.fill(out, params) : out;
  };

  // Fill {x} and {x!} from params. Values are used as given: translate names before passing them.
  K.fill = (str, params) => String(str).replace(/\{(\w+)(!?)\}/g, (m, k, low) => {
    if (!params || !(k in params)) return m;
    const v = String(params[k] ?? "");
    return low && K.lang === "en" ? v.toLowerCase() : v;
  });

  // Translate a name or label (world data). Same as K.tr; the alias reads better at call sites.
  K.trn = (s) => K.tr(s);

  // Lower-case a translated name for use mid-sentence, in English only.
  K.low = (s) => (K.lang === "en" ? String(s).toLowerCase() : String(s));

  // Join a list the way the language does.
  K.list = (arr) => {
    const a = arr.filter(Boolean);
    if (K.lang === "hi") return a.length > 1 ? a.slice(0, -1).join(", ") + " और " + a[a.length - 1] : a.join("");
    return a.length > 1 ? a.slice(0, -1).join(", ") + " and " + a[a.length - 1] : a.join("");
  };
})(window.K = window.K || {});
