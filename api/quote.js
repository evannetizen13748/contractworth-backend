export default async function handler(req, res) {
  const { symbol, strike, expiration, type } = req.query;

  if (!symbol || !strike || !expiration || !type) {
    return res.status(400).json({
      error: "Missing required params: symbol, strike, expiration (YYYY-MM-DD), type (call/put)",
    });
  }

  const apiKey = process.env.ALPHA_VANTAGE_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing its Alpha Vantage key" });
  }

  try {
    const optionsUrl = `https://www.alphavantage.co/query?function=HISTORICAL_OPTIONS&symbol=${encodeURIComponent(
      symbol
    )}&apikey=${apiKey}`;
    const optionsRes = await fetch(optionsUrl);
    const optionsData = await optionsRes.json();

    if (!optionsData.data || !Array.isArray(optionsData.data)) {
      return res.status(502).json({ error: "Unexpected response from data provider", raw: optionsData });
    }

    const contractType = type.toLowerCase() === "put" ? "put" : "call";

    const match = optionsData.data.find(
      (c) =>
        c.expiration === expiration &&
        parseFloat(c.strike) === parseFloat(strike) &&
        c.type === contractType
    );

    if (!match) {
      return res.status(404).json({
        error: "No contract found for that strike/expiration/type on the most recent trading day",
      });
    }

    const quoteUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(
      symbol
    )}&apikey=${apiKey}`;
    const quoteRes = await fetch(quoteUrl);
    const quoteData = await quoteRes.json();
    const underlyingClose = parseFloat(quoteData["Global Quote"]?.["05. price"]) || null;

    return res.status(200).json({
      symbol,
      strike: parseFloat(match.strike),
      expiration: match.expiration,
      type: contractType,
      lastPrice: parseFloat(match.last),
      impliedVolatility: parseFloat(match.implied_volatility) * 100,
      underlyingClose,
      asOfDate: match.date,
    });
  } catch (err) {
    return res.status(500).json({ error: "Lookup failed", detail: String(err) });
  }
}
