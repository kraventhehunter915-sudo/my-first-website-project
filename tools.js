/* global toast, copyOutput, copyText */
const TOOLS = [];

function addTool(def) {
  TOOLS.push(def);
}

function card(title, desc, body) {
  return `<section class="tool-card"><h2>${title}</h2><p class="tool-desc">${desc}</p>${body}</section>`;
}

function setOut(id, text, ok) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.style.color = ok === false ? 'var(--accent3)' : 'var(--accent)';
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', i = 0, q = false;
  while (i < text.length) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i += 2; continue; }
      if (c === '"') { q = false; i++; continue; }
      cell += c; i++; continue;
    }
    if (c === '"') { q = true; i++; continue; }
    if (c === ',') { row.push(cell); cell = ''; i++; continue; }
    if (c === '\n' || (c === '\r' && text[i + 1] === '\n')) {
      row.push(cell); rows.push(row); row = []; cell = '';
      i += c === '\r' ? 2 : 1; continue;
    }
    if (c === '\r') { row.push(cell); rows.push(row); row = []; cell = ''; i++; continue; }
    cell += c; i++;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => String(x).trim() !== ''));
}

function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return decodeURIComponent(escape(atob(s)));
}

function simpleMarkdown(md) {
  let html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/^\s*[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, m => '<ul>' + m + '</ul>');
  html = html.replace(/\n{2,}/g, '</p><p>');
  return '<p>' + html + '</p>';
}

function prettyXml(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) throw new Error(err.textContent.split('\n')[0] || 'Invalid XML');
  const raw = new XMLSerializer().serializeToString(doc);
  let pad = 0, out = '';
  raw.replace(/>\s*</g, '><').split(/(?=<)/).forEach(chunk => {
    if (!chunk) return;
    if (/^<\//.test(chunk)) pad = Math.max(0, pad - 1);
    out += '  '.repeat(pad) + chunk.trim() + '\n';
    if (/^<[^!?/][^>]*[^/]>$/.test(chunk.trim())) pad++;
  });
  return out.trim();
}

/* ── Original 8 ── */

addTool({
  id: 'word-counter',
  name: 'Word & Character Counter',
  category: 'Text',
  keywords: ['words', 'characters', 'reading time', 'sentences'],
  description: 'Count words, characters, sentences, and reading time instantly.',
  tips: ['<strong>Word Counter</strong> — ideal for blog posts, essays, and tweet drafts.', '<strong>Reading time</strong> assumes about 200 words per minute.'],
  render() {
    return card(this.name, this.description, `
      <textarea id="wc-input" placeholder="Paste or type your text here…" rows="6"></textarea>
      <div class="stats-row">
        <div class="stat-pill">Words: <span id="wc-words">0</span></div>
        <div class="stat-pill">Characters: <span id="wc-chars">0</span></div>
        <div class="stat-pill">Characters (no spaces): <span id="wc-chars-ns">0</span></div>
        <div class="stat-pill">Sentences: <span id="wc-sentences">0</span></div>
        <div class="stat-pill">Paragraphs: <span id="wc-paras">0</span></div>
        <div class="stat-pill">Reading time: <span id="wc-read">0 sec</span></div>
      </div>
      <div class="btn-row">
        <button class="btn" id="wc-clear">Clear</button>
        <button class="btn" id="wc-copy">Copy text</button>
      </div>`);
  },
  init() {
    function countWords() {
      const t = document.getElementById('wc-input').value;
      const words = t.trim() === '' ? 0 : t.trim().split(/\s+/).length;
      const chars = t.length;
      const charsNS = t.replace(/\s/g, '').length;
      const sentences = t === '' ? 0 : (t.match(/[.!?]+/g) || []).length;
      const paras = t === '' ? 0 : t.split(/\n\s*\n/).filter(p => p.trim()).length || (t.trim() ? 1 : 0);
      const readSec = Math.ceil(words / 200 * 60);
      const readStr = readSec < 60 ? readSec + ' sec' : Math.ceil(readSec / 60) + ' min';
      document.getElementById('wc-words').textContent = words.toLocaleString();
      document.getElementById('wc-chars').textContent = chars.toLocaleString();
      document.getElementById('wc-chars-ns').textContent = charsNS.toLocaleString();
      document.getElementById('wc-sentences').textContent = sentences.toLocaleString();
      document.getElementById('wc-paras').textContent = paras.toLocaleString();
      document.getElementById('wc-read').textContent = readStr;
    }
    document.getElementById('wc-input').addEventListener('input', countWords);
    document.getElementById('wc-clear').addEventListener('click', () => { document.getElementById('wc-input').value = ''; countWords(); });
    document.getElementById('wc-copy').addEventListener('click', () => copyText('wc-input'));
  }
});

addTool({
  id: 'password-gen',
  name: 'Password Generator',
  category: 'Generate',
  keywords: ['password', 'random', 'security', 'strong'],
  description: 'Generate strong, random passwords with custom options.',
  tips: ['<strong>Password Generator</strong> — use 16+ characters with all character types for best security.', 'Passwords are created locally with Math.random in this version — they never leave your browser.'],
  render() {
    return card(this.name, this.description, `
      <label class="field-label">Length: <span id="pw-len-label">16</span></label>
      <input type="range" min="6" max="64" value="16" id="pw-len">
      <div class="check-group">
        <label><input type="checkbox" id="pw-upper" checked> Uppercase (A–Z)</label>
        <label><input type="checkbox" id="pw-lower" checked> Lowercase (a–z)</label>
        <label><input type="checkbox" id="pw-nums" checked> Numbers (0–9)</label>
        <label><input type="checkbox" id="pw-sym" checked> Symbols (!@#$)</label>
      </div>
      <div class="output-box" id="pw-output">Click generate ↓</div>
      <div class="strength-bar"><div class="strength-fill" id="pw-strength" style="width:0%;background:var(--accent3)"></div></div>
      <p style="font-size:12px;color:var(--muted);margin-top:4px" id="pw-strength-label">—</p>
      <div class="btn-row">
        <button class="btn primary" id="pw-gen">Generate</button>
        <button class="btn" id="pw-copy">Copy</button>
      </div>`);
  },
  init() {
    const CHARSETS = {
      upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      lower: 'abcdefghijklmnopqrstuvwxyz',
      nums: '0123456789',
      sym: '!@#$%^&*()-_=+[]{}|;:,.<>?'
    };
    function generatePw() {
      const len = +document.getElementById('pw-len').value;
      let pool = '';
      if (document.getElementById('pw-upper').checked) pool += CHARSETS.upper;
      if (document.getElementById('pw-lower').checked) pool += CHARSETS.lower;
      if (document.getElementById('pw-nums').checked) pool += CHARSETS.nums;
      if (document.getElementById('pw-sym').checked) pool += CHARSETS.sym;
      if (!pool) { document.getElementById('pw-output').textContent = 'Select at least one option'; return; }
      let pw = '';
      for (let i = 0; i < len; i++) pw += pool[Math.floor(Math.random() * pool.length)];
      document.getElementById('pw-output').textContent = pw;
      const score = Math.min(100, Math.round((pool.length / 95) * 60 + (len / 64) * 40));
      const fill = document.getElementById('pw-strength');
      const label = document.getElementById('pw-strength-label');
      fill.style.width = score + '%';
      if (score < 35) { fill.style.background = '#ff7c7c'; label.textContent = 'Weak'; }
      else if (score < 65) { fill.style.background = '#ffc96e'; label.textContent = 'Fair'; }
      else if (score < 85) { fill.style.background = '#5b8cff'; label.textContent = 'Strong'; }
      else { fill.style.background = '#7cffc4'; label.textContent = 'Very strong'; }
    }
    document.getElementById('pw-len').addEventListener('input', function () {
      document.getElementById('pw-len-label').textContent = this.value;
      generatePw();
    });
    ['pw-upper', 'pw-lower', 'pw-nums', 'pw-sym'].forEach(id => document.getElementById(id).addEventListener('change', generatePw));
    document.getElementById('pw-gen').addEventListener('click', generatePw);
    document.getElementById('pw-copy').addEventListener('click', () => copyOutput('pw-output'));
    generatePw();
  }
});

addTool({
  id: 'json-format',
  name: 'JSON Formatter & Validator',
  category: 'Developer',
  keywords: ['json', 'beautify', 'minify', 'validate', 'api'],
  description: 'Paste messy JSON to format, validate, and minify it.',
  tips: ['<strong>JSON Formatter</strong> — paste API responses to spot errors fast.', 'Invalid JSON shows the parser error so you can jump to the problem.'],
  render() {
    return card(this.name, this.description, `
      <textarea id="json-input" placeholder='{"name":"Alice","age":30,"hobbies":["reading","coding"]}' rows="6"></textarea>
      <div class="btn-row">
        <button class="btn primary" id="json-fmt">Format / Beautify</button>
        <button class="btn" id="json-min">Minify</button>
        <button class="btn" id="json-val">Validate only</button>
        <button class="btn" id="json-copy">Copy</button>
      </div>
      <div class="output-box" id="json-output" style="min-height:100px"></div>`);
  },
  init() {
    function formatJson() {
      try {
        const parsed = JSON.parse(document.getElementById('json-input').value);
        setOut('json-output', JSON.stringify(parsed, null, 2), true);
      } catch (e) { setOut('json-output', '✗ Invalid JSON: ' + e.message, false); }
    }
    function minifyJson() {
      try {
        const parsed = JSON.parse(document.getElementById('json-input').value);
        setOut('json-output', JSON.stringify(parsed), true);
      } catch (e) { setOut('json-output', '✗ Invalid JSON: ' + e.message, false); }
    }
    function validateJson() {
      try {
        JSON.parse(document.getElementById('json-input').value);
        setOut('json-output', '✓ Valid JSON', true);
      } catch (e) { setOut('json-output', '✗ Invalid: ' + e.message, false); }
    }
    document.getElementById('json-fmt').addEventListener('click', formatJson);
    document.getElementById('json-min').addEventListener('click', minifyJson);
    document.getElementById('json-val').addEventListener('click', validateJson);
    document.getElementById('json-copy').addEventListener('click', () => copyOutput('json-output'));
  }
});

