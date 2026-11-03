import { registerWidget } from './registry.js';
import { bindPress, icon, locate } from './kit.js';

const CACHE_MS = 30 * 60 * 1000;

let cache = null;
let pending = null;
let generation = 0;
const listeners = new Set();
let listening = false;

function emit() {
  for (const fn of listeners) fn(cache);
}

function listen() {
  if (listening || !globalThis.chrome?.storage?.onChanged) return;
  listening = true;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.weatherCache) return;
    cache = changes.weatherCache.newValue || null;
    emit();
  });
}

function condition(code) {
  if (code === 0) return 'Sunny';
  if (code === 1) return 'Mostly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code === 85 || code === 86) return 'Snow showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Weather';
}

export function weatherIcon(code) {
  if (code === 0 || code === 1) return 'sun';
  if (code === 2 || code === 3) return 'cloud';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  if (code >= 51) return 'rain';
  return 'cloud';
}

function tempText(value) {
  return Number.isFinite(value) ? `${Math.round(value)}°` : '--°';
}

async function fetchForecast(place) {
  const endpoint = new URL('https://api.open-meteo.com/v1/forecast');
  endpoint.searchParams.set('latitude', String(place.lat));
  endpoint.searchParams.set('longitude', String(place.lon));
  endpoint.searchParams.set('current', 'temperature_2m,weather_code');
  endpoint.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min');
  endpoint.searchParams.set('timezone', 'auto');
  endpoint.searchParams.set('forecast_days', '7');
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error('Forecast unavailable');
  const body = await response.json();
  const times = body.daily?.time || [];
  const days = times.map((time, index) => ({
    time,
    code: body.daily?.weather_code?.[index],
    high: body.daily?.temperature_2m_max?.[index],
    low: body.daily?.temperature_2m_min?.[index],
  }));
  return {
    fetchedAt: Date.now(),
    lat: place.lat,
    lon: place.lon,
    name: place.name || 'Here',
    temp: body.current?.temperature_2m,
    code: body.current?.weather_code,
    high: days[0]?.high,
    low: days[0]?.low,
    days,
  };
}

async function refresh(place) {
  const ticket = generation;
  const next = await fetchForecast(place);
  if (ticket !== generation) return null;
  await chrome.storage.local.set({ weatherCache: next });
  if (ticket !== generation) {
    await chrome.storage.local.remove('weatherCache').catch(() => {});
    return null;
  }
  cache = next;
  emit();
  return next;
}

export function resetWeather() {
  generation += 1;
  cache = null;
  pending = null;
  emit();
  if (!globalThis.chrome?.storage?.local) return Promise.resolve();
  return chrome.storage.local.remove('weatherCache').catch((error) => {
    console.error(error);
  });
}

export function subscribeWeather(fn) {
  listen();
  listeners.add(fn);
  fn(cache);
  return () => listeners.delete(fn);
}

export function ensureWeather() {
  if (pending) return pending;
  const ticket = generation;
  const run = (async () => {
    listen();
    if (!cache) {
      try {
        const data = await chrome.storage.local.get('weatherCache');
        if (ticket !== generation) return null;
        cache = data.weatherCache || null;
        emit();
      } catch (error) {
        console.error(error);
      }
    }
    if (ticket !== generation) return null;
    const stale = cache?.lat && (Date.now() - cache.fetchedAt > CACHE_MS || !Array.isArray(cache.days));
    if (stale) {
      try {
        await refresh(cache);
      } catch (error) {
        console.error(error);
      }
    }
    return ticket === generation ? cache : null;
  })();
  pending = run;
  run.finally(() => {
    if (pending === run) pending = null;
  });
  return run;
}

function askLocation() {
  return locate()
    .then((pos) => refresh({ ...pos, name: 'Here' }))
    .catch((error) => {
      console.error(error);
      return null;
    });
}

function mountCompact(host) {
  const root = document.createElement('div');
  root.className = 'nx nx-paper nx-highlow';
  const high = document.createElement('div');
  const low = document.createElement('div');
  const highText = document.createElement('b');
  const lowText = document.createElement('b');
  high.append(icon('up'), highText);
  low.append(icon('down'), lowText);
  root.append(high, low);
  host.append(root);
  let latest = null;
  const stop = subscribeWeather((data) => {
    latest = data;
    highText.textContent = tempText(data?.high);
    lowText.textContent = Number.isFinite(data?.low) ? tempText(data.low) : 'Tap';
  });
  bindPress(root, () => {
    if (Number.isFinite(latest?.high)) return;
    highText.textContent = '…';
    askLocation();
  });
  root.setAttribute('aria-label', 'High and low');
  ensureWeather();
  return stop;
}

