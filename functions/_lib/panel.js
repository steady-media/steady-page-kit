// _lib/panel.js — Markup des Customizer-Panels (rechte Lade, „Anpassen").
// Die zugehörige Logik liegt in public/assets/kit-panel.js und hängt sich an die
// data-fn/data-kind-Attribute: data-fn wählt den Setter (layout/type/card/base/struct),
// data-kind den Regler, data-v den Wert. Struktur-Regler (struct) schreiben einen
// Cookie und laden neu; alles andere wirkt live über CSS-Variablen/Klassen.

export function panelHtml() {
  return `<aside class="cz" id="cz-panel" aria-label="Anpassen">
  <div class="cz-head"><span>Anpassen</span><div><button class="cz-reset" id="cz-reset" title="Alles zurücksetzen">Reset</button><button class="cz-x" id="cz-close" aria-label="Schließen">›</button></div></div>
  <div class="cz-pubbar">
    <button class="cz-pub" id="cz-pub" type="button" title="Aktuelle Einstellungen mit Admin-Code für alle Besucher veröffentlichen">Für alle Besucher speichern</button>
    <div class="cz-pubmeta"><span id="cz-pub-ts">–</span><button class="cz-pub-undo" id="cz-pub-undo" type="button" title="Zur vorherigen Veröffentlichung zurückkehren">↩ Letzte Version</button></div>
  </div>
  <div class="cz-body">
    <section class="cz-sec cz-open"><button class="cz-sh" data-acc>Looks<span class="cz-cv">▾</span></button><div class="cz-sb">
      <p class="cz-hint">Ein Klick = ein geprüfter Gesamtstil. Danach feinjustieren.</p>
      <div class="cz-looks" id="cz-looks"></div>
    </div></section>
    <section class="cz-sec"><button class="cz-sh" data-acc>Header &amp; Navigation<span class="cz-cv">▾</span></button><div class="cz-sb">
      <label class="cz-lbl">Titel</label><input class="cz-inp" id="cz-brand" type="text" placeholder="Blaupause" maxlength="60"/>
      <label class="cz-lbl">Logo (global)</label><div class="cz-logo"><label class="cz-logo-up">Bild wählen<input type="file" id="cz-logo-file" accept="image/*" hidden/></label><button class="cz-logo-rm" id="cz-logo-rm" type="button">Entfernen</button></div>
      <p class="cz-hint">Wird für alle Besucher gespeichert (Admin-Code nötig, max. 1,5 MB). Ersetzt Icon + Wortmarke.</p>
      <label class="cz-lbl">Header-Stil</label><div class="cz-seg" data-fn="struct" data-kind="header"><button data-v="links">Links</button><button data-v="zentriert">Zentriert</button></div>
      <label class="cz-lbl">Nav-Stil</label><div class="cz-seg" data-fn="layout" data-kind="nav"><button data-v="standard">Standard</button><button data-v="figma">Figma</button></div>
      <label class="cz-lbl">Suche</label><div class="cz-seg" data-fn="struct" data-kind="search"><button data-v="0">Aus</button><button data-v="1">An</button></div>
      <label class="cz-lbl">Navigation</label><div class="cz-nav" id="cz-nav"></div>
      <button class="cz-nav-add" id="cz-nav-add" type="button">+ Link hinzufügen</button>
      <button class="cz-apply" id="cz-chrome-apply" type="button">Übernehmen</button>
    </div></section>
    <section class="cz-sec"><button class="cz-sh" data-acc>Farben<span class="cz-cv">▾</span></button><div class="cz-sb">
      <p class="cz-hint">Zwei Farben steuern die ganze Seite. Wähle ein fertiges Schema – oder stell die Farben selbst ein.</p>
      <label class="cz-lbl">Hell / Dunkel</label><div class="cz-seg" data-fn="base" data-kind="mode"><button data-v="light">Hell</button><button data-v="dark">Dunkel</button></div>
      <label class="cz-lbl">Schema <span class="cz-lbl-x">— ein Klick setzt beide Farben</span></label><div class="cz-pal" id="cz-pal"></div>
      <label class="cz-lbl">Eigene Farben</label>
      <div class="cz-colors">
        <label class="cz-color"><input type="color" id="cz-c-brand" value="#137EC0"><span class="cz-color-t">Marke<em>Buttons, Links, aktive Navi</em></span></label>
        <label class="cz-color"><input type="color" id="cz-c-accent" value="#FF7264"><span class="cz-color-t">Akzent<em>Chips &amp; Hervorhebungen</em></span></label>
        <label class="cz-color"><input type="color" id="cz-c-bg" value="#FFFFFF"><span class="cz-color-t">Hintergrund<em>Seitenfläche — Text passt sich an</em></span></label>
      </div>
      <p class="cz-warn" id="cz-warn">⚠︎ Wenig Kontrast — die Marke ist auf dem Hintergrund kaum lesbar.</p>
    </div></section>
    <section class="cz-sec"><button class="cz-sh" data-acc>Schriften<span class="cz-cv">▾</span></button><div class="cz-sb">
      <label class="cz-lbl">Schrift-Paar (Vorlage)</label><select id="pair-picker" class="cz-sel"><option value="">– Vorlage wählen –</option></select>
      <label class="cz-lbl">Überschriften</label><div class="cz-font"><input class="cz-font-in" id="cz-fh-in" type="text" placeholder="Schrift suchen …" autocomplete="off" spellcheck="false"><div class="cz-font-pop" id="cz-fh-pop"></div></div>
      <label class="cz-lbl">Lauftext</label><div class="cz-font"><input class="cz-font-in" id="cz-fb-in" type="text" placeholder="Schrift suchen …" autocomplete="off" spellcheck="false"><div class="cz-font-pop" id="cz-fb-pop"></div></div>
      <label class="cz-lbl">Schriftgröße</label><div class="cz-seg" data-fn="type" data-kind="size"><button data-v="klein">Klein</button><button data-v="standard">Standard</button><button data-v="gross">Groß</button></div>
      <button class="cz-more" id="cz-type-more" type="button" aria-expanded="false">Feinschliff<span class="cz-cv">▾</span></button>
      <div class="cz-more-body" id="cz-type-adv">
        <label class="cz-lbl">Zeilenhöhe</label><div class="cz-seg" data-fn="type" data-kind="lead"><button data-v="eng">Eng</button><button data-v="normal">Normal</button><button data-v="luftig">Luftig</button></div>
        <label class="cz-lbl">Laufweite (Titel)</label><div class="cz-seg" data-fn="type" data-kind="track"><button data-v="eng">Eng</button><button data-v="normal">Normal</button><button data-v="weit">Weit</button></div>
        <label class="cz-lbl">Titel-Schreibung</label><div class="cz-seg" data-fn="type" data-kind="case"><button data-v="normal">Aa</button><button data-v="gross">AA</button><button data-v="title">Aa Bb</button></div>
      </div>
    </div></section>
    <section class="cz-sec"><button class="cz-sh" data-acc>Layout<span class="cz-cv">▾</span></button><div class="cz-sb">
      <p class="cz-subhead">Aufbau</p>
      <label class="cz-lbl">Seitenlayout</label><div class="cz-seg" data-fn="struct" data-kind="shell"><button data-v="single">Einspaltig</button><button data-v="portal">Portal</button></div>
      <label class="cz-lbl">Aufmacher</label><div class="cz-seg" data-fn="struct" data-kind="auf"><button data-v="klein">Klein</button><button data-v="gross">Groß</button></div>
      <label class="cz-lbl">Inhalt</label><div class="cz-seg" data-fn="struct" data-kind="stream"><button data-v="liste">Eine Liste</button><button data-v="rubrik">Nach Rubriken</button></div>
      <label class="cz-lbl">Seitenleisten</label><div class="cz-rails" id="cz-rails"><button data-rail="neueste">Neueste</button><button data-rail="meist">Meistgelesen</button><button data-rail="themen">Themen</button></div>
      <p class="cz-hint">Aufbau-Wechsel laden die Seite kurz neu. Der Rest bleibt live.</p>
      <p class="cz-subhead">Raster</p>
      <label class="cz-lbl">Spalten</label><div class="cz-seg" data-fn="layout" data-kind="cols"><button data-v="2">2</button><button data-v="3">3</button><button data-v="4">4</button></div>
      <label class="cz-lbl">Inhaltsbreite</label><div class="cz-seg" data-fn="layout" data-kind="width"><button data-v="schmal">Schmal</button><button data-v="standard">Standard</button><button data-v="breit">Breit</button></div>
      <label class="cz-lbl">Dichte</label><div class="cz-seg" data-fn="layout" data-kind="dens"><button data-v="kompakt">Kompakt</button><button data-v="komfortabel">Komfort</button><button data-v="grosszuegig">Weit</button></div>
      <label class="cz-lbl">Ecken</label><div class="cz-seg" data-fn="layout" data-kind="corner"><button data-v="eckig">Eckig</button><button data-v="rund">Rund</button></div>
      <p class="cz-subhead">Hero</p>
      <label class="cz-lbl">Darstellung</label><div class="cz-seg" data-fn="layout" data-kind="hero"><button data-v="split">Geteilt</button><button data-v="center">Zentriert</button></div>
      <label class="cz-lbl">Ausrichtung</label><div class="cz-seg" data-fn="type" data-kind="align"><button data-v="links">Links</button><button data-v="zentriert">Zentriert</button></div>
    </div></section>
    <section class="cz-sec"><button class="cz-sh" data-acc>Karten<span class="cz-cv">▾</span></button><div class="cz-sb">
      <label class="cz-lbl">Teaser-Stil</label><div class="cz-seg cz-seg--wrap" data-fn="card" data-kind="style"><button data-v="classic">Klassisch</button><button data-v="side">Bild links</button><button data-v="text">Nur Text</button><button data-v="overlay">Overlay</button><button data-v="list">Liste</button></div>
      <label class="cz-lbl">Bildformat</label><div class="cz-seg" data-fn="card" data-kind="aspect"><button data-v="16:9">16:9</button><button data-v="4:3">4:3</button><button data-v="1:1">1:1</button></div>
      <label class="cz-lbl">Kartenfläche</label><div class="cz-seg" data-fn="card" data-kind="surface"><button data-v="flat">Flach</button><button data-v="soft">Schatten</button><button data-v="outline">Umrandet</button></div>
      <label class="cz-lbl">Bild-Look</label><div class="cz-seg" data-fn="card" data-kind="image"><button data-v="farbe">Farbe</button><button data-v="duotone">Duotone</button><button data-v="graustufen">Grau</button></div>
    </div></section>
  </div>
</aside>`;
}
