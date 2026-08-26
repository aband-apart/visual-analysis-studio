"use strict";

const AIC_API = "https://api.artic.edu/api/v1/artworks?is_public_domain=true&has_multimedia_resources=false&limit=100&fields=id,title,artist_display,date_display,medium_display,image_id,thumbnail";
const MET_SEARCH_API = "https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&isPublicDomain=true&q=painting";
const MET_OBJECT_API = "https://collectionapi.metmuseum.org/public/collection/v1/objects/";

const els = {
  image: document.querySelector("#artwork-image"),
  loading: document.querySelector("#loading-state"),
  error: document.querySelector("#error-state"),
  title: document.querySelector("#artwork-heading"),
  artist: document.querySelector("#artwork-artist"),
  date: document.querySelector("#artwork-date"),
  medium: document.querySelector("#artwork-medium"),
  source: document.querySelector("#artwork-source"),
  newButtons: [document.querySelector("#new-artwork"), document.querySelector("#new-artwork-top")],
  retryButton: document.querySelector("#retry-artwork"),
  copyButton: document.querySelector("#copy-responses"),
  copyStatus: document.querySelector("#copy-status")
};

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function clean(value, fallback = "Unknown") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

async function fetchJSON(url, timeout = 12000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timer);
  }
}

function verifyImage(url, timeout = 12000) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = window.setTimeout(() => {
      image.src = "";
      reject(new Error("Image timed out"));
    }, timeout);
    image.onload = () => {
      window.clearTimeout(timer);
      if (image.naturalWidth < 100 || image.naturalHeight < 100) {
        reject(new Error("Image is too small"));
      } else {
        resolve(url);
      }
    };
    image.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("Image failed to load"));
    };
    image.src = url;
  });
}

async function getAICArtwork() {
  const payload = await fetchJSON(AIC_API);
  const choices = (payload.data || []).filter(item => item.image_id);
  if (!choices.length) throw new Error("AIC returned no usable images");

  const shuffled = [...choices].sort(() => Math.random() - 0.5);
  for (const item of shuffled.slice(0, 8)) {
    const imageUrl = `https://www.artic.edu/iiif/2/${item.image_id}/full/843,/0/default.jpg`;
    try {
      await verifyImage(imageUrl);
      const artist = clean(item.artist_display, "Artist unknown").replace(/\n+/g, ", ");
      return {
        title: clean(item.title, "Untitled"),
        artist,
        date: clean(item.date_display),
        medium: clean(item.medium_display),
        imageUrl,
        source: "Art Institute of Chicago"
      };
    } catch (_) {
      // Try another image from the same response before falling back.
    }
  }
  throw new Error("AIC images failed to load");
}

async function getMetArtwork() {
  const search = await fetchJSON(MET_SEARCH_API, 18000);
  const ids = search.objectIDs || [];
  if (!ids.length) throw new Error("The Met returned no object IDs");

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const id = randomItem(ids);
    try {
      const item = await fetchJSON(`${MET_OBJECT_API}${id}`);
      const imageUrl = item.primaryImage || item.primaryImageSmall;
      if (!imageUrl || item.isPublicDomain === false) continue;
      await verifyImage(imageUrl);
      return {
        title: clean(item.title, "Untitled"),
        artist: clean(item.artistDisplayName, item.culture ? clean(item.culture) : "Artist unknown"),
        date: clean(item.objectDate),
        medium: clean(item.medium),
        imageUrl,
        source: "The Metropolitan Museum of Art"
      };
    } catch (_) {
      // Random search results occasionally lack a usable primary image.
    }
  }
  throw new Error("The Met did not return a usable image");
}

function setLoading(isLoading) {
  els.loading.hidden = !isLoading;
  els.error.hidden = true;
  if (isLoading) els.image.hidden = true;
  els.newButtons.forEach(button => {
    button.disabled = isLoading;
    button.setAttribute("aria-busy", String(isLoading));
  });
}

function displayArtwork(artwork) {
  els.image.src = artwork.imageUrl;
  els.image.alt = `${artwork.title} by ${artwork.artist}`;
  els.image.hidden = false;
  els.title.textContent = artwork.title;
  els.artist.textContent = artwork.artist;
  els.date.textContent = artwork.date;
  els.medium.textContent = artwork.medium;
  els.source.textContent = artwork.source;
  els.loading.hidden = true;
  els.error.hidden = true;
  document.title = `${artwork.title} — Visual Analysis Studio`;
}

function displayError() {
  els.loading.hidden = true;
  els.image.hidden = true;
  els.error.hidden = false;
  els.title.textContent = "Artwork unavailable";
  els.artist.textContent = "—";
  els.date.textContent = "—";
  els.medium.textContent = "—";
  els.source.textContent = "—";
}

async function loadArtwork() {
  setLoading(true);
  const sources = Math.random() < 0.5 ? [getAICArtwork, getMetArtwork] : [getMetArtwork, getAICArtwork];
  let artwork = null;

  for (const getArtwork of sources) {
    try {
      artwork = await getArtwork();
      break;
    } catch (error) {
      console.warn(`${getArtwork.name} failed; trying fallback.`, error);
    }
  }

  els.newButtons.forEach(button => {
    button.disabled = false;
    button.removeAttribute("aria-busy");
  });

  if (artwork) displayArtwork(artwork);
  else displayError();
}

function responseText() {
  const labels = ["DESCRIPTION", "ANALYSIS", "INTERPRETATION", "EVALUATION"];
  const responses = labels.map((label, index) => {
    const value = document.querySelector(`#response-${index + 1}`).value.trim();
    return `${label}\n${value || "(No response entered)"}`;
  });
  const artwork = `${els.title.textContent}\n${els.artist.textContent}\n${els.date.textContent}\n${els.medium.textContent}`;
  return `FORMAL ANALYSIS\n\nARTWORK\n${artwork}\n\n${responses.join("\n\n")}`;
}

async function copyResponses() {
  const text = responseText();
  try {
    await navigator.clipboard.writeText(text);
  } catch (_) {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    const copied = document.execCommand("copy");
    helper.remove();
    if (!copied) throw new Error("Copy failed");
  }
  els.copyStatus.textContent = "Copied. Your four responses are ready to paste.";
  window.setTimeout(() => { els.copyStatus.textContent = ""; }, 5000);
}

els.newButtons.forEach(button => button.addEventListener("click", loadArtwork));
els.retryButton.addEventListener("click", loadArtwork);
els.copyButton.addEventListener("click", () => {
  copyResponses().catch(() => {
    els.copyStatus.textContent = "Copy was blocked. Select your writing and copy it manually.";
  });
});

loadArtwork();
