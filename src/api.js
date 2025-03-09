const API_KEY =
  "bd068d7121f835c03da37f5cac2bf24ccfde4954fd42dd0ded7c2cf5c16848f7";

const tickersHandlers = new Map();

//TODO: refactor to use URLSearchParams
const loadTickers = () => {
  if (tickersHandlers.size == 0) return;

  fetch(`
        https://min-api.cryptocompare.com/data/pricemulti?fsyms=${[
          ...tickersHandlers.keys()
        ].join(",")}&tsyms=USD&api_key=${API_KEY}`)
    .then((r) => r.json())
    .then((rawData) => {
      console.log(rawData);
      const updatedPrices = Object.fromEntries(
        Object.entries(rawData).map(([key, value]) => [key, value.USD])
      );
      Object.entries(updatedPrices).forEach(([currency, newPrice]) => {
        const handlers = tickersHandlers.get(currency) ?? [];
        handlers.forEach((fn) => fn(newPrice));
      });
    });
};

export const subscribeToTicker = (ticker, cb) => {
  const subscribers = tickersHandlers.get(ticker) || [];
  tickersHandlers.set(ticker, [...subscribers, cb]);
};

export const unsubscribeFromTicker = (ticker) => {
  tickersHandlers.delete(ticker);
};
window.tickerHandlers = tickersHandlers;
setInterval(loadTickers, 5000);
