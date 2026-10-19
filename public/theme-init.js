// Apply the stored/system colour theme before first paint (avoids a flash of
// the light theme). Loaded synchronously from <head>; kept as an external file
// so the Content-Security-Policy needs no 'unsafe-inline' for scripts.
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var resolved = stored === "dark" || stored === "light" ? stored : prefersDark ? "dark" : "light";
    if (resolved === "dark") document.documentElement.classList.add("dark");
  } catch (e) {
    /* localStorage unavailable; fall back to prefers-color-scheme via CSS */
  }
})();
