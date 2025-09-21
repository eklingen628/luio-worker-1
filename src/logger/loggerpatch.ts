
const origLog = console.log;
console.log = (...args) => {
  const ts = new Date().toISOString();
  origLog(`${ts} [info]:`, ...args);
};

const origWarn = console.warn;
console.warn = (...args) => {
  const ts = new Date().toISOString();
  origWarn(`${ts} [warn]:`, ...args);
};

const origErr = console.error;
console.error = (...args) => {
  const ts = new Date().toISOString();
  origErr(`${ts} [error]:`, ...args);
};
