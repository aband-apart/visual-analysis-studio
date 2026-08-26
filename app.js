"use strict";

const AIC_API = "https://api.artic.edu/api/v1/artworks?is_public_domain=true&has_multimedia_resources=false&limit=100&fields=id,title,artist_display,date_display,medium_display,dimensions,image_id,thumbnail";
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
  dimensions: document.querySelector("#artwork-dimensions"),
  source: document.querySelector("#artwork-source"),
  museumLink: document.querySelector("#museum-link"),
  newButtons: [document.querySelector("#new-artwork"), document.querySelector("#new-artwork-top")],
  viewButtons: [...document.querySelectorAll(".view-artwork")],
  retryButton: document.querySelector("#retry-artwork"),
  copyButton: document.querySelector("#copy-responses"),
  downloadButton: document.querySelector("#download-responses"),
  exportStatus: document.querySelector("#export-status"),
  progressSummary: document.querySelector("#progress-summary"),
  dialog: document.querySelector("#artwork-dialog"),
  dialogClose: document.querySelector("#dialog-close"),
  dialogImage: document.querySelector("#dialog-image"),
  dialogTitle: document.querySelector("#dialog-artwork-title"),
  dialogDetails: document.querySelector("#dialog-artwork-details"),
  dialogLink: document.querySelector("#dialog-museum-link"),
  referenceCard: document.querySelector(".reference-card"),
  referenceImage: document.querySelector("#reference-image"),
  referenceTitle: document.querySelector("#reference-title"),
  referenceArtist: document.querySelector("#reference-artist")
};

let currentArtwork = null;
const responseFields = [1, 2, 3, 4].map(number => document.querySelector(`#response-${number}`));

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffled(items) {
  return [...items].sort(() => Math.random() - 0.5);
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
      if (image.naturalWidth < 100 || image.naturalHeight < 100) reject(new Error("Image is too small"));
      else resolve(url);
    };
    image.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("Image failed to load"));
    };
    image.src = url;
  });
}

async function getAICArtwork() {
  let payload = await fetchJSON(AIC_API);
  const totalPages = Number(payload.pagination?.total_pages || 1);
  if (totalPages > 1) {
    const pageUrl = new URL(AIC_API);
    pageUrl.searchParams.set("page", String(Math.floor(Math.random() * Math.min(totalPages, 500)) + 1));
    try { payload = await fetchJSON(pageUrl.toString()); } catch (_) { /* use page one */ }
  }

  const choices = shuffled((payload.data || []).filter(item => item.image_id));
  if (!choices.length) throw new Error("AIC returned no usable images");

  const candidates = choices.slice(0, 8).map(async item => {
    const imageUrl = `https://www.artic.edu/iiif/2/${item.image_id}/full/843,/0/default.jpg`;
    await verifyImage(imageUrl);
    return {
      title: clean(item.title, "Untitled"),
      artist: clean(item.artist_display, "Artist unknown").replace(/\n+/g, ", "),
      date: clean(item.date_display),
      medium: clean(item.medium_display),
      dimensions: clean(item.dimensions, "Not provided by the museum"),
      imageUrl,
      source: "Art Institute of Chicago",
      recordUrl: `https://www.artic.edu/artworks/${item.id}`
    };
  });
  return Promise.any(candidates);
}

async function getMetArtwork() {
  const search = await fetchJSON(MET_SEARCH_API, 18000);
  const ids = search.objectIDs || [];
  if (!ids.length) throw new Error("The Met returned no object IDs");

  const selectedIds = shuffled(ids).slice(0, 8);
  const records = await Promise.allSettled(selectedIds.map(id => fetchJSON(`${MET_OBJECT_API}${id}`, 15000)));
  const usable = records
    .filter(result => result.status === "fulfilled")
    .map(result => result.value)
    .filter(item => (item.primaryImage || item.primaryImageSmall) && item.isPublicDomain !== false);
  if (!usable.length) throw new Error("The Met returned no usable records");

  const candidates = usable.map(async item => {
    const imageUrl = item.primaryImage || item.primaryImageSmall;
    await verifyImage(imageUrl);
    return {
      title: clean(item.title, "Untitled"),
      artist: clean(item.artistDisplayName, item.culture ? clean(item.culture) : "Artist unknown"),
      date: clean(item.objectDate),
      medium: clean(item.medium),
      dimensions: clean(item.dimensions, "Not provided by the museum"),
      imageUrl,
      source: "The Metropolitan Museum of Art",
      recordUrl: clean(item.objectURL, `https://www.metmuseum.org/art/collection/search/${item.objectID}`)
    };
  });
  return Promise.any(candidates);
}

function setLoading(isLoading) {
  els.loading.hidden = !isLoading;
  els.error.hidden = true;
  if (isLoading) els.image.hidden = true;
  els.newButtons.forEach(button => {
    button.disabled = isLoading;
    button.setAttribute("aria-busy", String(isLoading));
  });
  els.viewButtons.forEach(button => { button.disabled = isLoading || !currentArtwork; });
  els.referenceCard.setAttribute("aria-busy", String(isLoading));
}

