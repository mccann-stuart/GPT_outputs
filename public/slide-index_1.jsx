import { useState, useEffect, useRef, useCallback, useMemo } from "react";

const STORAGE_KEY = "slidevault-v2";
const THUMB_W = 320;
const THUMB_H = 180;

/* ───────── external lib loaders ───────── */
async function loadJSZip() {
  if (window.JSZip) return window.JSZip;
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    s.onload = () => res(window.JSZip);
    s.onerror = () => rej(new Error("Failed to load JSZip"));
    document.head.appendChild(s);
  });
}

async function loadTesseract() {
  if (window.Tesseract) return window.Tesseract;
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.0.4/tesseract.min.js";
    s.onload = () => res(window.Tesseract);
    s.onerror = () => rej(new Error("Failed to load Tesseract.js"));
    document.head.appendChild(s);
  });
}

/* ───────── XML helpers ───────── */
function getAttr(tag, attr) {
  const m = new RegExp(`${attr}="([^"]*)"`, "i").exec(tag);
  return m ? m[1] : null;
}

function parseShapes(xml) {
  const shapes = [];
  const spRegex = /<p:sp[\s>][\s\S]*?<\/p:sp>/g;
  let m;
  while ((m = spRegex.exec(xml)) !== null) {
    const block = m[0];
    const offMatch = /<a:off\s[^>]*\/>/i.exec(block);
    const extMatch = /<a:ext\s[^>]*\/>/i.exec(block);
    let x = 0, y = 0, w = 0, h = 0;
    if (offMatch) { x = parseInt(getAttr(offMatch[0], "x")) || 0; y = parseInt(getAttr(offMatch[0], "y")) || 0; }
    if (extMatch) { w = parseInt(getAttr(extMatch[0], "cx")) || 0; h = parseInt(getAttr(extMatch[0], "cy")) || 0; }
    const lines = [];
    const paraRegex = /<a:p[\s>][\s\S]*?<\/a:p>/g;
    let pm;
    while ((pm = paraRegex.exec(block)) !== null) {
      const tTexts = [];
      const tRegex = /<a:t>([^<]*)<\/a:t>/g;
      let tm;
      while ((tm = tRegex.exec(pm[0])) !== null) { if (tm[1]) tTexts.push(tm[1]); }
      if (tTexts.length) lines.push(tTexts.join(""));
    }
    let fontSize = 18;
    const szMatch = /<a:rPr[^>]*sz="(\d+)"/.exec(block);
    if (szMatch) fontSize = parseInt(szMatch[1]) / 100;
    const isBold = /<a:rPr[^>]*b="1"/.test(block);
    shapes.push({ x, y, w, h, lines, fontSize, isBold, type: "text" });
  }
  return shapes;
}

function parseImageRels(relsXml) {
  const rels = {};
  const regex = /<Relationship[^>]*?Id="([^"]*)"[^>]*?Target="([^"]*)"[^>]*?\/?\s*>/gi;
  let m;
  while ((m = regex.exec(relsXml)) !== null) {
    const id = m[1]; const target = m[2];
    if (/image/i.test(m[0])) rels[id] = target.replace(/^\.\.\//, "ppt/");
  }
  return rels;
}

function parsePicShapes(xml) {
  const pics = [];
  const picRegex = /<p:pic[\s>][\s\S]*?<\/p:pic>/g;
  let m;
  while ((m = picRegex.exec(xml)) !== null) {
    const block = m[0];
    const offMatch = /<a:off\s[^>]*\/>/i.exec(block);
    const extMatch = /<a:ext\s[^>]*\/>/i.exec(block);
    let x = 0, y = 0, w = 0, h = 0;
    if (offMatch) { x = parseInt(getAttr(offMatch[0], "x")) || 0; y = parseInt(getAttr(offMatch[0], "y")) || 0; }
    if (extMatch) { w = parseInt(getAttr(extMatch[0], "cx")) || 0; h = parseInt(getAttr(extMatch[0], "cy")) || 0; }
    const embedMatch = /r:embed="([^"]*)"/.exec(block);
    pics.push({ x, y, w, h, rId: embedMatch?.[1] || null, type: "image" });
  }
  return pics;
}

function getSlideDims(presXml) {
  const m = /<p:sldSz\s[^>]*\/?>/i.exec(presXml);
  if (m) { return { cx: parseInt(getAttr(m[0], "cx")) || 12192000, cy: parseInt(getAttr(m[0], "cy")) || 6858000 }; }
  return { cx: 12192000, cy: 6858000 };
}

