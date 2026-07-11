export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { symbol } = req.query;
  if (!symbol) {
    return res.status(400).json({ error: "Missing required param: symbol" });
  }

  const apiKey = process.env.ALPHA_VANTAGE_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing its Alpha Vantage key" });
  }

  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(
      symbol
    )}&apikey=${apiKey}`;
    const r = await fetch(url);
    const data = await r.json();

    const quote = data["Global Quote"];
    const price = quote ? parseFloat(quote["05. price"]) : null;
    const asOfDate = quote ? quote["07. latest trading day"] : null;

    if (!price) {
      return res.status(502).json({ error: "No price data returned", raw: data });
    }

    return res.status(200).json({ symbol, lastClose: price, asOfDate });
  } catch (err) {
    return res.status(500).json({ error: "Lookup failed", detail: String(err) });
  }
}