addTool({
  id: 'base64',
  name: 'Base64 Encoder / Decoder',
  category: 'Developer',
  keywords: ['base64', 'encode', 'decode', 'data uri'],
  description: 'Encode plain text to Base64 or decode Base64 back to text.',
  tips: ['<strong>Base64</strong> — commonly used in email attachments and data URIs.', 'UTF-8 text is supported via encodeURIComponent wrapping.'],
  render() {
    return card(this.name, this.description, `
      <textarea id="b64-input" placeholder="Enter text or Base64 string…" rows="4"></textarea>
      <div class="btn-row">
        <button class="btn primary" id="b64-enc">Encode →</button>
        <button class="btn" id="b64-dec">← Decode</button>
        <button class="btn" id="b64-copy">Copy</button>
      </div>
      <div class="output-box" id="b64-output"></div>`);
  },
  init() {
    document.getElementById('b64-enc').addEventListener('click', () => {
      try {
        setOut('b64-output', btoa(unescape(encodeURIComponent(document.getElementById('b64-input').value))), true);
      } catch (e) { setOut('b64-output', 'Error: ' + e.message, false); }
    });
    document.getElementById('b64-dec').addEventListener('click', () => {
      try {
        setOut('b64-output', decodeURIComponent(escape(atob(document.getElementById('b64-input').value.trim()))), true);
      } catch (e) { setOut('b64-output', 'Error: Invalid Base64 input.', false); }
    });
    document.getElementById('b64-copy').addEventListener('click', () => copyOutput('b64-output'));
  }
});

addTool({
  id: 'case-convert',
  name: 'Text Case Converter',
  category: 'Text',
  keywords: ['uppercase', 'lowercase', 'camelcase', 'snake', 'kebab', 'title'],
  description: 'Convert your text between UPPER CASE, lower case, Title Case, camelCase, and more.',
  tips: ['<strong>Case converter</strong> is handy for renaming identifiers and headlines.', 'camelCase / snake_case / kebab-case strip punctuation as they go.'],
  render() {
    return card(this.name, this.description, `
      <textarea id="case-input" placeholder="Type or paste text here…" rows="4"></textarea>
      <div class="btn-row">
        <button class="btn" data-case="upper">UPPER</button>
        <button class="btn" data-case="lower">lower</button>
        <button class="btn" data-case="title">Title Case</button>
        <button class="btn" data-case="sentence">Sentence case</button>
        <button class="btn" data-case="camel">camelCase</button>
        <button class="btn" data-case="snake">snake_case</button>
        <button class="btn" data-case="kebab">kebab-case</button>
      </div>
      <div class="output-box" id="case-output"></div>
      <div class="btn-row"><button class="btn" id="case-copy">Copy result</button></div>`);
  },
  init() {
    function convertCase(type) {
      const t = document.getElementById('case-input').value;
      let out = '';
      if (type === 'upper') out = t.toUpperCase();
      else if (type === 'lower') out = t.toLowerCase();
      else if (type === 'title') out = t.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
      else if (type === 'sentence') out = t.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase());
      else if (type === 'camel') {
        out = t.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase());
        out = out.charAt(0).toLowerCase() + out.slice(1);
      }
      else if (type === 'snake') out = t.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      else if (type === 'kebab') out = t.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      document.getElementById('case-output').textContent = out;
    }
    document.querySelectorAll('[data-case]').forEach(btn => btn.addEventListener('click', () => convertCase(btn.dataset.case)));
    document.getElementById('case-copy').addEventListener('click', () => copyOutput('case-output'));
  }
});

addTool({
  id: 'url-encode',
  name: 'URL Encoder / Decoder',
  category: 'Developer',
  keywords: ['url', 'percent', 'encodeURIComponent', 'query'],
  description: 'Encode special characters for use in URLs, or decode encoded URLs.',
  tips: ['Uses encodeURIComponent / decodeURIComponent.', 'Spaces become %20, not +.'],
  render() {
    return card(this.name, this.description, `
      <textarea id="url-input" placeholder="https://example.com/search?q=hello world&lang=en" rows="3"></textarea>
      <div class="btn-row">
        <button class="btn primary" id="url-enc">Encode →</button>
        <button class="btn" id="url-dec">← Decode</button>
        <button class="btn" id="url-copy">Copy</button>
      </div>
      <div class="output-box" id="url-output"></div>`);
  },
  init() {
    document.getElementById('url-enc').addEventListener('click', () => {
      setOut('url-output', encodeURIComponent(document.getElementById('url-input').value), true);
    });
    document.getElementById('url-dec').addEventListener('click', () => {
      try { setOut('url-output', decodeURIComponent(document.getElementById('url-input').value), true); }
      catch (e) { setOut('url-output', 'Error: Invalid encoded URL.', false); }
    });
    document.getElementById('url-copy').addEventListener('click', () => copyOutput('url-output'));
  }
});

addTool({
  id: 'lorem',
  name: 'Lorem Ipsum Generator',
  category: 'Generate',
  keywords: ['lorem', 'placeholder', 'dummy text', 'pangram'],
  description: 'Generate placeholder text for mockups and design work.',
  tips: ['Classic lorem, pangrams, or Cicero-style filler.', 'Cap at 20 paragraphs to keep the page snappy.'],
  render() {
    return card(this.name, this.description, `
      <div class="field-row">
        <div class="field"><label>Paragraphs</label><input type="number" id="lorem-count" value="2" min="1" max="20"></div>
        <div class="field"><label>Style</label>
          <select id="lorem-type">
            <option value="lorem">Classic Lorem</option>
            <option value="pangram">Pangrams</option>
            <option value="cicero">Cicero</option>
          </select>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn primary" id="lorem-gen">Generate</button>
        <button class="btn" id="lorem-copy">Copy</button>
      </div>
      <div class="output-box" id="lorem-output" style="min-height:120px;color:var(--text);font-family:var(--font-sans);font-size:14px;line-height:1.7"></div>`);
  },
  init() {
    const LOREM_SENTENCES = [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
      'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      'Curabitur pretium tincidunt lacus. Nulla gravida orci a odio.',
      'Nullam varius, turpis molestie dictum semper, enim turpis pulvinar lectus, nec dignissim est felis commodo lorem.',
      'Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.',
      'Fusce eu leo nisi. Cras eget ipsum eu lectus faucibus bibendum.',
      'Nam non justo in nunc ornare hendrerit. Proin commodo, leo vel hendrerit ornare, justo purus eleifend eros.'
    ];
    const PANGRAMS = [
      'The quick brown fox jumps over the lazy dog.',
      'Pack my box with five dozen liquor jugs.',
      'How vexingly quick daft zebras jump!',
      'The five boxing wizards jump quickly.',
      'Sphinx of black quartz, judge my vow.',
      'Bright vixens jump; dozy fowl quack.',
      'Waltz, bad nymph, for quick jigs vex.',
      'Glib jocks quiz nymph to vex dwarf.'
    ];
    function generateLorem() {
      const n = Math.max(1, Math.min(20, +document.getElementById('lorem-count').value || 2));
      const type = document.getElementById('lorem-type').value;
      const paras = [];
      for (let p = 0; p < n; p++) {
        if (type === 'pangram') {
          const s = []; for (let i = 0; i < 4; i++) s.push(PANGRAMS[(p * 4 + i) % PANGRAMS.length]);
          paras.push(s.join(' '));
        } else {
          const s = [];
          const offset = type === 'cicero' ? 2 : 0;
          for (let i = 0; i < 5; i++) s.push(LOREM_SENTENCES[(p * 5 + i + offset) % LOREM_SENTENCES.length]);
          paras.push(s.join(' '));
        }
      }
      document.getElementById('lorem-output').textContent = paras.join('\n\n');
    }
    document.getElementById('lorem-gen').addEventListener('click', generateLorem);
    document.getElementById('lorem-copy').addEventListener('click', () => copyOutput('lorem-output'));
    generateLorem();
  }
});

