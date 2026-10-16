const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

const PIPED_API_URL = (
  process.env.PIPED_API_URL || "https://pipedapi.kavin.rocks"
).replace(/\/+$/, "");

app.use(cors({ origin: "*" }));
app.use(express.json());

const piped = axios.create({
  baseURL: PIPED_API_URL,
  timeout: 15000,
  headers: { Accept: "application/json" }
});

async function fetchPiped(path, params, res) {
  try {
    const response = await piped.get(path, { params });
    return res.json({ success: true, data: response.data });
  } catch (error) {
    console.error("Piped error:", error.message);

    const status = error.code === "ECONNABORTED" ? 504 : 502;

    return res.status(status).json({
      success: false,
      error: "Piped API is unavailable or the request failed."
    });
  }
}

app.get("/", (req, res) => {
  res.json({ success: true, message: "Piped proxy is running!" });
});

app.get("/api/search", (req, res) => {
  const query = req.query.query;

  if (typeof query !== "string" || !query.trim()) {
    return res.status(400).json({
      success: false,
      error: "Please provide a search query."
    });
  }

  return fetchPiped("/search", { q: query.trim(), filter: "all" }, res);
});

app.get("/api/streams/:videoId", (req, res) => {
  const { videoId } = req.params;

  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({
      success: false,
      error: "Invalid YouTube video ID."
    });
  }

  return fetchPiped(`/streams/${videoId}`, {}, res);
});

app.get("/api/trending", (req, res) => {
  const region = req.query.region || "IN";

  if (typeof region !== "string" || !/^[A-Za-z]{2}$/.test(region)) {
    return res.status(400).json({
      success: false,
      error: "Region must be a two-letter country code."
    });
  }

  return fetchPiped("/trending", {
    region: region.toUpperCase()
  }, res);
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found."
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Piped proxy running on port ${PORT}`);
});