function getBgColor(xml) {
  const m = /<a:srgbClr val="([A-Fa-f0-9]{6})"/.exec(xml);
  return m ? `#${m[1]}` : null;
}

/* ───────── Canvas thumbnail ───────── */
async function renderThumb(shapes, pics, images, dims, bg) {
  const canvas = document.createElement("canvas");
  canvas.width = THUMB_W * 2; canvas.height = THUMB_H * 2;
  const ctx = canvas.getContext("2d");
  const sx = (THUMB_W * 2) / dims.cx, sy = (THUMB_H * 2) / dims.cy;
  ctx.fillStyle = bg || "#1c1c2e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const pic of pics) {
    if (pic.rId && images[pic.rId]) {
      try {
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = images[pic.rId]; });
        ctx.drawImage(img, pic.x * sx, pic.y * sy, pic.w * sx, pic.h * sy);
      } catch (e) {}
    }
  }
  for (const shape of shapes) {
    if (!shape.lines.length) continue;
    const px = shape.x * sx, py = shape.y * sy, pw = shape.w * sx;
    const fs = Math.max(8, Math.min(26, shape.fontSize * sy * 55));
    ctx.fillStyle = "rgba(240,240,255,0.9)";
    ctx.font = `${shape.isBold ? "bold " : ""}${fs}px sans-serif`;
    ctx.textBaseline = "top";
    let ly = py + 4;
    for (const line of shape.lines) {
      if (ly > canvas.height - 8) break;
      const words = line.split(" ");
      let cur = "";
      for (const w of words) {
        const test = cur ? cur + " " + w : w;
        if (ctx.measureText(test).width > pw - 8 && cur) { ctx.fillText(cur, px + 4, ly); ly += fs + 2; cur = w; }
        else cur = test;
      }
      if (cur) { ctx.fillText(cur, px + 4, ly); ly += fs + 5; }
    }
  }
  return canvas.toDataURL("image/jpeg", 0.65);
}

/* ───────── Process PPTX ───────── */
async function processPPTX(file, JSZip, onP) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  let dims = { cx: 12192000, cy: 6858000 };
  if (zip.files["ppt/presentation.xml"]) dims = getSlideDims(await zip.files["ppt/presentation.xml"].async("string"));

  const slideFiles = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => parseInt(a.match(/slide(\d+)/)[1]) - parseInt(b.match(/slide(\d+)/)[1]));

  const media = {};
  for (const mk of Object.keys(zip.files).filter((n) => n.startsWith("ppt/media/"))) {
    try {
      const blob = await zip.files[mk].async("blob");
      const ext = mk.split(".").pop().toLowerCase();
      const mimes = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif" };
      media[mk] = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(new Blob([blob], { type: mimes[ext] || "image/png" })); });
    } catch (e) {}
  }

  const noteMap = {};
  Object.keys(zip.files).filter((n) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(n))
    .forEach((n) => { noteMap[n.match(/notesSlide(\d+)/)[1]] = n; });

  const results = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const num = parseInt(slideFiles[i].match(/slide(\d+)/)[1]);
    onP?.(`Slide ${i + 1}/${slideFiles.length}`);
    const xml = await zip.files[slideFiles[i]].async("string");
    const shapes = parseShapes(xml);
    const pics = parsePicShapes(xml);
    const bg = getBgColor(xml);

    let imgMap = {};
    const relsPath = `ppt/slides/_rels/slide${num}.xml.rels`;
    if (zip.files[relsPath]) {
      const rels = parseImageRels(await zip.files[relsPath].async("string"));
      for (const [rId, target] of Object.entries(rels)) { if (media[target]) imgMap[rId] = media[target]; }
    }

    const fullText = shapes.flatMap((s) => s.lines).join(" ");
    let notes = "";
    if (noteMap[String(num)] && zip.files[noteMap[String(num)]]) {
      const nXml = await zip.files[noteMap[String(num)]].async("string");
      const nArr = []; const nR = /<a:t>([^<]*)<\/a:t>/g; let nm;
      while ((nm = nR.exec(nXml)) !== null) { if (nm[1].trim()) nArr.push(nm[1].trim()); }
      notes = nArr.join(" ");
    }

    let thumb = null;
    try { thumb = await renderThumb(shapes, pics, imgMap, dims, bg); } catch (e) {}

    const slideImgs = Object.values(imgMap).filter((u) => /^data:image\/(png|jpeg|jpg)/.test(u));

    results.push({
      fileName: file.name, slideNum: num, totalSlides: slideFiles.length,
      text: fullText, notes,
      shapes: shapes.map((s) => ({ lines: s.lines, isBold: s.isBold, fontSize: s.fontSize })),
      thumbnail: thumb,
      imageUrls: slideImgs.slice(0, 3),
      ocrText: "", indexedAt: Date.now(),
    });
  }
  return results;
}