addTool({
  id: 'color-tool',
  name: 'Color Converter',
  category: 'Convert',
  keywords: ['hex', 'rgb', 'hsl', 'color picker'],
  description: 'Convert colors between HEX, RGB, and HSL formats.',
  tips: ['Pick a color or type a 6-digit hex.', 'Copy HEX from the field or read RGB/HSL in the pills.'],
  render() {
    return card(this.name, this.description, `
      <div class="color-preview" id="color-preview"></div>
      <div class="field-row">
        <input type="color" id="color-picker" value="#5b8cff">
        <input type="text" id="color-hex" value="#5b8cff" style="width:110px" placeholder="#hex">
        <button class="btn" id="color-copy">Copy HEX</button>
      </div>
      <div class="stats-row">
        <div class="stat-pill">HEX: <span id="out-hex">#5b8cff</span></div>
        <div class="stat-pill">RGB: <span id="out-rgb">rgb(91, 140, 255)</span></div>
        <div class="stat-pill">HSL: <span id="out-hsl">hsl(225, 100%, 68%)</span></div>
      </div>`);
  },
  init() {
    function updateColor(hex) {
      document.getElementById('color-preview').style.background = hex;
      document.getElementById('color-hex').value = hex;
      const { r, g, b } = hexToRgb(hex);
      const { h, s, l } = rgbToHsl(r, g, b);
      document.getElementById('out-hex').textContent = hex;
      document.getElementById('out-rgb').textContent = `rgb(${r}, ${g}, ${b})`;
      document.getElementById('out-hsl').textContent = `hsl(${h}, ${s}%, ${l}%)`;
    }
    document.getElementById('color-picker').addEventListener('input', e => updateColor(e.target.value));
    document.getElementById('color-hex').addEventListener('input', e => {
      const val = e.target.value;
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        document.getElementById('color-picker').value = val;
        updateColor(val);
      }
    });
    document.getElementById('color-copy').addEventListener('click', () => copyText('color-hex'));
    updateColor('#5b8cff');
  }
});

/* ── Text ── */

addTool({
  id: 'find-replace',
  name: 'Find & Replace',
  category: 'Text',
  keywords: ['search', 'replace', 'regex'],
  description: 'Find text (or a regex) and replace all matches in your browser.',
  tips: ['Turn on Regex for capture groups like $1.', 'Replacement is local — nothing is uploaded.'],
  render() {
    return card(this.name, this.description, `
      <textarea id="fr-input" placeholder="Your text…" rows="6"></textarea>
      <div class="field-row">
        <div class="field"><label>Find</label><input type="text" id="fr-find"></div>
        <div class="field"><label>Replace with</label><input type="text" id="fr-repl"></div>
      </div>
      <div class="check-group"><label><input type="checkbox" id="fr-regex"> Use regex</label></div>
      <div class="btn-row">
        <button class="btn primary" id="fr-go">Replace all</button>
        <button class="btn" id="fr-copy">Copy</button>
      </div>
      <div class="output-box" id="fr-output"></div>`);
  },
  init() {
    document.getElementById('fr-go').addEventListener('click', () => {
      const src = document.getElementById('fr-input').value;
      const find = document.getElementById('fr-find').value;
      const repl = document.getElementById('fr-repl').value;
      try {
        if (document.getElementById('fr-regex').checked) {
          setOut('fr-output', src.replace(new RegExp(find, 'g'), repl), true);
        } else {
          setOut('fr-output', src.split(find).join(repl), true);
        }
      } catch (e) { setOut('fr-output', 'Error: ' + e.message, false); }
    });
    document.getElementById('fr-copy').addEventListener('click', () => copyOutput('fr-output'));
  }
});

addTool({
  id: 'sort-dedupe',
  name: 'Sort & Dedupe Lines',
  category: 'Text',
  keywords: ['sort', 'unique', 'lines', 'list'],
  description: 'Sort lines A–Z or Z–A and optionally drop duplicates.',
  tips: ['Trim empty lines first if your list has blanks.', 'Case-insensitive sort is used by default.'],
  render() {
    return card(this.name, this.description, `
      <textarea id="sd-input" placeholder="one line per item" rows="6"></textarea>
      <div class="check-group">
        <label><input type="checkbox" id="sd-unique" checked> Remove duplicates</label>
        <label><input type="checkbox" id="sd-desc"> Reverse (Z–A)</label>
      </div>
      <div class="btn-row">
        <button class="btn primary" id="sd-go">Sort</button>
        <button class="btn" id="sd-copy">Copy</button>
      </div>
      <div class="output-box" id="sd-output"></div>`);
  },
  init() {
    document.getElementById('sd-go').addEventListener('click', () => {
      let lines = document.getElementById('sd-input').value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      if (document.getElementById('sd-unique').checked) lines = [...new Set(lines)];
      lines.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
      if (document.getElementById('sd-desc').checked) lines.reverse();
      setOut('sd-output', lines.join('\n'), true);
    });
    document.getElementById('sd-copy').addEventListener('click', () => copyOutput('sd-output'));
  }
});

addTool({
  id: 'strip-spaces',
  name: 'Strip Extra Spaces',
  category: 'Text',
  keywords: ['whitespace', 'trim', 'collapse'],
  description: 'Collapse extra spaces, trim lines, or squeeze blank lines.',
  tips: ['Collapse spaces is best for pasted prose.', 'Squeeze blank lines keeps paragraph breaks.'],
  render() {
    return card(this.name, this.description, `
      <textarea id="sp-input" rows="6" placeholder="Messy   spaced    text"></textarea>
      <div class="btn-row">
        <button class="btn primary" id="sp-collapse">Collapse spaces</button>
        <button class="btn" id="sp-trim">Trim lines</button>
        <button class="btn" id="sp-blank">Squeeze blank lines</button>
        <button class="btn" id="sp-copy">Copy</button>
      </div>
      <div class="output-box" id="sp-output"></div>`);
  },
  init() {
    const src = () => document.getElementById('sp-input').value;
    document.getElementById('sp-collapse').addEventListener('click', () => setOut('sp-output', src().replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim(), true));
    document.getElementById('sp-trim').addEventListener('click', () => setOut('sp-output', src().split(/\r?\n/).map(l => l.trim()).join('\n'), true));
    document.getElementById('sp-blank').addEventListener('click', () => setOut('sp-output', src().replace(/\n{3,}/g, '\n\n'), true));
    document.getElementById('sp-copy').addEventListener('click', () => copyOutput('sp-output'));
  }
});

addTool({
  id: 'reverse-text',
  name: 'Reverse Text',
  category: 'Text',
  keywords: ['reverse', 'mirror', 'flip'],
  description: 'Reverse characters, words, or line order.',
  tips: ['Character reverse is Unicode-aware enough for typical Latin text.', 'Line reverse is useful for logs.'],
  render() {
    return card(this.name, this.description, `
      <textarea id="rv-input" rows="5"></textarea>
      <div class="btn-row">
        <button class="btn primary" id="rv-chars">Reverse characters</button>
        <button class="btn" id="rv-words">Reverse words</button>
        <button class="btn" id="rv-lines">Reverse lines</button>
        <button class="btn" id="rv-copy">Copy</button>
      </div>
      <div class="output-box" id="rv-output"></div>`);
  },
  init() {
    const src = () => document.getElementById('rv-input').value;
    document.getElementById('rv-chars').addEventListener('click', () => setOut('rv-output', [...src()].reverse().join(''), true));
    document.getElementById('rv-words').addEventListener('click', () => setOut('rv-output', src().split(/\s+/).reverse().join(' '), true));
    document.getElementById('rv-lines').addEventListener('click', () => setOut('rv-output', src().split(/\r?\n/).reverse().join('\n'), true));
    document.getElementById('rv-copy').addEventListener('click', () => copyOutput('rv-output'));
  }
});

addTool({
  id: 'slugify',
  name: 'Slug Generator',
  category: 'Text',
  keywords: ['slug', 'url', 'permalink', 'kebab'],
  description: 'Turn a title into a URL-safe slug.',
  tips: ['Accents are stripped to ASCII when possible.', 'Default separator is a hyphen.'],
  render() {
    return card(this.name, this.description, `
      <textarea id="sl-input" rows="3" placeholder="Hello World: ToolNest 2026!"></textarea>
      <div class="btn-row">
        <button class="btn primary" id="sl-go">Slugify</button>
        <button class="btn" id="sl-copy">Copy</button>
      </div>
      <div class="output-box" id="sl-output"></div>`);
  },
  init() {
    document.getElementById('sl-go').addEventListener('click', () => {
      const s = document.getElementById('sl-input').value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      setOut('sl-output', s, true);
    });
    document.getElementById('sl-copy').addEventListener('click', () => copyOutput('sl-output'));
  }
});

