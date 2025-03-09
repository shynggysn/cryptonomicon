const API_KEY =
  "bd068d7121f835c03da37f5cac2bf24ccfde4954fd42dd0ded7c2cf5c16848f7";

const tickersHandlers = new Map();
const socket = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
);

let BTC_PRICE = "-";

const AGGREGATE_INDEX = "5";
const INVALID_SUB = "500";

socket.addEventListener("message", (e) => {
  const {
    TYPE: type,
    FROMSYMBOL: currency,
    TOSYMBOL: toCurrency,
    PRICE: newPrice,
    PARAMETER: parameter,
    MESSAGE: message
  } = JSON.parse(e.data);

  if (type === AGGREGATE_INDEX && newPrice !== undefined) {
    const handlers = tickersHandlers.get(currency) ?? [];
    if (currency === "BTC") {
      BTC_PRICE = newPrice;
      console.log("Updated BTC Price:", BTC_PRICE);
    } else if (toCurrency === "BTC") {
      const convertedPrice = BTC_PRICE === "-" ? "-" : newPrice * BTC_PRICE;
      handlers.forEach((fn) => fn(convertedPrice));
      return;
    }
    handlers.forEach((fn) => fn(newPrice));
    return;
  }

  // send another message "NO_PRICE_WHEN_TO_BTC" when error with btc conversion
  if (type === INVALID_SUB && message === "INVALID_SUB") {
    const parameterSplitted = parameter.split("~");
    const invalidCurrency = parameterSplitted[2];
    const conversionCurrency = parameterSplitted[3];
    const handlers = tickersHandlers.get(invalidCurrency) ?? [];
    if (conversionCurrency === "USD") {
      handlers.forEach((fn) => fn("NO_PRICE"));
    } else if (conversionCurrency === "BTC") {
      handlers.forEach((fn) => fn("NO_PRICE_WHEN_TO_BTC"));
    }
    return;
  }
});

function sendToWebSocket(message) {
  const stringifiedMessage = JSON.stringify(message);

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(stringifiedMessage);
    return;
  }

  socket.addEventListener(
    "open",
    () => {
      socket.send(stringifiedMessage);
    },
    { once: true }
  );
}

function subscribeToTickerOnWs(ticker) {
  sendToWebSocket({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~USD`]
  });
}

function unsubscribeFromTickerOnWs(ticker) {
  sendToWebSocket({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~USD`]
  });
}

function subscribeToTickerToBTCOnWs(ticker) {
  sendToWebSocket({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~BTC`]
  });
}

function unsubscribeFromTickerToBTCOnWs(ticker) {
  sendToWebSocket({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~BTC`]
  });
}

function subscribeToBTCToUSDOnWs() {
  sendToWebSocket({
    action: "SubAdd",
    subs: [`5~CCCAGG~BTC~USD`]
  });
}

export const subscribeToTicker = (ticker, cb) => {
  const subscribers = tickersHandlers.get(ticker) || [];
  tickersHandlers.set(ticker, [...subscribers, cb]);
  subscribeToTickerOnWs(ticker);
};

export const unsubscribeFromTicker = (ticker) => {
  tickersHandlers.delete(ticker);
  unsubscribeFromTickerOnWs(ticker);
};

export const subscribeToTickerToBTC = (ticker, cb) => {
  const subscribers = tickersHandlers.get(ticker) || [];
  tickersHandlers.set(ticker, [...subscribers, cb]);
  subscribeToTickerToBTCOnWs(ticker);
  subscribeToBTCToUSDOnWs();
};

export const unsubscribeFromTickerToBTC = (ticker) => {
  tickersHandlers.delete(ticker);
  unsubscribeFromTickerToBTCOnWs(ticker);
};
