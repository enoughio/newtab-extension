const ALARM = 'focus-timer';
const FOCUS_MS = 25 * 60 * 1000;
const BREAK_MS = 5 * 60 * 1000;

let queue = Promise.resolve();

function enqueue(task) {
  const run = queue.then(task, task);
  queue = run.then(() => {}, () => {});
  return run;
}

function notify(title, message) {
  chrome.notifications.create(`focus-${Date.now()}`, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title,
    message,
  }, () => {
    if (chrome.runtime.lastError) console.error(chrome.runtime.lastError.message);
  });
}

async function startFocus() {
  const endsAt = Date.now() + FOCUS_MS;
  await chrome.storage.local.set({ focus: { phase: 'focus', endsAt } });
  await chrome.alarms.clear(ALARM);
  await chrome.alarms.create(ALARM, { when: endsAt });
}

async function stopFocus() {
  await chrome.alarms.clear(ALARM);
  await chrome.storage.local.set({ focus: { phase: 'idle', endsAt: 0 } });
}

async function catchUp() {
  const stored = await chrome.storage.local.get('focus');
  const focus = stored.focus;
  if (!focus || focus.phase === 'idle' || !focus.endsAt) return;
  const now = Date.now();
  if (now < focus.endsAt) {
    await chrome.alarms.create(ALARM, { when: focus.endsAt });
    return;
  }
  if (focus.phase === 'focus') {
    const breakEnd = focus.endsAt + BREAK_MS;
    if (now >= breakEnd) {
      await chrome.storage.local.set({ focus: { phase: 'idle', endsAt: 0 } });
      await chrome.alarms.clear(ALARM);
      notify('Break over', 'Ready for another 25 minute focus.');
      return;
    }
    await chrome.storage.local.set({ focus: { phase: 'break', endsAt: breakEnd } });
    await chrome.alarms.create(ALARM, { when: breakEnd });
    notify('Focus complete', 'Time for a 5 minute break.');
    return;
  }
  await chrome.storage.local.set({ focus: { phase: 'idle', endsAt: 0 } });
  await chrome.alarms.clear(ALARM);
  notify('Break over', 'Ready for another 25 minute focus.');
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) enqueue(catchUp);
});

chrome.runtime.onStartup.addListener(() => enqueue(catchUp));
chrome.runtime.onInstalled.addListener(() => enqueue(catchUp));

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'focus-start') {
    enqueue(startFocus).then(() => sendResponse({ ok: true }), (error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }
  if (message?.type === 'focus-stop') {
    enqueue(stopFocus).then(() => sendResponse({ ok: true }), (error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }
  if (message?.type === 'focus-catchup') {
    enqueue(catchUp).then(() => sendResponse({ ok: true }), (error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }
  return false;
});