addTool({
  id: 'extract-emails-urls',
  name: 'Extract Emails & URLs',
  category: 'Text',
  keywords: ['email', 'url', 'extract', 'scrape'],
  description: 'Pull email addresses and http(s) links out of pasted text.',
  tips: ['Duplicates are removed.', 'Works on messy notes and HTML snippets.'],
  render() {
    return card(this.name, this.description, `
      <textarea id="ex-input" rows="6"></textarea>
      <div class="btn-row">
        <button class="btn primary" id="ex-go">Extract</button>
        <button class="btn" id="ex-copy">Copy</button>
      </div>
      <div class="output-box" id="ex-output"></div>`);
  },
  init() {
    document.getElementById('ex-go').addEventListener('click', () => {
      const t = document.getElementById('ex-input').value;
      const emails = [...new Set(t.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])];
      const urls = [...new Set(t.match(/https?:\/\/[^\s<>"']+/gi) || [])];
      setOut('ex-output', `Emails (${emails.length}):\n${emails.join('\n') || '—'}\n\nURLs (${urls.length}):\n${urls.join('\n') || '—'}`, true);
    });
    document.getElementById('ex-copy').addEventListener('click', () => copyOutput('ex-output'));
  }
});

addTool({
  id: 'markdown-html',
  name: 'Markdown → HTML',
  category: 'Text',
  keywords: ['markdown', 'html', 'preview'],
  description: 'Convert simple Markdown (headings, bold, lists, links) to HTML.',
  tips: ['This is a lightweight preview, not a full CommonMark engine.', 'Output is escaped first, then a few Markdown rules are applied.'],
  render() {
    return card(this.name, this.description, `
      <textarea id="md-input" rows="7" placeholder="# Hello **world**"></textarea>
      <div class="btn-row">
        <button class="btn primary" id="md-go">Convert</button>
        <button class="btn" id="md-copy">Copy HTML</button>
      </div>
      <div class="output-box" id="md-output"></div>`);
  },
  init() {
    document.getElementById('md-go').addEventListener('click', () => {
      setOut('md-output', simpleMarkdown(document.getElementById('md-input').value), true);
    });
    document.getElementById('md-copy').addEventListener('click', () => copyOutput('md-output'));
  }
});

addTool({
  id: 'letter-frequency',
  name: 'Letter Frequency',
  category: 'Text',
  keywords: ['frequency', 'letters', 'count', 'alphabet'],
  description: 'Count how often each letter appears in your text.',
  tips: ['Only A–Z letters are counted.', 'Useful for puzzles and quick language checks.'],
  render() {
    return card(this.name, this.description, `
      <textarea id="lf-input" rows="5"></textarea>
      <div class="btn-row">
        <button class="btn primary" id="lf-go">Count</button>
        <button class="btn" id="lf-copy">Copy</button>
      </div>
      <div class="output-box" id="lf-output"></div>`);
  },
  init() {
    document.getElementById('lf-go').addEventListener('click', () => {
      const t = document.getElementById('lf-input').value.toUpperCase().replace(/[^A-Z]/g, '');
      const map = {};
      for (const ch of t) map[ch] = (map[ch] || 0) + 1;
      const rows = Object.keys(map).sort().map(k => `${k}: ${map[k]} (${((map[k] / (t.length || 1)) * 100).toFixed(1)}%)`);
      setOut('lf-output', rows.join('\n') || 'No letters found.', true);
    });
    document.getElementById('lf-copy').addEventListener('click', () => copyOutput('lf-output'));
  }
});

/* ── Developer ── */

addTool({
  id: 'uuid-v4',
  name: 'UUID Generator',
  category: 'Developer',
  keywords: ['uuid', 'guid', 'v4', 'random'],
  description: 'Generate RFC 4122 version 4 UUIDs in your browser.',
  tips: ['Uses crypto.randomUUID when available.', 'Generate several at once for seed data.'],
  render() {
    return card(this.name, this.description, `
      <div class="field"><label>How many</label><input type="number" id="uuid-n" value="1" min="1" max="50" style="max-width:120px"></div>
      <div class="btn-row">
        <button class="btn primary" id="uuid-go">Generate</button>
        <button class="btn" id="uuid-copy">Copy</button>
      </div>
      <div class="output-box" id="uuid-output"></div>`);
  },
  init() {
    function uuid() {
      if (crypto.randomUUID) return crypto.randomUUID();
      const b = crypto.getRandomValues(new Uint8Array(16));
      b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
      const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    }
    document.getElementById('uuid-go').addEventListener('click', () => {
      const n = Math.max(1, Math.min(50, +document.getElementById('uuid-n').value || 1));
      setOut('uuid-output', Array.from({ length: n }, uuid).join('\n'), true);
    });
    document.getElementById('uuid-copy').addEventListener('click', () => copyOutput('uuid-output'));
  }
});

addTool({
  id: 'sha256',
  name: 'SHA-256 Hash',
  category: 'Developer',
  keywords: ['hash', 'sha256', 'checksum', 'digest'],
  description: 'Hash text with SHA-256 using the Web Crypto API.',
  tips: ['One-way hash — you cannot reverse it.', 'Hex output is lowercase.'],
  render() {
    return card(this.name, this.description, `
      <textarea id="sha-input" rows="4"></textarea>
      <div class="btn-row">
        <button class="btn primary" id="sha-go">Hash</button>
        <button class="btn" id="sha-copy">Copy</button>
      </div>
      <div class="output-box" id="sha-output"></div>`);
  },
  init() {
    document.getElementById('sha-go').addEventListener('click', async () => {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(document.getElementById('sha-input').value));
      const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
      setOut('sha-output', hex, true);
    });
    document.getElementById('sha-copy').addEventListener('click', () => copyOutput('sha-output'));
  }
});

addTool({
  id: 'html-encode',
  name: 'HTML Encode / Decode',
  category: 'Developer',
  keywords: ['html', 'entities', 'escape', 'unescape'],
  description: 'Escape or unescape HTML entities (&lt; &amp; &quot;).',
  tips: ['Encode before pasting text into HTML.', 'Decode turns entities back into characters.'],
  render() {
    return card(this.name, this.description, `
      <textarea id="he-input" rows="4"></textarea>
      <div class="btn-row">
        <button class="btn primary" id="he-enc">Encode</button>
        <button class="btn" id="he-dec">Decode</button>
        <button class="btn" id="he-copy">Copy</button>
      </div>
      <div class="output-box" id="he-output"></div>`);
  },
  init() {
    document.getElementById('he-enc').addEventListener('click', () => {
      const d = document.createElement('div');
      d.textContent = document.getElementById('he-input').value;
      setOut('he-output', d.innerHTML, true);
    });
    document.getElementById('he-dec').addEventListener('click', () => {
      const d = document.createElement('textarea');
      d.innerHTML = document.getElementById('he-input').value;
      setOut('he-output', d.value, true);
    });
    document.getElementById('he-copy').addEventListener('click', () => copyOutput('he-output'));
  }
});

addTool({
  id: 'regex-tester',
  name: 'Regex Tester',
  category: 'Developer',
  keywords: ['regex', 'regexp', 'match', 'test'],
  description: 'Test a JavaScript regular expression against sample text.',
  tips: ['Invalid patterns show a parse error.', 'Matches are listed with index.'],
  render() {
    return card(this.name, this.description, `
      <div class="field"><label>Pattern</label><input type="text" id="re-pat" placeholder="\\w+"></div>
      <div class="check-group" style="margin-top:8px">
        <label><input type="checkbox" id="re-i"> i</label>
        <label><input type="checkbox" id="re-m"> m</label>
        <label><input type="checkbox" id="re-s"> s</label>
      </div>
      <textarea id="re-input" rows="5" placeholder="Sample text"></textarea>
      <div class="btn-row">
        <button class="btn primary" id="re-go">Test</button>
        <button class="btn" id="re-copy">Copy</button>
      </div>
      <div class="output-box" id="re-output"></div>`);
  },
  init() {
    document.getElementById('re-go').addEventListener('click', () => {
      try {
        let flags = 'g';
        if (document.getElementById('re-i').checked) flags += 'i';
        if (document.getElementById('re-m').checked) flags += 'm';
        if (document.getElementById('re-s').checked) flags += 's';
        const re = new RegExp(document.getElementById('re-pat').value, flags);
        const text = document.getElementById('re-input').value;
        const hits = [];
        let m;
        while ((m = re.exec(text))) {
          hits.push(`#${hits.length + 1} @${m.index}: ${JSON.stringify(m[0])}`);
          if (!m[0].length) re.lastIndex++;
        }
        setOut('re-output', hits.length ? hits.join('\n') : 'No matches.', true);
      } catch (e) { setOut('re-output', 'Error: ' + e.message, false); }
    });
    document.getElementById('re-copy').addEventListener('click', () => copyOutput('re-output'));
  }
});

addTool({
  id: 'unix-timestamp',
  name: 'Unix Timestamp Converter',
  category: 'Developer',
  keywords: ['epoch', 'unix', 'timestamp', 'date'],
  description: 'Convert between Unix seconds/milliseconds and local datetime.',
  tips: ['Seconds vs milliseconds are auto-detected by magnitude.', 'Now fills the current time.'],
  render() {
    return card(this.name, this.description, `
      <div class="field-row">
        <div class="field"><label>Unix timestamp</label><input type="text" id="ts-unix"></div>
        <div class="field"><label>Local datetime</label><input type="datetime-local" id="ts-dt"></div>
      </div>
      <div class="btn-row">
        <button class="btn primary" id="ts-to-date">Timestamp → date</button>
        <button class="btn" id="ts-to-unix">Date → timestamp</button>
        <button class="btn" id="ts-now">Now</button>
      </div>
      <div class="output-box" id="ts-output"></div>`);
  },
  init() {
    document.getElementById('ts-to-date').addEventListener('click', () => {
      let n = Number(document.getElementById('ts-unix').value);
      if (!Number.isFinite(n)) { setOut('ts-output', 'Invalid number', false); return; }
      if (n < 1e12) n *= 1000;
      const d = new Date(n);
      setOut('ts-output', d.toString() + '\nISO: ' + d.toISOString(), true);
    });
    document.getElementById('ts-to-unix').addEventListener('click', () => {
      const v = document.getElementById('ts-dt').value;
      if (!v) { setOut('ts-output', 'Pick a datetime', false); return; }
      const ms = new Date(v).getTime();
      setOut('ts-output', `ms: ${ms}\nsec: ${Math.floor(ms / 1000)}`, true);
    });
    document.getElementById('ts-now').addEventListener('click', () => {
      const d = new Date();
      document.getElementById('ts-unix').value = String(Math.floor(d.getTime() / 1000));
      document.getElementById('ts-dt').value = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setOut('ts-output', d.toString() + '\nISO: ' + d.toISOString(), true);
    });
  }
});

addTool({
  id: 'query-string',
  name: 'Query String Parser',
  category: 'Developer',
  keywords: ['query', 'qs', 'search params', 'url'],
  description: 'Parse a URL or query string into keys and values.',
  tips: ['Paste a full URL or just ?a=1&b=2.', 'Repeated keys are listed together.'],
  render() {
    return card(this.name, this.description, `
      <textarea id="qs-input" rows="3" placeholder="https://example.com/path?q=hello&lang=en"></textarea>
      <div class="btn-row">
        <button class="btn primary" id="qs-go">Parse</button>
        <button class="btn" id="qs-copy">Copy</button>
      </div>
      <div class="output-box" id="qs-output"></div>`);
  },
  init() {
    document.getElementById('qs-go').addEventListener('click', () => {
      try {
        let s = document.getElementById('qs-input').value.trim();
        if (!s.includes('?') && !s.startsWith('http')) s = '?' + s.replace(/^\?/, '');
        const u = s.includes('://') ? new URL(s) : new URL('https://x.invalid' + (s.startsWith('?') ? s : '?' + s));
        const lines = [];
        u.searchParams.forEach((v, k) => lines.push(`${k} = ${v}`));
        setOut('qs-output', lines.join('\n') || '(no query params)', true);
      } catch (e) { setOut('qs-output', 'Error: ' + e.message, false); }
    });
    document.getElementById('qs-copy').addEventListener('click', () => copyOutput('qs-output'));
  }
});

addTool({
  id: 'number-base',
  name: 'Number Base Converter',
  category: 'Developer',
  keywords: ['binary', 'hex', 'decimal', 'octal', 'base'],
  description: 'Convert integers between binary, octal, decimal, and hex.',
  tips: ['Hex may be entered with or without 0x.', 'Only integers are supported.'],
  render() {
    return card(this.name, this.description, `
      <div class="field-row">
        <div class="field"><label>Value</label><input type="text" id="nb-val" placeholder="255"></div>
        <div class="field"><label>From</label>
          <select id="nb-from"><option value="10">Decimal</option><option value="2">Binary</option><option value="8">Octal</option><option value="16">Hex</option></select>
        </div>
      </div>
      <div class="btn-row"><button class="btn primary" id="nb-go">Convert</button></div>
      <div class="stats-row">
        <div class="stat-pill">BIN: <span id="nb-bin">—</span></div>
        <div class="stat-pill">OCT: <span id="nb-oct">—</span></div>
        <div class="stat-pill">DEC: <span id="nb-dec">—</span></div>
        <div class="stat-pill">HEX: <span id="nb-hex">—</span></div>
      </div>`);
  },
  init() {
    document.getElementById('nb-go').addEventListener('click', () => {
      let raw = document.getElementById('nb-val').value.trim().replace(/^0x/i, '');
      const from = +document.getElementById('nb-from').value;
      const n = parseInt(raw, from);
      if (!Number.isFinite(n)) { toast('Invalid number'); return; }
      document.getElementById('nb-bin').textContent = n.toString(2);
      document.getElementById('nb-oct').textContent = n.toString(8);
      document.getElementById('nb-dec').textContent = String(n);
      document.getElementById('nb-hex').textContent = n.toString(16).toUpperCase();
    });
  }
});

addTool({
  id: 'jwt-decode',
  name: 'JWT Decode',
  category: 'Developer',
  keywords: ['jwt', 'token', 'decode', 'payload'],
  description: 'Decode a JWT header and payload. Does not verify signatures.',
  tips: ['<strong>Decode only</strong> — never treat a decoded token as trusted.', 'Signature is shown as-is and is not checked.'],
  render() {
    return card(this.name, this.description, `
      <textarea id="jwt-input" rows="4" placeholder="eyJhbGciOi..."></textarea>
      <div class="btn-row">
        <button class="btn primary" id="jwt-go">Decode</button>
        <button class="btn" id="jwt-copy">Copy</button>
      </div>
      <div class="output-box" id="jwt-output"></div>`);
  },
  init() {
    document.getElementById('jwt-go').addEventListener('click', () => {
      try {
        const parts = document.getElementById('jwt-input').value.trim().split('.');
        if (parts.length < 2) throw new Error('Need header.payload[.signature]');
        const header = JSON.parse(b64urlDecode(parts[0]));
        const payload = JSON.parse(b64urlDecode(parts[1]));
        const sig = parts[2] || '(none)';
        setOut('jwt-output', JSON.stringify({ header, payload, signature: sig, verified: false }, null, 2), true);
      } catch (e) { setOut('jwt-output', 'Error: ' + e.message, false); }
    });
    document.getElementById('jwt-copy').addEventListener('click', () => copyOutput('jwt-output'));
  }
});

addTool({
  id: 'xml-pretty',
  name: 'XML Pretty Print',
  category: 'Developer',
  keywords: ['xml', 'pretty', 'format', 'domparser'],
  description: 'Validate and indent XML with the browser DOMParser.',
  tips: ['Parser errors are shown if the XML is malformed.', 'Self-closing tags stay compact.'],
  render() {
    return card(this.name, this.description, `
      <textarea id="xml-input" rows="7" placeholder="<root><item/></root>"></textarea>
      <div class="btn-row">
        <button class="btn primary" id="xml-go">Pretty print</button>
        <button class="btn" id="xml-copy">Copy</button>
      </div>
      <div class="output-box" id="xml-output"></div>`);
  },
  init() {
    document.getElementById('xml-go').addEventListener('click', () => {
      try { setOut('xml-output', prettyXml(document.getElementById('xml-input').value), true); }
      catch (e) { setOut('xml-output', 'Error: ' + e.message, false); }
    });
    document.getElementById('xml-copy').addEventListener('click', () => copyOutput('xml-output'));
  }
});

/* ── Convert ── */

addTool({
  id: 'csv-json',
  name: 'CSV ↔ JSON',
  category: 'Convert',
  keywords: ['csv', 'json', 'table', 'spreadsheet'],
  description: 'Convert CSV (first row as headers) to JSON objects, or JSON arrays back to CSV.',
  tips: ['Quoted commas in CSV are supported.', 'JSON → CSV expects an array of objects.'],
  render() {
    return card(this.name, this.description, `
      <textarea id="cj-input" rows="7" placeholder="name,age&#10;Ada,36"></textarea>
      <div class="btn-row">
        <button class="btn primary" id="cj-tojson">CSV → JSON</button>
        <button class="btn" id="cj-tocsv">JSON → CSV</button>
        <button class="btn" id="cj-copy">Copy</button>
      </div>
      <div class="output-box" id="cj-output"></div>`);
  },
  init() {
    document.getElementById('cj-tojson').addEventListener('click', () => {
      try {
        const rows = parseCSV(document.getElementById('cj-input').value);
        if (!rows.length) throw new Error('Empty CSV');
        const [h, ...rest] = rows;
        const objs = rest.map(r => Object.fromEntries(h.map((k, i) => [k, r[i] ?? ''])));
        setOut('cj-output', JSON.stringify(objs, null, 2), true);
      } catch (e) { setOut('cj-output', 'Error: ' + e.message, false); }
    });
    document.getElementById('cj-tocsv').addEventListener('click', () => {
      try {
        const data = JSON.parse(document.getElementById('cj-input').value);
        if (!Array.isArray(data) || !data.length) throw new Error('Need a JSON array of objects');
        const keys = [...new Set(data.flatMap(o => Object.keys(o)))];
        const esc = v => {
          const s = String(v ?? '');
          return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        };
        const lines = [keys.join(','), ...data.map(o => keys.map(k => esc(o[k])).join(','))];
        setOut('cj-output', lines.join('\n'), true);
      } catch (e) { setOut('cj-output', 'Error: ' + e.message, false); }
    });
    document.getElementById('cj-copy').addEventListener('click', () => copyOutput('cj-output'));
  }
});

addTool({
  id: 'unit-converter',
  name: 'Unit Converter',
  category: 'Convert',
  keywords: ['units', 'length', 'weight', 'temperature', 'metric'],
  description: 'Convert length, weight, and temperature units.',
  tips: ['Length is stored internally as meters, weight as kilograms.', 'Temperature uses C/F/K formulas.'],
  render() {
    return card(this.name, this.description, `
      <div class="field-row">
        <div class="field"><label>Kind</label>
          <select id="un-kind"><option value="length">Length</option><option value="weight">Weight</option><option value="temp">Temperature</option></select>
        </div>
        <div class="field"><label>Value</label><input type="number" id="un-val" value="1"></div>
        <div class="field"><label>From</label><select id="un-from"></select></div>
        <div class="field"><label>To</label><select id="un-to"></select></div>
      </div>
      <div class="btn-row"><button class="btn primary" id="un-go">Convert</button></div>
      <div class="output-box" id="un-output"></div>`);
  },
  init() {
    const MAP = {
      length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 },
      weight: { kg: 1, g: 0.001, lb: 0.45359237, oz: 0.0283495231, t: 1000 }
    };
    function fill() {
      const kind = document.getElementById('un-kind').value;
      const keys = kind === 'temp' ? ['C', 'F', 'K'] : Object.keys(MAP[kind]);
      const opts = keys.map(k => `<option>${k}</option>`).join('');
      document.getElementById('un-from').innerHTML = opts;
      document.getElementById('un-to').innerHTML = opts;
      document.getElementById('un-to').selectedIndex = 1;
    }
    function convTemp(v, from, to) {
      let c = v;
      if (from === 'F') c = (v - 32) * 5 / 9;
      if (from === 'K') c = v - 273.15;
      if (to === 'C') return c;
      if (to === 'F') return c * 9 / 5 + 32;
      return c + 273.15;
    }
    fill();
    document.getElementById('un-kind').addEventListener('change', fill);
    document.getElementById('un-go').addEventListener('click', () => {
      const v = +document.getElementById('un-val').value;
      const kind = document.getElementById('un-kind').value;
      const from = document.getElementById('un-from').value;
      const to = document.getElementById('un-to').value;
      let out;
      if (kind === 'temp') out = convTemp(v, from, to);
      else out = v * MAP[kind][from] / MAP[kind][to];
      setOut('un-output', `${v} ${from} = ${Number(out.toPrecision(8))} ${to}`, true);
    });
  }
});

addTool({
  id: 'px-rem',
  name: 'px ↔ rem',
  category: 'Convert',
  keywords: ['css', 'px', 'rem', 'root font'],
  description: 'Convert CSS pixels to rem using a root font size.',
  tips: ['Default root size is 16px.', 'Useful when moving a design to rem units.'],
  render() {
    return card(this.name, this.description, `
      <div class="field-row">
        <div class="field"><label>Root font (px)</label><input type="number" id="pr-root" value="16"></div>
        <div class="field"><label>px</label><input type="number" id="pr-px" value="16"></div>
        <div class="field"><label>rem</label><input type="number" id="pr-rem" value="1" step="0.01"></div>
      </div>
      <div class="btn-row">
        <button class="btn primary" id="pr-topx">rem → px</button>
        <button class="btn" id="pr-torem">px → rem</button>
      </div>
      <div class="output-box" id="pr-output"></div>`);
  },
  init() {
    document.getElementById('pr-torem').addEventListener('click', () => {
      const root = +document.getElementById('pr-root').value || 16;
      const px = +document.getElementById('pr-px').value;
      const rem = px / root;
      document.getElementById('pr-rem').value = rem;
      setOut('pr-output', `${px}px = ${rem}rem (root ${root}px)`, true);
    });
    document.getElementById('pr-topx').addEventListener('click', () => {
      const root = +document.getElementById('pr-root').value || 16;
      const rem = +document.getElementById('pr-rem').value;
      const px = rem * root;
      document.getElementById('pr-px').value = px;
      setOut('pr-output', `${rem}rem = ${px}px (root ${root}px)`, true);
    });
  }
});

addTool({
  id: 'timezone-offset',
  name: 'Timezone Offset Helper',
  category: 'Convert',
  keywords: ['timezone', 'utc', 'offset', 'iso'],
  description: 'Show your local UTC offset and convert an ISO date to local time.',
  tips: ['Offset comes from Date.getTimezoneOffset().', 'Paste any ISO-8601 string the browser can parse.'],
  render() {
    return card(this.name, this.description, `
      <div class="field"><label>ISO datetime</label><input type="text" id="tz-iso" placeholder="2026-09-19T10:00:00Z"></div>
      <div class="btn-row">
        <button class="btn primary" id="tz-go">Convert</button>
        <button class="btn" id="tz-now">Use now</button>
      </div>
      <div class="output-box" id="tz-output"></div>`);
  },
  init() {
    function show(d) {
      const off = -d.getTimezoneOffset();
      const sign = off >= 0 ? '+' : '-';
      const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0');
      const mm = String(Math.abs(off) % 60).padStart(2, '0');
      setOut('tz-output', `Local: ${d.toString()}\nISO: ${d.toISOString()}\nOffset: UTC${sign}${hh}:${mm}`, true);
    }
    document.getElementById('tz-go').addEventListener('click', () => {
      const d = new Date(document.getElementById('tz-iso').value);
      if (isNaN(d)) { setOut('tz-output', 'Could not parse that date.', false); return; }
      show(d);
    });
    document.getElementById('tz-now').addEventListener('click', () => {
      const d = new Date();
      document.getElementById('tz-iso').value = d.toISOString();
      show(d);
    });
    document.getElementById('tz-now').click();
  }
});

/* ── Generate ── */

addTool({
  id: 'random-number',
  name: 'Random Number',
  category: 'Generate',
  keywords: ['random', 'integer', 'range'],
  description: 'Generate random integers in a range.',
  tips: ['Inclusive min and max.', 'Uses Math.random locally.'],
  render() {
    return card(this.name, this.description, `
      <div class="field-row">
        <div class="field"><label>Min</label><input type="number" id="rn-min" value="1"></div>
        <div class="field"><label>Max</label><input type="number" id="rn-max" value="100"></div>
        <div class="field"><label>Count</label><input type="number" id="rn-n" value="1" min="1" max="100"></div>
      </div>
      <div class="btn-row">
        <button class="btn primary" id="rn-go">Generate</button>
        <button class="btn" id="rn-copy">Copy</button>
      </div>
      <div class="output-box" id="rn-output"></div>`);
  },
  init() {
    document.getElementById('rn-go').addEventListener('click', () => {
      const min = Math.ceil(+document.getElementById('rn-min').value);
      const max = Math.floor(+document.getElementById('rn-max').value);
      const n = Math.max(1, Math.min(100, +document.getElementById('rn-n').value || 1));
      if (max < min) { setOut('rn-output', 'Max must be ≥ min', false); return; }
      const nums = Array.from({ length: n }, () => Math.floor(Math.random() * (max - min + 1)) + min);
      setOut('rn-output', nums.join('\n'), true);
    });
    document.getElementById('rn-copy').addEventListener('click', () => copyOutput('rn-output'));
  }
});

addTool({
  id: 'dummy-identity',
  name: 'Dummy Name & Email',
  category: 'Generate',
  keywords: ['fake', 'name', 'email', 'placeholder'],
  description: 'Generate placeholder people for mockups (not real identities).',
  tips: ['Not for fraud — mock data only.', 'Emails use example.com.'],
  render() {
    return card(this.name, this.description, `
      <div class="field"><label>How many</label><input type="number" id="dn-n" value="5" min="1" max="30" style="max-width:120px"></div>
      <div class="btn-row">
        <button class="btn primary" id="dn-go">Generate</button>
        <button class="btn" id="dn-copy">Copy</button>
      </div>
      <div class="output-box" id="dn-output"></div>`);
  },
  init() {
    const first = ['Ada', 'Lin', 'Maya', 'Omar', 'Priya', 'Noah', 'Elena', 'Kai', 'Sofia', 'Ravi'];
    const last = ['Chen', 'Patel', 'Nguyen', 'Garcia', 'Kim', 'Silva', 'Khan', 'Rossi', 'Wright', 'Nair'];
    document.getElementById('dn-go').addEventListener('click', () => {
      const n = Math.max(1, Math.min(30, +document.getElementById('dn-n').value || 5));
      const rows = [];
      for (let i = 0; i < n; i++) {
        const f = first[Math.floor(Math.random() * first.length)];
        const l = last[Math.floor(Math.random() * last.length)];
        const email = `${f}.${l}${Math.floor(Math.random() * 90 + 10)}@example.com`.toLowerCase();
        rows.push(`${f} ${l} <${email}>`);
      }
      setOut('dn-output', rows.join('\n'), true);
    });
    document.getElementById('dn-copy').addEventListener('click', () => copyOutput('dn-output'));
  }
});

addTool({
  id: 'css-box-shadow',
  name: 'CSS Box Shadow',
  category: 'Generate',
  keywords: ['css', 'shadow', 'box-shadow'],
  description: 'Tune a box-shadow and copy the CSS.',
  tips: ['Live preview updates as you drag.', 'Inset is optional.'],
  render() {
    return card(this.name, this.description, `
      <div class="field"><label>X <span id="bs-x-l">8</span></label><input type="range" id="bs-x" min="-40" max="40" value="8"></div>
      <div class="field"><label>Y <span id="bs-y-l">12</span></label><input type="range" id="bs-y" min="-40" max="40" value="12"></div>
      <div class="field"><label>Blur <span id="bs-b-l">24</span></label><input type="range" id="bs-b" min="0" max="80" value="24"></div>
      <div class="field"><label>Spread <span id="bs-s-l">0</span></label><input type="range" id="bs-s" min="-20" max="40" value="0"></div>
      <div class="field-row">
        <div class="field"><label>Color</label><input type="color" id="bs-c" value="#000000"></div>
        <label class="field-label" style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="bs-in"> Inset</label>
      </div>
      <div class="preview-box" id="bs-prev" style="background:var(--surface2);height:120px;display:flex;align-items:center;justify-content:center">
        <div id="bs-box" style="width:120px;height:64px;background:var(--accent2);border-radius:8px"></div>
      </div>
      <div class="output-box" id="bs-output"></div>
      <div class="btn-row"><button class="btn" id="bs-copy">Copy CSS</button></div>`);
  },
  init() {
    function upd() {
      const x = document.getElementById('bs-x').value, y = document.getElementById('bs-y').value;
      const b = document.getElementById('bs-b').value, s = document.getElementById('bs-s').value;
      document.getElementById('bs-x-l').textContent = x;
      document.getElementById('bs-y-l').textContent = y;
      document.getElementById('bs-b-l').textContent = b;
      document.getElementById('bs-s-l').textContent = s;
      const inset = document.getElementById('bs-in').checked ? 'inset ' : '';
      const css = `${inset}${x}px ${y}px ${b}px ${s}px ${document.getElementById('bs-c').value}80`;
      document.getElementById('bs-box').style.boxShadow = css;
      document.getElementById('bs-output').textContent = `box-shadow: ${css};`;
    }
    ['bs-x', 'bs-y', 'bs-b', 'bs-s', 'bs-c', 'bs-in'].forEach(id => document.getElementById(id).addEventListener('input', upd));
    document.getElementById('bs-copy').addEventListener('click', () => copyOutput('bs-output'));
    upd();
  }
});

addTool({
  id: 'css-gradient',
  name: 'CSS Gradient',
  category: 'Generate',
  keywords: ['css', 'gradient', 'linear'],
  description: 'Build a linear gradient and copy the CSS.',
  tips: ['Angle is in degrees.', 'Preview fills the box behind the output.'],
  render() {
    return card(this.name, this.description, `
      <div class="field-row">
        <div class="field"><label>Angle <span id="gr-a-l">135</span></label><input type="range" id="gr-a" min="0" max="360" value="135"></div>
        <div class="field"><label>From</label><input type="color" id="gr-c1" value="#7cffc4"></div>
        <div class="field"><label>To</label><input type="color" id="gr-c2" value="#5b8cff"></div>
      </div>
      <div class="preview-box" id="gr-prev" style="height:120px"></div>
      <div class="output-box" id="gr-output"></div>
      <div class="btn-row"><button class="btn" id="gr-copy">Copy CSS</button></div>`);
  },
  init() {
    function upd() {
      const a = document.getElementById('gr-a').value;
      document.getElementById('gr-a-l').textContent = a;
      const css = `linear-gradient(${a}deg, ${document.getElementById('gr-c1').value}, ${document.getElementById('gr-c2').value})`;
      document.getElementById('gr-prev').style.background = css;
      document.getElementById('gr-output').textContent = `background: ${css};`;
    }
    ['gr-a', 'gr-c1', 'gr-c2'].forEach(id => document.getElementById(id).addEventListener('input', upd));
    document.getElementById('gr-copy').addEventListener('click', () => copyOutput('gr-output'));
    upd();
  }
});

addTool({
  id: 'color-palette',
  name: 'Color Palette from Hex',
  category: 'Generate',
  keywords: ['palette', 'tints', 'shades', 'hex'],
  description: 'Generate tints and shades from a base hex color.',
  tips: ['Click a swatch to copy its hex.', 'Tints mix toward white, shades toward black.'],
  render() {
    return card(this.name, this.description, `
      <div class="field-row">
        <input type="color" id="pal-c" value="#5b8cff">
        <input type="text" id="pal-hex" value="#5b8cff" style="width:110px">
        <button class="btn primary" id="pal-go">Build palette</button>
      </div>
      <div class="swatch-row" id="pal-row"></div>
      <div class="output-box" id="pal-output"></div>`);
  },
  init() {
    function mix(hex, t, toward) {
      const { r, g, b } = hexToRgb(hex);
      const tr = toward === 'w' ? 255 : 0;
      const m = n => Math.round(n + (tr - n) * t);
      return '#' + [m(r), m(g), m(b)].map(x => x.toString(16).padStart(2, '0')).join('');
    }
    function build() {
      let hex = document.getElementById('pal-hex').value;
      if (!/^#[0-9a-fA-F]{6}$/.test(hex)) hex = document.getElementById('pal-c').value;
      const colors = [0.6, 0.3, 0].map(t => mix(hex, t, 'w')).concat([0.25, 0.5].map(t => mix(hex, t, 'b')));
      colors[2] = hex;
      document.getElementById('pal-row').innerHTML = colors.map(c => `<div class="swatch" data-hex="${c}" style="background:${c}" title="${c}"></div>`).join('');
      document.getElementById('pal-output').textContent = colors.join('\n');
      document.getElementById('pal-row').querySelectorAll('.swatch').forEach(el => {
        el.addEventListener('click', () => { navigator.clipboard.writeText(el.dataset.hex).then(() => toast('Copied!')); });
      });
    }
    document.getElementById('pal-c').addEventListener('input', e => { document.getElementById('pal-hex').value = e.target.value; build(); });
    document.getElementById('pal-go').addEventListener('click', build);
    build();
  }
});

/* ── Calculate ── */

addTool({
  id: 'percentage',
  name: 'Percentage Calculator',
  category: 'Calculate',
  keywords: ['percent', '%', 'math'],
  description: 'What is X% of Y, or what percent is A of B.',
  tips: ['Two modes: of-value and is-what-percent.', 'Results round to 4 decimals when needed.'],
  render() {
    return card(this.name, this.description, `
      <div class="field-row">
        <div class="field"><label>X %</label><input type="number" id="pc-x" value="15"></div>
        <div class="field"><label>of Y</label><input type="number" id="pc-y" value="200"></div>
      </div>
      <div class="btn-row"><button class="btn primary" id="pc-of">X% of Y</button></div>
      <div class="field-row">
        <div class="field"><label>A</label><input type="number" id="pc-a" value="40"></div>
        <div class="field"><label>B</label><input type="number" id="pc-b" value="200"></div>
      </div>
      <div class="btn-row"><button class="btn" id="pc-is">A is what % of B</button></div>
      <div class="output-box" id="pc-output"></div>`);
  },
  init() {
    document.getElementById('pc-of').addEventListener('click', () => {
      const x = +document.getElementById('pc-x').value, y = +document.getElementById('pc-y').value;
      setOut('pc-output', `${x}% of ${y} = ${+(x / 100 * y).toFixed(4)}`, true);
    });
    document.getElementById('pc-is').addEventListener('click', () => {
      const a = +document.getElementById('pc-a').value, b = +document.getElementById('pc-b').value;
      if (!b) { setOut('pc-output', 'B cannot be 0', false); return; }
      setOut('pc-output', `${a} is ${+((a / b) * 100).toFixed(4)}% of ${b}`, true);
    });
  }
});

addTool({
  id: 'discount',
  name: 'Discount Calculator',
  category: 'Calculate',
  keywords: ['sale', 'discount', 'price', 'off'],
  description: 'Apply a percent discount to a price.',
  tips: ['Shows saved amount and final price.', 'Tax is not included.'],
  render() {
    return card(this.name, this.description, `
      <div class="field-row">
        <div class="field"><label>Price</label><input type="number" id="dc-p" value="99" step="0.01"></div>
        <div class="field"><label>Discount %</label><input type="number" id="dc-d" value="20"></div>
      </div>
      <div class="btn-row"><button class="btn primary" id="dc-go">Calculate</button></div>
      <div class="output-box" id="dc-output"></div>`);
  },
  init() {
    document.getElementById('dc-go').addEventListener('click', () => {
      const p = +document.getElementById('dc-p').value, d = +document.getElementById('dc-d').value;
      const save = p * d / 100;
      setOut('dc-output', `Save ${save.toFixed(2)}\nPay ${(p - save).toFixed(2)}`, true);
    });
  }
});

addTool({
  id: 'tip',
  name: 'Tip Calculator',
  category: 'Calculate',
  keywords: ['tip', 'bill', 'gratuity', 'split'],
  description: 'Split a bill and add a tip percentage.',
  tips: ['Tip is calculated on the bill before split.', 'People must be at least 1.'],
  render() {
    return card(this.name, this.description, `
      <div class="field-row">
        <div class="field"><label>Bill</label><input type="number" id="tip-b" value="48.50" step="0.01"></div>
        <div class="field"><label>Tip %</label><input type="number" id="tip-p" value="15"></div>
        <div class="field"><label>People</label><input type="number" id="tip-n" value="2" min="1"></div>
      </div>
      <div class="btn-row"><button class="btn primary" id="tip-go">Calculate</button></div>
      <div class="output-box" id="tip-output"></div>`);
  },
  init() {
    document.getElementById('tip-go').addEventListener('click', () => {
      const b = +document.getElementById('tip-b').value, p = +document.getElementById('tip-p').value, n = Math.max(1, +document.getElementById('tip-n').value || 1);
      const tip = b * p / 100, total = b + tip;
      setOut('tip-output', `Tip ${tip.toFixed(2)}\nTotal ${total.toFixed(2)}\nPer person ${(total / n).toFixed(2)}`, true);
    });
  }
});

addTool({
  id: 'bmi',
  name: 'BMI Calculator',
  category: 'Calculate',
  keywords: ['bmi', 'body mass', 'health'],
  description: 'Body mass index from kg + cm or lb + in.',
  tips: ['BMI is a rough screening number, not a diagnosis.', 'Metric uses kg and cm.'],
  render() {
    return card(this.name, this.description, `
      <div class="check-group">
        <label><input type="radio" name="bmi-u" value="metric" checked> Metric</label>
        <label><input type="radio" name="bmi-u" value="us"> US</label>
      </div>
      <div class="field-row">
        <div class="field"><label id="bmi-w-l">Weight (kg)</label><input type="number" id="bmi-w" value="70"></div>
        <div class="field"><label id="bmi-h-l">Height (cm)</label><input type="number" id="bmi-h" value="175"></div>
      </div>
      <div class="btn-row"><button class="btn primary" id="bmi-go">Calculate</button></div>
      <div class="output-box" id="bmi-output"></div>`);
  },
  init() {
    function unit() { return document.querySelector('input[name="bmi-u"]:checked').value; }
    function labels() {
      const u = unit() === 'metric';
      document.getElementById('bmi-w-l').textContent = u ? 'Weight (kg)' : 'Weight (lb)';
      document.getElementById('bmi-h-l').textContent = u ? 'Height (cm)' : 'Height (in)';
    }
    document.querySelectorAll('input[name="bmi-u"]').forEach(r => r.addEventListener('change', labels));
    document.getElementById('bmi-go').addEventListener('click', () => {
      let w = +document.getElementById('bmi-w').value, h = +document.getElementById('bmi-h').value;
      if (unit() === 'us') { w *= 0.45359237; h *= 2.54; }
      const m = h / 100;
      const bmi = w / (m * m);
      let cat = 'Obese';
      if (bmi < 18.5) cat = 'Underweight';
      else if (bmi < 25) cat = 'Normal';
      else if (bmi < 30) cat = 'Overweight';
      setOut('bmi-output', `BMI ${bmi.toFixed(1)} (${cat})`, true);
    });
  }
});

addTool({
  id: 'age',
  name: 'Age Calculator',
  category: 'Calculate',
  keywords: ['age', 'birthday', 'dob'],
  description: 'Age in years, months, and days from a date of birth.',
  tips: ['Uses today’s date in your timezone.', 'Does not count leap-second quirks.'],
  render() {
    return card(this.name, this.description, `
      <div class="field"><label>Date of birth</label><input type="date" id="age-d"></div>
      <div class="btn-row"><button class="btn primary" id="age-go">Calculate</button></div>
      <div class="output-box" id="age-output"></div>`);
  },
  init() {
    document.getElementById('age-go').addEventListener('click', () => {
      const dob = new Date(document.getElementById('age-d').value);
      if (isNaN(dob)) { setOut('age-output', 'Pick a date', false); return; }
      const now = new Date();
      let y = now.getFullYear() - dob.getFullYear();
      let m = now.getMonth() - dob.getMonth();
      let d = now.getDate() - dob.getDate();
      if (d < 0) { m--; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
      if (m < 0) { y--; m += 12; }
      setOut('age-output', `${y} years, ${m} months, ${d} days`, true);
    });
  }
});

addTool({
  id: 'aspect-ratio',
  name: 'Aspect Ratio',
  category: 'Calculate',
  keywords: ['aspect', '16:9', 'resize', 'video'],
  description: 'Find the missing width or height for a ratio like 16:9.',
  tips: ['Leave width or height empty to solve for it.', 'Ratio simplifies in the result.'],
  render() {
    return card(this.name, this.description, `
      <div class="field-row">
        <div class="field"><label>Ratio W</label><input type="number" id="ar-rw" value="16"></div>
        <div class="field"><label>Ratio H</label><input type="number" id="ar-rh" value="9"></div>
        <div class="field"><label>Width</label><input type="number" id="ar-w" value="1920"></div>
        <div class="field"><label>Height</label><input type="number" id="ar-h" placeholder="auto"></div>
      </div>
      <div class="btn-row"><button class="btn primary" id="ar-go">Solve</button></div>
      <div class="output-box" id="ar-output"></div>`);
  },
  init() {
    document.getElementById('ar-go').addEventListener('click', () => {
      const rw = +document.getElementById('ar-rw').value, rh = +document.getElementById('ar-rh').value;
      const wEl = document.getElementById('ar-w'), hEl = document.getElementById('ar-h');
      if (!rw || !rh) { setOut('ar-output', 'Ratio needs both parts', false); return; }
      if (wEl.value && !hEl.value) {
        const h = +wEl.value * rh / rw;
        hEl.value = +h.toFixed(2);
        setOut('ar-output', `Height ${hEl.value} (${rw}:${rh})`, true);
      } else if (hEl.value && !wEl.value) {
        const w = +hEl.value * rw / rh;
        wEl.value = +w.toFixed(2);
        setOut('ar-output', `Width ${wEl.value} (${rw}:${rh})`, true);
      } else if (wEl.value && hEl.value) {
        setOut('ar-output', `Current ${wEl.value}×${hEl.value} vs ${rw}:${rh} → height should be ${+(+wEl.value * rh / rw).toFixed(2)}`, true);
      } else setOut('ar-output', 'Enter width or height', false);
    });
  }
});

addTool({
  id: 'days-between',
  name: 'Days Between Dates',
  category: 'Calculate',
  keywords: ['days', 'date', 'difference', 'duration'],
  description: 'Count whole days between two calendar dates.',
  tips: ['Order does not matter — result is absolute.', 'Times are midnight local.'],
  render() {
    return card(this.name, this.description, `
      <div class="field-row">
        <div class="field"><label>From</label><input type="date" id="db-a"></div>
        <div class="field"><label>To</label><input type="date" id="db-b"></div>
      </div>
      <div class="btn-row"><button class="btn primary" id="db-go">Calculate</button></div>
      <div class="output-box" id="db-output"></div>`);
  },
  init() {
    document.getElementById('db-go').addEventListener('click', () => {
      const a = new Date(document.getElementById('db-a').value);
      const b = new Date(document.getElementById('db-b').value);
      if (isNaN(a) || isNaN(b)) { setOut('db-output', 'Pick both dates', false); return; }
      const days = Math.round(Math.abs(b - a) / 86400000);
      setOut('db-output', `${days} day${days === 1 ? '' : 's'}`, true);
    });
  }
});

/* ── Image ── */

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
    img.src = url;
  });
}

