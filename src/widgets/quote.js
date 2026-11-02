import { registerWidget } from './registry.js';

const QUOTES = [
  'Small starts still count as starts.',
  'Leave one clear thing for the next hour.',
  'The page can hold less than you think, and that is a gift.',
  'Water the work that is already growing.',
  'A quiet grid makes room for a loud idea.',
  'Finish the corner you are standing in.',
  'Put the next step where you can see it.',
  'Rest is part of the pace, not a pause in it.',
  'Keep the promise you can keep today.',
  'Name the task before you decorate it.',
  'One window, one job, then the harbor is calm.',
  'Let the easy version exist before the perfect one.',
  'Carry fewer tabs in your head.',
  'The second minute is easier than the decision.',
  'Leave a light on for the thing you will return to.',
  'Trade a little hurry for a cleaner edge.',
  'If it matters twice, make it a shortcut.',
  'Stay with the question until it gets specific.',
  'A short break can be a full reset.',
  'Set the table, then invite the work.',
  'You can begin without seeing the whole shoreline.',
  'Protect the hour that does the real work.',
  'Put the tool back where your hands expect it.',
  'End the day one note tidier than it began.',
  'Choose the smaller brave thing.',
  'Clarity is a kind of kindness to tomorrow.',
  'Let the timer hold the boundary for you.',
  'Keep what you use within reach.',
  'The work gets lighter when it has a place.',
  'Look up, then take the next honest step.',
  'Enough for today is a complete sentence.',
];

function quoteFor(date = new Date()) {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const day = Math.floor((today - start) / 86400000);
  return QUOTES[(day - 1 + QUOTES.length) % QUOTES.length];
}

registerWidget({
  kind: 'quote',
  name: 'Daily quote',
  description: 'A line for today',
  span: { w: 8, h: 2 },
  mount(host) {
    host.innerHTML = '<div class="quote-widget"><p class="quote-kicker">Today</p><blockquote class="quote-text"></blockquote></div>';
    host.querySelector('.quote-text').textContent = quoteFor();
    return () => {};
  },
});