function mountNow(host) {
  const root = document.createElement('div');
  root.className = 'nx nx-paper nx-circle nx-temp';
  host.append(root);
  let latest = null;
  const stop = subscribeWeather((data) => {
    latest = data;
    root.textContent = Number.isFinite(data?.temp) ? tempText(data.temp) : 'Tap';
  });
  bindPress(root, () => {
    if (Number.isFinite(latest?.temp)) return;
    root.textContent = '…';
    askLocation();
  });
  root.setAttribute('aria-label', 'Temperature');
  ensureWeather();
  return stop;
}

function mountRange(host) {
  const root = document.createElement('div');
  root.className = 'nx nx-paper nx-range';
  const low = document.createElement('b');
  const high = document.createElement('b');
  root.append(icon('plane', 'nx-ico nx-ico-lg'), low, high);
  host.append(root);
  let latest = null;
  const stop = subscribeWeather((data) => {
    latest = data;
    low.textContent = Number.isFinite(data?.low) ? `L ${Math.round(data.low)}°` : 'L --°';
    high.textContent = Number.isFinite(data?.high) ? `H ${Math.round(data.high)}°` : 'H --°';
  });
  bindPress(root, () => {
    if (Number.isFinite(latest?.high)) return;
    askLocation();
  });
  root.setAttribute('aria-label', 'Low and high');
  ensureWeather();
  return stop;
}

function mountSunny(host) {
  const root = document.createElement('div');
  root.className = 'nx nx-paper nx-pill';
  const label = document.createElement('span');
  label.className = 'nx-label';
  label.textContent = 'Weather';
  root.append(icon('sun'), label);
  host.append(root);
  let latest = null;
  const stop = subscribeWeather((data) => {
    latest = data;
    label.textContent = Number.isFinite(data?.code) ? condition(data.code) : 'Weather';
    root.replaceChildren(icon(weatherIcon(Number.isFinite(data?.code) ? data.code : 0)), label);
  });
  bindPress(root, () => {
    if (Number.isFinite(latest?.code)) return;
    label.textContent = 'Locating';
    askLocation();
  });
  root.setAttribute('aria-label', 'Conditions');
  ensureWeather();
  return stop;
}