/* ───────── Highlight ───────── */
function HL({ text, q }) {
  if (!q?.trim()) return text;
  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return text;
  const esc = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${esc.join("|")})`, "gi");
  return text.split(re).map((p, i) =>
    terms.includes(p.toLowerCase()) ? <mark key={i} style={{ background: "#d4a843", color: "#111", borderRadius: 2, padding: "0 1px" }}>{p}</mark> : p
  );
}

/* ───────── Icons ───────── */
const I = {
  search: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  star: (f) => <svg width="13" height="13" viewBox="0 0 24 24" fill={f?"currentColor":"none"} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  grid: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  list: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>,
  copy: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  ocr: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h3"/><path d="M20 7V4h-3"/><path d="M4 17v3h3"/><path d="M20 17v3h-3"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>,
  x: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
};

/* ───────── SlideCard ───────── */
function Card({ slide, q, fav, onFav, onClick, mode }) {
  const title = slide.shapes?.[0]?.lines?.[0] || "";
  const body = (slide.shapes || []).slice(1).flatMap((s) => s.lines).filter(Boolean);
  const isList = mode === "list";

  return (
    <div onClick={onClick} style={{
      background: "#161628", borderRadius: isList ? 8 : 10, overflow: "hidden", cursor: "pointer",
      transition: "transform 0.12s, box-shadow 0.12s", border: "1px solid rgba(255,255,255,0.04)",
      display: isList ? "flex" : "block", alignItems: isList ? "center" : undefined,
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = isList ? "translateX(2px)" : "translateY(-2px) scale(1.01)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(0,0,0,0.3)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ width: isList ? 130 : "100%", minWidth: isList ? 130 : undefined, aspectRatio: "16/10", background: "#10101c", position: "relative", overflow: "hidden", flexShrink: 0 }}>
        {slide.thumbnail ? (
          <img src={slide.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ padding: 10, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", background: "linear-gradient(135deg, #1a1a30, #14142a)" }}>
            {title && <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.6)", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}><HL text={title} q={q}/></div>}
          </div>
        )}
        <div style={{ position: "absolute", bottom: 3, right: 4, background: "rgba(0,0,0,0.65)", borderRadius: 3, padding: "1px 5px", fontSize: 9, color: "rgba(255,255,255,0.6)", fontVariantNumeric: "tabular-nums" }}>#{slide.slideNum}</div>
        <button onClick={(e) => { e.stopPropagation(); onFav(); }} style={{
          position: "absolute", top: 3, right: 4, background: "rgba(0,0,0,0.5)", border: "none", borderRadius: 4,
          padding: "2px 3px", cursor: "pointer", color: fav ? "#d4a843" : "rgba(255,255,255,0.3)", display: "flex", alignItems: "center",
        }}>{I.star(fav)}</button>
        {slide.ocrText && <div style={{ position: "absolute", bottom: 3, left: 4, background: "rgba(212,168,67,0.3)", borderRadius: 3, padding: "1px 4px", fontSize: 7, color: "#d4a843", fontWeight: 700 }}>OCR</div>}
      </div>
      <div style={{ padding: isList ? "6px 14px" : "7px 10px", flex: isList ? 1 : undefined, minWidth: 0 }}>
        {title && <div style={{ fontSize: 11.5, fontWeight: 600, color: "rgba(255,255,255,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 1 }}><HL text={title} q={q}/></div>}
        {isList && body.length > 0 && <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><HL text={body.slice(0, 3).join(" · ")} q={q}/></div>}
        <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.25)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{slide.fileName}</div>
      </div>
    </div>
  );
}

/* ───────── Detail Modal ───────── */
function Modal({ slide, q, onClose, fav, onFav }) {
  if (!slide) return null;
  const shapes = slide.shapes || [];
  const [copied, setCopied] = useState(false);
  const copy = () => {
    const t = shapes.flatMap((s) => s.lines).join("\n") + (slide.notes ? "\n\n[Notes]\n" + slide.notes : "") + (slide.ocrText ? "\n\n[OCR]\n" + slide.ocrText : "");
    navigator.clipboard?.writeText(t); setCopied(true); setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#141426", borderRadius: 14, maxWidth: 780, width: "100%", maxHeight: "92vh", overflow: "auto", border: "1px solid rgba(255,255,255,0.06)" }}>
        {slide.thumbnail && (
          <div style={{ background: "#0c0c18", borderRadius: "14px 14px 0 0", overflow: "hidden", display: "flex", justifyContent: "center" }}>
            <img src={slide.thumbnail} alt="" style={{ maxWidth: "100%", maxHeight: 320, objectFit: "contain", display: "block" }} />
          </div>
        )}
        <div style={{ padding: "14px 22px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#e0e0f0" }}>{slide.fileName}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>Slide {slide.slideNum} of {slide.totalSlides}</div>
          </div>
          <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
            <button onClick={onFav} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", color: fav ? "#d4a843" : "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontFamily: "inherit" }}>{I.star(fav)} {fav ? "Starred" : "Star"}</button>
            <button onClick={copy} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", color: copied ? "#6fbf73" : "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontFamily: "inherit" }}>{I.copy} {copied ? "Copied!" : "Copy"}</button>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 6, width: 30, height: 30, cursor: "pointer", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>{I.x}</button>
          </div>
        </div>
        <div style={{ padding: "14px 22px 22px" }}>
          {shapes.length === 0 && !slide.ocrText && <div style={{ color: "rgba(255,255,255,0.2)", fontStyle: "italic", fontSize: 13 }}>No text content</div>}
          {shapes.map((s, si) => (
            <div key={si} style={{ marginBottom: 10, padding: "9px 13px", background: "rgba(255,255,255,0.02)", borderRadius: 7, borderLeft: si === 0 ? "3px solid #d4a843" : "3px solid rgba(255,255,255,0.04)" }}>
              {s.lines.map((l, li) => (
                <div key={li} style={{ fontSize: si === 0 && li === 0 ? 15 : 13, fontWeight: s.isBold || (si === 0 && li === 0) ? 700 : 400, color: si === 0 && li === 0 ? "#e0e0f0" : "rgba(255,255,255,0.55)", lineHeight: 1.65 }}><HL text={l} q={q}/></div>
              ))}
            </div>
          ))}
          {slide.notes && (
            <div style={{ marginTop: 14, padding: "9px 13px", background: "rgba(212,168,67,0.03)", borderRadius: 7, borderLeft: "3px solid rgba(212,168,67,0.25)" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#d4a843", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Speaker Notes</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}><HL text={slide.notes} q={q}/></div>
            </div>
          )}
          {slide.ocrText && (
            <div style={{ marginTop: 10, padding: "9px 13px", background: "rgba(106,180,255,0.03)", borderRadius: 7, borderLeft: "3px solid rgba(106,180,255,0.25)" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#6ab4ff", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>OCR Text (from images)</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}><HL text={slide.ocrText} q={q}/></div>
            </div>
          )}
          {slide.imageUrls?.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.2)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Extracted Images</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {slide.imageUrls.map((url, i) => <img key={i} src={url} alt="" style={{ maxWidth: 180, maxHeight: 130, borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────── APP ───────── */
export default function SlideVault() {
  const [slides, setSlides] = useState([]);
  const [fileStats, setFileStats] = useState({});
  const [favs, setFavs] = useState(new Set());
  const [query, setQuery] = useState("");
  const [deck, setDeck] = useState(null);
  const [favsOnly, setFavsOnly] = useState(false);
  const [view, setView] = useState("grid");
  const [sel, setSel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [prog, setProg] = useState("");
  const [ocrRun, setOcrRun] = useState(false);
  const [ocrProg, setOcrProg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [ready, setReady] = useState(false);
  const [sidebar, setSidebar] = useState(true);
  const fRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_KEY);
        if (r?.value) { const d = JSON.parse(r.value); if (d.slides) setSlides(d.slides); if (d.fileStats) setFileStats(d.fileStats); if (d.favorites) setFavs(new Set(d.favorites)); }
      } catch (e) {}
      setReady(true);
    })();
  }, []);

  const save = useCallback(async (s, fs, fv) => {
    try {
      const trim = s.map((sl) => ({ ...sl, imageUrls: [], thumbnail: sl.thumbnail?.substring(0, 60000) || null }));
      await window.storage.set(STORAGE_KEY, JSON.stringify({ slides: trim, fileStats: fs, favorites: [...fv] }));
    } catch (e) { console.error("Save failed", e); }
  }, []);

  const processFiles = useCallback(async (files) => {
    const pf = Array.from(files).filter((f) => f.name.endsWith(".pptx"));
    if (!pf.length) { setProg("Only .pptx supported"); setTimeout(() => setProg(""), 3000); return; }
    setLoading(true);
    let JSZip;
    try { setProg("Loading parser..."); JSZip = await loadJSZip(); } catch (e) { setProg("Failed to load JSZip"); setLoading(false); return; }
    const ns = [...slides]; const nfs = { ...fileStats };
    for (let fi = 0; fi < pf.length; fi++) {
      const f = pf[fi];
      setProg(`${fi + 1}/${pf.length}: ${f.name}`);
      if (nfs[f.name]) { for (let i = ns.length - 1; i >= 0; i--) { if (ns[i].fileName === f.name) ns.splice(i, 1); } }
      try {
        const parsed = await processPPTX(f, JSZip, (m) => setProg(`${f.name}: ${m}`));
        ns.push(...parsed);
        nfs[f.name] = { slides: parsed.length, size: f.size, indexedAt: Date.now() };
      } catch (e) { console.error(e); setProg(`Error: ${f.name}`); await new Promise((r) => setTimeout(r, 1500)); }
    }
    setSlides(ns); setFileStats(nfs); await save(ns, nfs, favs);
    setProg(`Done — ${ns.length} slides indexed`); setLoading(false);
    setTimeout(() => setProg(""), 4000);
  }, [slides, fileStats, favs, save]);

  const runOCR = useCallback(async () => {
    const todo = slides.filter((s) => s.imageUrls?.length > 0 && !s.ocrText);
    if (!todo.length) { setOcrProg("No images to OCR"); setTimeout(() => setOcrProg(""), 3000); return; }
    setOcrRun(true);
    let T;
    try { setOcrProg("Loading Tesseract OCR..."); T = await loadTesseract(); } catch (e) { setOcrProg("Failed to load OCR"); setOcrRun(false); return; }
    const upd = [...slides]; let n = 0;
    for (const s of todo) {
      n++;
      setOcrProg(`OCR ${n}/${todo.length}: ${s.fileName} #${s.slideNum}`);
      const idx = upd.findIndex((u) => u.fileName === s.fileName && u.slideNum === s.slideNum);
      if (idx === -1) continue;
      const txts = [];
      for (const url of s.imageUrls) {
        try { const r = await T.recognize(url, "eng", { logger: () => {} }); if (r.data.text.trim()) txts.push(r.data.text.trim()); } catch (e) {}
      }
      if (txts.length) upd[idx] = { ...upd[idx], ocrText: txts.join(" ") };
    }
    setSlides(upd); await save(upd, fileStats, favs);
    setOcrProg(`OCR complete — ${n} slides`); setOcrRun(false);
    setTimeout(() => setOcrProg(""), 4000);
  }, [slides, fileStats, favs, save]);

  const fk = (s) => `${s.fileName}::${s.slideNum}`;
  const toggleFav = useCallback((k) => {
    setFavs((p) => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); save(slides, fileStats, n); return n; });
  }, [slides, fileStats, save]);

  const clearAll = useCallback(async () => {
    setSlides([]); setFileStats({}); setFavs(new Set()); setDeck(null); setFavsOnly(false);
    try { await window.storage.delete(STORAGE_KEY); } catch (e) {}
  }, []);

  const filtered = useMemo(() => {
    let r = slides;
    if (deck) r = r.filter((s) => s.fileName === deck);
    if (favsOnly) r = r.filter((s) => favs.has(fk(s)));
    if (query.trim()) {
      const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      r = r.filter((s) => { const h = (s.text + " " + s.notes + " " + s.ocrText + " " + s.fileName).toLowerCase(); return terms.every((t) => h.includes(t)); });
    }
    return r;
  }, [slides, deck, favsOnly, favs, query]);

  const decks = useMemo(() => [...new Set(slides.map((s) => s.fileName))].sort(), [slides]);
  const imgCount = slides.reduce((n, s) => n + (s.imageUrls?.length || 0), 0);
  const ocrDone = slides.filter((s) => s.ocrText).length;

  useEffect(() => { const l = document.createElement("link"); l.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400&display=swap"; l.rel = "stylesheet"; document.head.appendChild(l); }, []);

  if (!ready) return <div style={{ minHeight: "100vh", background: "#0c0c18", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit',sans-serif", color: "#e0e0f0" }}>Loading...</div>;

  const sidebarW = 210;

  return (
    <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files); }}
      style={{ minHeight: "100vh", background: "#0c0c18", fontFamily: "'Outfit',sans-serif", color: "#e0e0f0", display: "flex" }}>

      {dragOver && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(12,12,24,0.95)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", border: "3px dashed #d4a843" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>📂</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#d4a843" }}>Drop .pptx files</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Thumbnails + text + images will be indexed</div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      {sidebar && slides.length > 0 && (
        <div style={{ width: sidebarW, minWidth: sidebarW, borderRight: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.01)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "16px 14px 10px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Library</div>
            {[
              { label: `All Slides (${slides.length})`, active: !deck && !favsOnly, onClick: () => { setDeck(null); setFavsOnly(false); } },
              { label: `Starred (${favs.size})`, active: favsOnly, onClick: () => { setDeck(null); setFavsOnly(true); }, icon: I.star(true) },
            ].map((item, i) => (
              <button key={i} onClick={item.onClick} style={{ width: "100%", textAlign: "left", background: item.active ? "rgba(212,168,67,0.08)" : "transparent", border: "none", borderRadius: 5, padding: "6px 9px", color: item.active ? "#d4a843" : "rgba(255,255,255,0.45)", fontSize: 11.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", marginBottom: 2, display: "flex", alignItems: "center", gap: 5 }}>
                {item.icon}{item.label}
              </button>
            ))}
          </div>
          <div style={{ padding: "10px 14px", flex: 1, overflow: "auto" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Decks ({decks.length})</div>
            {decks.map((name) => {
              const cnt = slides.filter((s) => s.fileName === name).length;
              const act = deck === name && !favsOnly;
              return (
                <button key={name} onClick={() => { setDeck(name); setFavsOnly(false); }} style={{ width: "100%", textAlign: "left", background: act ? "rgba(212,168,67,0.08)" : "transparent", border: "none", borderRadius: 5, padding: "5px 9px", color: act ? "#d4a843" : "rgba(255,255,255,0.35)", fontSize: 10.5, cursor: "pointer", fontFamily: "inherit", marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                  {name} <span style={{ opacity: 0.4 }}>({cnt})</span>
                </button>
              );
            })}
          </div>
          <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.03)", fontSize: 9, color: "rgba(255,255,255,0.15)", lineHeight: 1.8 }}>
            {slides.length} slides · {imgCount} images{ocrDone > 0 && ` · ${ocrDone} OCR'd`}
          </div>
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.03)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 4, cursor: "pointer", flexShrink: 0 }} onClick={() => slides.length && setSidebar(!sidebar)}>
            <div style={{ width: 32, height: 32, borderRadius: 7, background: "linear-gradient(135deg, #d4a843, #c06030)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#111" }}>S</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>SlideVault</div>
              <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.2)", fontWeight: 400 }}>Index · Search · Find</div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
            <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.2)", display: "flex" }}>{I.search}</div>
            <input type="text" placeholder="Search slides, notes, OCR text..." value={query} onChange={(e) => setQuery(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 7, padding: "8px 12px 8px 32px", color: "#e0e0f0", fontSize: 12.5, fontFamily: "inherit", outline: "none" }}
              onFocus={(e) => e.target.style.borderColor = "rgba(212,168,67,0.3)"} onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.05)"} />
          </div>

          <div style={{ display: "flex", gap: 1, background: "rgba(255,255,255,0.03)", borderRadius: 5, padding: 2 }}>
            {["grid", "list"].map((m) => (
              <button key={m} onClick={() => setView(m)} style={{ background: view === m ? "rgba(255,255,255,0.08)" : "transparent", border: "none", borderRadius: 3, padding: "4px 7px", color: view === m ? "#e0e0f0" : "rgba(255,255,255,0.25)", cursor: "pointer", display: "flex" }}>
                {m === "grid" ? I.grid : I.list}
              </button>
            ))}
          </div>

          <button onClick={() => fRef.current?.click()} disabled={loading} style={{ background: "linear-gradient(135deg, #d4a843, #c06030)", border: "none", borderRadius: 6, padding: "7px 14px", color: "#111", fontWeight: 700, fontSize: 11.5, cursor: loading ? "wait" : "pointer", fontFamily: "inherit", opacity: loading ? 0.6 : 1, whiteSpace: "nowrap" }}>
            {loading ? "Indexing..." : "+ Add Files"}
          </button>

          {slides.some((s) => s.imageUrls?.length > 0) && (
            <button onClick={runOCR} disabled={ocrRun} style={{ background: "rgba(106,180,255,0.1)", border: "1px solid rgba(106,180,255,0.15)", borderRadius: 6, padding: "7px 12px", color: "#6ab4ff", fontWeight: 600, fontSize: 11, cursor: ocrRun ? "wait" : "pointer", fontFamily: "inherit", opacity: ocrRun ? 0.6 : 1, display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
              {I.ocr} {ocrRun ? "Running..." : "Run OCR"}
            </button>
          )}

          {slides.length > 0 && <button onClick={clearAll} style={{ background: "none", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 6, padding: "7px 10px", color: "rgba(255,255,255,0.25)", fontSize: 10.5, cursor: "pointer", fontFamily: "inherit" }}>Clear</button>}
        </div>

        <input ref={fRef} type="file" multiple accept=".pptx" style={{ display: "none" }} onChange={(e) => { if (e.target.files.length) processFiles(e.target.files); e.target.value = ""; }} />

        {(prog || ocrProg) && (
          <div style={{ padding: "5px 20px", display: "flex", flexDirection: "column", gap: 3 }}>
            {prog && <div style={{ padding: "5px 10px", background: "rgba(212,168,67,0.06)", borderRadius: 5, fontSize: 10.5, color: "#d4a843", fontFamily: "'JetBrains Mono',monospace" }}>{prog}</div>}
            {ocrProg && <div style={{ padding: "5px 10px", background: "rgba(106,180,255,0.06)", borderRadius: 5, fontSize: 10.5, color: "#6ab4ff", fontFamily: "'JetBrains Mono',monospace" }}>{ocrProg}</div>}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "14px 20px 36px" }}>
          {slides.length === 0 && !loading ? (
            <div style={{ textAlign: "center", padding: "70px 20px", color: "rgba(255,255,255,0.18)" }}>
              <div style={{ fontSize: 56, marginBottom: 14, opacity: 0.35 }}>📑</div>
              <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 6, color: "rgba(255,255,255,0.35)" }}>Drop your .pptx files here</div>
              <div style={{ fontSize: 12.5, maxWidth: 420, margin: "0 auto", lineHeight: 1.8, color: "rgba(255,255,255,0.2)" }}>
                Navigate to your synced OneDrive folder, select all .pptx files, and drag them in.
                Every slide gets a canvas-rendered thumbnail, full text index, image extraction, and optional OCR.
              </div>
              <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
                {["Canvas Thumbnails", "Full-Text Search", "Image Extraction", "Tesseract OCR", "Speaker Notes", "Favorites"].map((f) => (
                  <div key={f} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: "6px 12px", fontSize: 10.5, color: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.04)" }}>{f}</div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {(query || favsOnly || deck) && (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>
                  {filtered.length} result{filtered.length !== 1 ? "s" : ""}{deck ? ` in "${deck}"` : ""}{favsOnly ? " (starred)" : ""}
                </div>
              )}

              {view === "grid" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
                  {filtered.map((s, i) => <Card key={`${s.fileName}-${s.slideNum}-${i}`} slide={s} q={query} mode={view} fav={favs.has(fk(s))} onFav={() => toggleFav(fk(s))} onClick={() => setSel(s)} />)}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {filtered.map((s, i) => <Card key={`${s.fileName}-${s.slideNum}-${i}`} slide={s} q={query} mode={view} fav={favs.has(fk(s))} onFav={() => toggleFav(fk(s))} onClick={() => setSel(s)} />)}
                </div>
              )}

              {filtered.length === 0 && (
                <div style={{ textAlign: "center", padding: "50px 20px", color: "rgba(255,255,255,0.18)" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>No matching slides</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Modal slide={sel} q={query} onClose={() => setSel(null)} fav={sel ? favs.has(fk(sel)) : false} onFav={() => sel && toggleFav(fk(sel))} />
    </div>
  );
}
