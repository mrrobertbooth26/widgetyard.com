"use strict";

const WidgetTools = (() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const setStatus = (message, isError = false) => {
    const el = $("#status"); if (!el) return;
    el.textContent = message; el.hidden = !message; el.classList.toggle("error", isError);
  };
  const secureInt = (min, max) => {
    const range = max - min + 1;
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || range <= 0 || range > 4294967296) throw new Error("Choose a smaller whole-number range.");
    const ceiling = Math.floor(4294967296 / range) * range;
    const values = new Uint32Array(1); let value;
    do { crypto.getRandomValues(values); value = values[0]; } while (value >= ceiling);
    return min + (value % range);
  };
  const copyText = async (text, label = "Result") => {
    try { await navigator.clipboard.writeText(text); setStatus(`${label} copied.`); }
    catch { setStatus("Copy was blocked. Select the result and copy it manually.", true); }
  };
  const bindCopy = () => $$("[data-copy]").forEach((button) => button.addEventListener("click", () => { const target = $(button.dataset.copy); if (target) copyText(target.value ?? target.textContent, button.dataset.label || "Result"); }));

  const password = () => {
    const output = $("#password-output"), length = $("#password-length"), lengthNumber = $("#password-length-number");
    const sync = (source, target) => { target.value = source.value; };
    length.addEventListener("input", () => sync(length, lengthNumber)); lengthNumber.addEventListener("input", () => sync(lengthNumber, length));
    const generate = () => {
      const sets = { lower:"abcdefghijklmnopqrstuvwxyz", upper:"ABCDEFGHIJKLMNOPQRSTUVWXYZ", numbers:"0123456789", symbols:"!@#$%^&*()-_=+[]{};:,.?" };
      const enabled = $$("[data-charset]:checked").map((input) => sets[input.dataset.charset]);
      const size = Number(length.value);
      if (!enabled.length) return setStatus("Select at least one character type.", true);
      if (!Number.isInteger(size) || size < 6 || size > 128) return setStatus("Length must be between 6 and 128.", true);
      const chars = enabled.join("");
      const result = enabled.map((set) => set[secureInt(0, set.length - 1)]);
      while (result.length < size) result.push(chars[secureInt(0, chars.length - 1)]);
      for (let i = result.length - 1; i > 0; i--) { const j = secureInt(0, i); [result[i], result[j]] = [result[j], result[i]]; }
      output.textContent = result.join(""); setStatus("Fresh password generated.");
    };
    $("#generate-password").addEventListener("click", generate); $("#copy-password").addEventListener("click", () => copyText(output.textContent, "Password")); generate();
  };

  const words = () => {
    const bank = ["acorn","amber","anchor","apple","arch","arrow","atlas","badger","bamboo","beacon","birch","bloom","blue","brass","breeze","brick","brook","cabin","cactus","canvas","cedar","charm","chisel","cinder","clover","cloud","cobalt","comet","coral","crane","creek","crisp","crown","dawn","delta","drift","dune","echo","ember","falcon","fern","field","finch","fjord","flame","flora","forge","frost","garden","glade","glass","glow","granite","grove","harbor","hazel","heron","hill","honey","indigo","iris","island","ivory","jade","juniper","kite","lagoon","lake","lantern","lark","laurel","leaf","linen","lotus","lunar","maple","marble","meadow","mint","mist","moon","moss","nectar","north","nova","oasis","ocean","olive","onyx","opal","orbit","orchard","otter","paper","peach","pearl","pepper","pine","plum","pond","prairie","quartz","rain","raven","reef","ridge","river","robin","rose","sage","sand","shadow","shore","silver","sky","slate","snow","solar","sparrow","spring","spruce","star","stone","storm","sun","swift","tide","timber","trail","tulip","valley","velvet","violet","wave","willow","wind","winter","wren","yard","zephyr"];
    const output = $("#word-output");
    const generate = () => {
      const count = Number($("#word-count").value), unique = $("#unique-words").checked;
      if (!Number.isInteger(count) || count < 1 || count > 100) return setStatus("Choose between 1 and 100 words.", true);
      if (unique && count > bank.length) return setStatus(`Unique mode supports up to ${bank.length} words.`, true);
      const pool = [...bank], result = [];
      for (let i = 0; i < count; i++) { const index = secureInt(0, pool.length - 1); result.push(unique ? pool.splice(index, 1)[0] : pool[index]); }
      output.replaceChildren(...result.map((word) => Object.assign(document.createElement("span"), { className:"word-pill", textContent:word })));
      setStatus(`${count} random word${count === 1 ? "" : "s"} generated.`);
    };
    $("#generate-words").addEventListener("click", generate); $("#copy-words").addEventListener("click", () => copyText($$(".word-pill", output).map((el) => el.textContent).join(" "), "Words")); generate();
  };

  const wordCounter = () => {
    const input = $("#counter-input");
    const update = () => {
      const text = input.value, trimmed = text.trim();
      const wordCount = trimmed ? trimmed.match(/[\p{L}\p{N}]+(?:['’_-][\p{L}\p{N}]+)*/gu)?.length || 0 : 0;
      const sentences = trimmed ? (trimmed.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || []).length : 0;
      const paragraphs = trimmed ? trimmed.split(/\n\s*\n/).filter((part) => part.trim()).length : 0;
      $("#stat-words").textContent = wordCount; $("#stat-chars").textContent = text.length; $("#stat-sentences").textContent = sentences; $("#stat-paragraphs").textContent = paragraphs;
      $("#reading-time").textContent = wordCount ? `${Math.max(1, Math.ceil(wordCount / 225))} min read` : "0 min read";
    };
    input.addEventListener("input", update); $("#clear-counter").addEventListener("click", () => { input.value = ""; input.focus(); update(); }); update();
  };

  const parseIPv4 = (value) => {
    const parts = value.trim().split(".");
    if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p) || Number(p) > 255)) throw new Error("Enter a valid IPv4 address, such as 192.168.1.10.");
    return parts.reduce((n, part) => ((n << 8) | Number(part)) >>> 0, 0);
  };
  const intToIPv4 = (value) => [24,16,8,0].map((shift) => (value >>> shift) & 255).join(".");
  const subnet = () => {
    $("#calculate-subnet").addEventListener("click", () => {
      try {
        const ip = parseIPv4($("#ip-address").value), prefix = Number($("#cidr-prefix").value);
        if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new Error("CIDR prefix must be between 0 and 32.");
        const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
        const network = (ip & mask) >>> 0, broadcast = (network | (~mask >>> 0)) >>> 0;
        const total = 2 ** (32 - prefix), usable = prefix === 32 ? 1 : prefix === 31 ? 2 : Math.max(0, total - 2);
        const first = prefix >= 31 ? network : (network + 1) >>> 0, last = prefix >= 31 ? broadcast : (broadcast - 1) >>> 0;
        const values = { network:`${intToIPv4(network)}/${prefix}`, mask:intToIPv4(mask), wildcard:intToIPv4((~mask) >>> 0), broadcast:intToIPv4(broadcast), range:`${intToIPv4(first)} – ${intToIPv4(last)}`, hosts:usable.toLocaleString() };
        Object.entries(values).forEach(([key,value]) => { $(`#subnet-${key}`).textContent = value; }); $("#subnet-result").hidden = false; setStatus("Subnet calculated.");
      } catch (error) { $("#subnet-result").hidden = true; setStatus(error.message, true); }
    });
  };

  const json = () => {
    const input = $("#json-input"), output = $("#json-output");
    const transform = (compact) => { try { const parsed = JSON.parse(input.value); output.value = compact ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2); setStatus(compact ? "Valid JSON minified." : "Valid JSON formatted."); } catch (error) { output.value = ""; setStatus(`Invalid JSON: ${error.message}`, true); } };
    $("#format-json").addEventListener("click", () => transform(false)); $("#minify-json").addEventListener("click", () => transform(true));
    $("#clear-json").addEventListener("click", () => { input.value = ""; output.value = ""; setStatus(""); input.focus(); }); bindCopy();
  };

  const timestamp = () => {
    const stamp = $("#timestamp-input"), date = $("#date-input"), output = $("#timestamp-result");
    const show = (d) => {
      if (Number.isNaN(d.getTime())) return setStatus("Enter a valid date or timestamp.", true);
      $("#ts-local").textContent = d.toLocaleString(); $("#ts-utc").textContent = d.toUTCString(); $("#ts-iso").textContent = d.toISOString(); $("#ts-seconds").textContent = Math.floor(d.getTime()/1000); $("#ts-millis").textContent = d.getTime(); output.hidden = false; setStatus("Time converted.");
    };
    $("#convert-timestamp").addEventListener("click", () => { const raw = stamp.value.trim(); if (!/^-?\d+$/.test(raw)) return setStatus("Enter a whole Unix timestamp.", true); let value = Number(raw); if (Math.abs(value) < 1e12) value *= 1000; show(new Date(value)); });
    $("#convert-date").addEventListener("click", () => show(new Date(date.value)));
    $("#use-now").addEventListener("click", () => { const now = new Date(); stamp.value = Math.floor(now.getTime()/1000); date.value = new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16); show(now); });
    $("#use-now").click();
  };

  const base64 = () => {
    const input = $("#base64-input"), output = $("#base64-output");
    const encode = (value) => btoa(String.fromCharCode(...new TextEncoder().encode(value)));
    const decode = (value) => new TextDecoder("utf-8", {fatal:true}).decode(Uint8Array.from(atob(value.replace(/\s/g,"")), (c) => c.charCodeAt(0)));
    $("#encode-base64").addEventListener("click", () => { try { output.value = encode(input.value); setStatus("Text encoded as Base64."); } catch { setStatus("That text could not be encoded.", true); } });
    $("#decode-base64").addEventListener("click", () => { try { output.value = decode(input.value); setStatus("Base64 decoded as UTF-8 text."); } catch { output.value = ""; setStatus("Enter valid Base64 containing UTF-8 text.", true); } });
    $("#swap-base64").addEventListener("click", () => { input.value = output.value; output.value = ""; setStatus(""); }); bindCopy();
  };

  const urlCoder = () => {
    const input = $("#url-input"), output = $("#url-output");
    $("#encode-url").addEventListener("click", () => { output.value = encodeURIComponent(input.value); setStatus("Text URL-encoded."); });
    $("#decode-url").addEventListener("click", () => { try { output.value = decodeURIComponent(input.value); setStatus("URL text decoded."); } catch { output.value = ""; setStatus("The input contains an invalid percent-encoding.", true); } });
    $("#swap-url").addEventListener("click", () => { input.value = output.value; output.value = ""; setStatus(""); }); bindCopy();
  };

  const randomNumber = () => {
    const output = $("#number-output");
    const generate = () => { try {
      const min = Number($("#number-min").value), max = Number($("#number-max").value), count = Number($("#number-count").value), unique = $("#unique-numbers").checked;
      if (![min,max,count].every(Number.isInteger)) throw new Error("Use whole numbers in every field.");
      if (min > max) throw new Error("Minimum cannot be greater than maximum."); if (count < 1 || count > 100) throw new Error("Generate between 1 and 100 numbers.");
      if (unique && count > max-min+1) throw new Error("The range is too small for that many unique numbers.");
      const values = [], used = new Set(); while (values.length < count) { const n = secureInt(min,max); if (!unique || !used.has(n)) { used.add(n); values.push(n); } }
      output.replaceChildren(...values.map((n) => Object.assign(document.createElement("span"), {className:"number-chip",textContent:n}))); setStatus(`${count} number${count===1?"":"s"} generated.`);
    } catch(error) { output.replaceChildren(); setStatus(error.message,true); } };
    $("#generate-numbers").addEventListener("click", generate); $("#copy-numbers").addEventListener("click", () => copyText($$(".number-chip",output).map((el)=>el.textContent).join(", "),"Numbers")); generate();
  };

  const ip = async () => {
    const output = $("#ip-value"), version = $("#ip-version"), button = $("#refresh-ip");
    const load = async () => { button.disabled = true; output.textContent = "Checking…"; setStatus(""); try { const response = await fetch("https://api64.ipify.org?format=json", {cache:"no-store"}); if (!response.ok) throw new Error(); const data = await response.json(); output.textContent = data.ip; version.textContent = data.ip.includes(":") ? "IPv6" : "IPv4"; setStatus("Public IP address found."); } catch { output.textContent = "Unavailable"; version.textContent = "—"; setStatus("We couldn’t reach the IP lookup service. Check your connection and try again.",true); } finally { button.disabled = false; } };
    button.addEventListener("click",load); $("#copy-ip").addEventListener("click",()=>copyText(output.textContent,"IP address")); load();
  };

  const init = () => { const name = document.body.dataset.tool; const tools = { password, words, counter:wordCounter, subnet, json, timestamp, base64, url:urlCoder, numbers:randomNumber, ip }; if (tools[name]) tools[name](); };
  return { init, secureInt, parseIPv4, intToIPv4 };
})();
document.addEventListener("DOMContentLoaded", WidgetTools.init);