function mountForecast(host) {
  const root = document.createElement('div');
  root.className = 'nx nx-ink nx-forecast';
  const top = document.createElement('div');
  top.className = 'nx-fore-top';
  const temp = document.createElement('div');
  temp.className = 'nx-fore-temp';
  temp.textContent = '--°';
  const copy = document.createElement('div');
  copy.className = 'nx-fore-copy';
  const cond = document.createElement('div');
  cond.className = 'nx-fore-cond';
  cond.textContent = 'Weather';
  const range = document.createElement('div');
  range.className = 'nx-fore-range';
  range.textContent = 'H --°  L --°';
  const place = document.createElement('div');
  place.className = 'nx-fore-place';
  place.textContent = 'Choose a city';
  copy.append(cond, range, place);
  top.append(temp, copy);
  const days = document.createElement('div');
  days.className = 'nx-fore-days';
  const tools = document.createElement('div');
  tools.className = 'nx-fore-tools';
  const locateBtn = document.createElement('button');
  locateBtn.type = 'button';
  locateBtn.textContent = 'Locate';
  const cityBtn = document.createElement('button');
  cityBtn.type = 'button';
  cityBtn.textContent = 'City';
  tools.append(locateBtn, cityBtn);
  const search = document.createElement('form');
  search.className = 'nx-fore-search';
  search.hidden = true;
  const input = document.createElement('input');
  input.type = 'search';
  input.name = 'city';
  input.placeholder = 'Search cities';
  input.setAttribute('aria-label', 'Search cities');
  input.autocomplete = 'off';
  const results = document.createElement('div');
  results.className = 'nx-fore-results';
  const error = document.createElement('p');
  error.className = 'nx-fore-error';
  search.append(input, results, error);
  root.append(top, days, tools, search);
  host.append(root);

  let searchTimer = 0;
  let controller = null;

  function showError(message) {
    error.textContent = message || '';
  }

  function paintDays(list) {
    days.replaceChildren();
    const source = Array.isArray(list) && list.length ? list.slice(0, 7) : Array.from({ length: 7 }, () => null);
    for (const day of source) {
      const col = document.createElement('div');
      col.className = 'nx-fday';
      const name = document.createElement('b');
      if (day?.time) {
        const when = new Date(`${day.time}T12:00:00`);
        name.textContent = when.toLocaleDateString([], { weekday: 'short' }).slice(0, 2);
      } else {
        name.textContent = '–';
      }
      const reading = document.createElement('span');
      reading.textContent = day ? tempText(day.high) : '--';
      col.append(name, icon(day ? weatherIcon(day.code) : 'cloud', 'nx-ico'), reading);
      days.append(col);
    }
  }

  const stop = subscribeWeather((data) => {
    temp.textContent = tempText(data?.temp);
    cond.textContent = Number.isFinite(data?.code) ? condition(data.code) : 'Weather';
    const high = Number.isFinite(data?.high) ? `${Math.round(data.high)}°` : '--°';
    const low = Number.isFinite(data?.low) ? `${Math.round(data.low)}°` : '--°';
    range.textContent = `H ${high}   L ${low}`;
    place.textContent = data?.name || 'Choose a city';
    paintDays(data?.days);
  });
  paintDays(null);
  ensureWeather();

  locateBtn.addEventListener('click', () => {
    showError('');
    cond.textContent = 'Locating…';
    askLocation().then((next) => {
      if (!next) showError('Location is blocked.');
    });
  });

  cityBtn.addEventListener('click', () => {
    search.hidden = !search.hidden;
    if (!search.hidden) input.focus();
  });

  async function searchCities(query) {
    controller?.abort();
    controller = new AbortController();
    const endpoint = new URL('https://geocoding-api.open-meteo.com/v1/search');
    endpoint.searchParams.set('name', query);
    endpoint.searchParams.set('count', '4');
    endpoint.searchParams.set('language', 'en');
    endpoint.searchParams.set('format', 'json');
    const response = await fetch(endpoint, { signal: controller.signal });
    if (!response.ok) throw new Error('City search failed');
    const body = await response.json();
    results.replaceChildren();
    const list = body.results || [];
    if (!list.length) {
      showError('No matching cities.');
      return;
    }
    showError('');
    for (const city of list) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'result';
      const region = city.admin1 ? `, ${city.admin1}` : '';
      const country = city.country_code || '';
      button.textContent = `${city.name}${region}${country ? `, ${country}` : ''}`;
      button.addEventListener('click', () => {
        search.hidden = true;
        refresh({
          lat: city.latitude,
          lon: city.longitude,
          name: city.name,
        }).catch((err) => showError(err.message || 'Could not load weather.'));
      });
      results.append(button);
    }
  }

  search.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (text.length < 2) return;
    searchCities(text).catch((err) => {
      if (err.name === 'AbortError') return;
      showError('City search failed.');
    });
  });

  input.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const text = input.value.trim();
    if (text.length < 2) {
      results.replaceChildren();
      return;
    }
    searchTimer = setTimeout(() => {
      searchCities(text).catch((err) => {
        if (err.name === 'AbortError') return;
        showError('City search failed.');
      });
    }, 280);
  });

  return () => {
    stop();
    clearTimeout(searchTimer);
    controller?.abort();
  };
}

registerWidget({
  kind: 'weather-compact',
  name: 'High / low',
  description: 'Today’s high and low',
  span: { w: 2, h: 3 },
  mount: mountCompact,
});

registerWidget({
  kind: 'weather',
  name: 'Forecast',
  description: 'Current conditions and a week',
  span: { w: 6, h: 3 },
  mount: mountForecast,
});

registerWidget({
  kind: 'weather-now',
  name: 'Temperature',
  description: 'Current temperature',
  span: { w: 2, h: 2 },
  mount: mountNow,
});

registerWidget({
  kind: 'weather-range',
  name: 'Range',
  description: 'Low and high',
  span: { w: 2, h: 2 },
  mount: mountRange,
});

registerWidget({
  kind: 'sunny',
  name: 'Conditions',
  description: 'A short conditions pill',
  span: { w: 2, h: 1 },
  mount: mountSunny,
});