function updateDialog(artwork) {
  els.dialogImage.src = artwork.imageUrl;
  els.dialogImage.alt = `${artwork.title} by ${artwork.artist}`;
  els.dialogTitle.textContent = artwork.title;
  els.dialogDetails.textContent = `${artwork.artist}\n${artwork.date}\n${artwork.medium}\n${artwork.dimensions}\n${artwork.source}`;
  els.dialogLink.href = artwork.recordUrl;
}

function displayArtwork(artwork) {
  currentArtwork = artwork;
  els.image.src = artwork.imageUrl;
  els.image.alt = `${artwork.title} by ${artwork.artist}`;
  els.image.hidden = false;
  els.title.textContent = artwork.title;
  els.artist.textContent = artwork.artist;
  els.date.textContent = artwork.date;
  els.medium.textContent = artwork.medium;
  els.dimensions.textContent = artwork.dimensions;
  els.source.textContent = artwork.source;
  els.museumLink.href = artwork.recordUrl;
  els.museumLink.hidden = false;
  els.loading.hidden = true;
  els.error.hidden = true;
  els.viewButtons.forEach(button => { button.disabled = false; });
  els.referenceImage.src = artwork.imageUrl;
  els.referenceImage.alt = "";
  els.referenceImage.hidden = false;
  els.referenceTitle.textContent = artwork.title;
  els.referenceArtist.textContent = artwork.artist;
  els.referenceCard.setAttribute("aria-busy", "false");
  updateDialog(artwork);
  document.title = `${artwork.title} — Visual Analysis Studio`;
}

function displayError() {
  currentArtwork = null;
  els.loading.hidden = true;
  els.image.hidden = true;
  els.error.hidden = false;
  els.title.textContent = "Artwork unavailable";
  [els.artist, els.date, els.medium, els.dimensions, els.source].forEach(element => { element.textContent = "—"; });
  els.museumLink.hidden = true;
  els.viewButtons.forEach(button => { button.disabled = true; });
  els.referenceImage.hidden = true;
  els.referenceTitle.textContent = "Artwork unavailable";
  els.referenceArtist.textContent = "Try loading another artwork.";
  els.referenceCard.setAttribute("aria-busy", "false");
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

function startedResponses() {
  return responseFields.filter(field => field.value.trim()).length;
}

function updateProgress() {
  const started = startedResponses();
  responseFields.forEach((field, index) => {
    const hasText = Boolean(field.value.trim());
    const item = document.querySelector(`.progress-list li:nth-child(${index + 1})`);
    const status = document.querySelector(`#status-${index + 1}`);
    item.dataset.started = String(hasText);
    status.textContent = hasText ? "Started" : "Not started";
  });
  els.progressSummary.textContent = `${started} of 4 ${started === 1 ? "response" : "responses"} started`;
}

function responseText() {
  const labels = ["DESCRIPTION", "ANALYSIS", "INTERPRETATION", "EVALUATION"];
  const responses = labels.map((label, index) => `${label}\n${responseFields[index].value.trim() || "(No response entered)"}`);
  const artwork = currentArtwork
    ? `${currentArtwork.title}\n${currentArtwork.artist}\n${currentArtwork.date}\n${currentArtwork.medium}\n${currentArtwork.dimensions}\n${currentArtwork.source}\n${currentArtwork.recordUrl}`
    : `${els.title.textContent}\nArtwork details unavailable`;
  return `FORMAL ANALYSIS\n\nARTWORK\n${artwork}\n\n${responses.join("\n\n")}`;
}

function exportMessage(action) {
  const blanks = 4 - startedResponses();
  const unfinished = blanks ? ` ${blanks} ${blanks === 1 ? "section was" : "sections were"} blank.` : " All four sections contained writing.";
  els.exportStatus.textContent = `${action}.${unfinished}`;
  window.setTimeout(() => { els.exportStatus.textContent = ""; }, 6500);
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
  exportMessage("Copied");
}

function downloadResponses() {
  const blob = new Blob([responseText()], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `formal-analysis-${date}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  exportMessage("Downloaded");
}

function openArtworkDialog() {
  if (currentArtwork && !els.dialog.open) els.dialog.showModal();
}

responseFields.forEach(field => field.addEventListener("input", updateProgress));
els.newButtons.forEach(button => button.addEventListener("click", loadArtwork));
els.viewButtons.forEach(button => button.addEventListener("click", openArtworkDialog));
els.retryButton.addEventListener("click", loadArtwork);
els.dialogClose.addEventListener("click", () => els.dialog.close());
els.dialog.addEventListener("click", event => {
  if (event.target === els.dialog) els.dialog.close();
});
els.copyButton.addEventListener("click", () => {
  copyResponses().catch(() => { els.exportStatus.textContent = "Copy was blocked. Use Download text file instead."; });
});
els.downloadButton.addEventListener("click", downloadResponses);
window.addEventListener("beforeunload", event => {
  if (startedResponses() > 0) {
    event.preventDefault();
    event.returnValue = "";
  }
});

updateProgress();
loadArtwork();