addTool({
  id: 'image-base64',
  name: 'Image → Base64',
  category: 'Image',
  keywords: ['image', 'base64', 'data uri', 'file'],
  description: 'Turn a local image file into a data URI. Nothing is uploaded.',
  tips: ['Stays in this tab via FileReader.', 'Large images make long strings — copy carefully.'],
  render() {
    return card(this.name, this.description, `
      <input type="file" id="ib-file" accept="image/*">
      <img class="preview-img hidden" id="ib-img" alt="preview">
      <div class="btn-row"><button class="btn" id="ib-copy">Copy data URI</button></div>
      <div class="output-box" id="ib-output" style="max-height:160px;overflow:auto"></div>`);
  },
  init() {
    document.getElementById('ib-file').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        document.getElementById('ib-img').src = reader.result;
        document.getElementById('ib-img').classList.remove('hidden');
        setOut('ib-output', reader.result, true);
      };
      reader.readAsDataURL(file);
    });
    document.getElementById('ib-copy').addEventListener('click', () => copyOutput('ib-output'));
  }
});

addTool({
  id: 'image-resize',
  name: 'Resize / Compress Image',
  category: 'Image',
  keywords: ['resize', 'compress', 'jpeg', 'canvas'],
  description: 'Resize a local image on a canvas and download a JPEG. Never sent to a server.',
  tips: ['Max width keeps aspect ratio.', 'Quality 0.1–1.0 for JPEG compression.'],
  render() {
    return card(this.name, this.description, `
      <input type="file" id="ir-file" accept="image/*">
      <div class="field-row" style="margin-top:12px">
        <div class="field"><label>Max width (px)</label><input type="number" id="ir-w" value="800"></div>
        <div class="field"><label>JPEG quality</label><input type="number" id="ir-q" value="0.8" min="0.1" max="1" step="0.05"></div>
      </div>
      <div class="btn-row">
        <button class="btn primary" id="ir-go">Process</button>
        <a class="btn hidden" id="ir-dl" download="resized.jpg">Download JPEG</a>
      </div>
      <img class="preview-img hidden" id="ir-img" alt="result">
      <div class="output-box" id="ir-output"></div>`);
  },
  init() {
    let file = null;
    document.getElementById('ir-file').addEventListener('change', e => { file = e.target.files[0] || null; });
    document.getElementById('ir-go').addEventListener('click', async () => {
      if (!file) { setOut('ir-output', 'Choose an image first.', false); return; }
      try {
        const img = await loadImageFile(file);
        const maxW = +document.getElementById('ir-w').value || 800;
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const q = Math.min(1, Math.max(0.1, +document.getElementById('ir-q').value || 0.8));
        const url = canvas.toDataURL('image/jpeg', q);
        const out = document.getElementById('ir-img');
        out.src = url; out.classList.remove('hidden');
        const dl = document.getElementById('ir-dl');
        dl.href = url; dl.classList.remove('hidden');
        setOut('ir-output', `${w}×${h} JPEG @ ${q}`, true);
      } catch (e) { setOut('ir-output', e.message, false); }
    });
  }
});

addTool({
  id: 'image-color',
  name: 'Image Color Picker',
  category: 'Image',
  keywords: ['eyedropper', 'average color', 'canvas', 'palette'],
  description: 'Sample the average color of a local image (quantized). File never leaves the tab.',
  tips: ['Averages pixels on a small canvas for speed.', 'Click the swatch to copy hex.'],
  render() {
    return card(this.name, this.description, `
      <input type="file" id="ic-file" accept="image/*">
      <div class="color-preview" id="ic-prev" style="margin-top:12px;background:var(--surface2)"></div>
      <div class="output-box" id="ic-output"></div>`);
  },
  init() {
    document.getElementById('ic-file').addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const img = await loadImageFile(file);
        const canvas = document.createElement('canvas');
        const size = 48;
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
        }
        r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
        const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
        document.getElementById('ic-prev').style.background = hex;
        setOut('ic-output', `${hex}\nrgb(${r}, ${g}, ${b})`, true);
        document.getElementById('ic-prev').onclick = () => navigator.clipboard.writeText(hex).then(() => toast('Copied!'));
      } catch (err) { setOut('ic-output', err.message, false); }
    });
  }
});
