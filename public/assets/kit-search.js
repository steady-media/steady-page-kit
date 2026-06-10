/* kit-search.js — Brücke zum Cloudflare-AI-Search-Modal.
 *
 * Die AutoRAG-Chunks der Suche tragen weder Titel- noch URL-Metadaten; das Snippet
 * würde „undefined" anzeigen. Dieser fetch-Interceptor ergänzt metadata.title (aus
 * dem Dateinamen) und metadata.description (aus dem Treffertext) und neutralisiert
 * den Link, BEVOR das Snippet die Antwort sieht.
 *
 * Muss vor dem Snippet-Modul eingebunden sein (siehe header() in _lib/page.js).
 */
(function () {
  var originalFetch = window.fetch;
  window.fetch = function (input) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    var pending = originalFetch.apply(this, arguments);
    // Nur Antworten des Cloudflare-Search-Endpunkts anfassen
    if (url.indexOf("/search") < 0 || url.indexOf("cloudflare") < 0) return pending;
    return pending.then(function (res) {
      return res.clone().json().then(function (json) {
        try {
          var chunks = json && json.result && json.result.chunks;
          if (chunks && chunks.length) {
            chunks.forEach(function (chunk) {
              var item = chunk.item || (chunk.item = {});
              // Dateiname → hübscher Titel ("blaupause_archiv_teil_1.md" → "Blaupause Archiv Teil 1")
              var key = item.key || "";
              var dot = key.lastIndexOf(".");
              if (dot > 0) key = key.slice(0, dot);
              key = key.split("_").join(" ").split("-").join(" ");
              var title = key.split(" ").map(function (w) {
                return w ? w.charAt(0).toUpperCase() + w.slice(1) : w;
              }).join(" ").trim();
              if (!item.metadata) item.metadata = {};
              if (item.metadata.title == null) item.metadata.title = title || "Beitrag";
              if (item.metadata.description == null) item.metadata.description = (chunk.text || "").slice(0, 180);
              item.key = "#"; // Chunks haben keine Ziel-URL — Link neutralisieren
            });
          }
        } catch (e) { /* Antwort im Zweifel unverändert lassen */ }
        return new Response(JSON.stringify(json), { status: 200, headers: { "content-type": "application/json" } });
      }).catch(function () { return res; });
    });
  };
})();
