import { registerWidget } from './registry.js';

const QUOTES = [
  'The only way to do great work is to love what you do. \u2014 Steve Jobs',
  'Nothing in life is to be feared, it is only to be understood. \u2014 Marie Curie',
  'Injustice anywhere is a threat to justice everywhere. \u2014 Martin Luther King Jr.',
  'Imagination is more important than knowledge. \u2014 Albert Einstein',
  'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. \u2014 Jane Austen',
  'Float like a butterfly, sting like a bee. \u2014 Muhammad Ali',
  'You must do the thing you think you cannot do. \u2014 Eleanor Roosevelt',
  'If I have seen further, it is by standing on the shoulders of giants. \u2014 Isaac Newton',
  'I paint my own reality. \u2014 Frida Kahlo',
  'The only thing we have to fear is fear itself. \u2014 Franklin D. Roosevelt',
  'We are all in the gutter, but some of us are looking at the stars. \u2014 Oscar Wilde',
  'One child, one teacher, one book and one pen can change the world. \u2014 Malala Yousafzai',
  'What I cannot create, I do not understand. \u2014 Richard Feynman',
  'Life is either a daring adventure or nothing. \u2014 Helen Keller',
  'Education is the most powerful weapon which you can use to change the world. \u2014 Nelson Mandela',
  'Brevity is the soul of wit. \u2014 William Shakespeare',
  'If you wish to make an apple pie from scratch, you must first invent the universe. \u2014 Carl Sagan',
  'The only tired I was, was tired of giving in. \u2014 Rosa Parks',
  'A journey of a thousand miles begins with a single step. \u2014 Lao Tzu',
  'That\'s one small step for man, one giant leap for mankind. \u2014 Neil Armstrong',
  'If there\'s a book that you want to read, but it hasn\'t been written yet, then you must write it. \u2014 Toni Morrison',
  'Never in the field of human conflict was so much owed by so many to so few. \u2014 Winston Churchill',
  'Creativity takes courage. \u2014 Henri Matisse',
  'If you tell the truth, you do not have to remember anything. \u2014 Mark Twain',
  'One is not born, but rather becomes, a woman. \u2014 Simone de Beauvoir',
  'Remember to look up at the stars and not down at your feet. \u2014 Stephen Hawking',
  'Your silence will not protect you. \u2014 Audre Lorde',
  'Ask not what your country can do for you; ask what you can do for your country. \u2014 John F. Kennedy',
  'What would life be if we had no courage to attempt anything? \u2014 Vincent van Gogh',
  'Well done is better than well said. \u2014 Benjamin Franklin',
  'The good thing about science is that it\'s true whether or not you believe in it. \u2014 Neil deGrasse Tyson',
  'One cannot think well, love well, sleep well, if one has not dined well. \u2014 Virginia Woolf',
  'Genius is one percent inspiration and ninety-nine percent perspiration. \u2014 Thomas Edison',
  'How wonderful it is that nobody need wait a single moment before starting to improve the world. \u2014 Anne Frank',
  'The unexamined life is not worth living. \u2014 Socrates',
  'Art is a lie that makes us realize truth. \u2014 Pablo Picasso',
  'A house divided against itself cannot stand. \u2014 Abraham Lincoln',
  'What you do makes a difference, and you have to decide what kind of difference you want to make. \u2014 Jane Goodall',
  'The only way to have a friend is to be one. \u2014 Ralph Waldo Emerson',
  'Any sufficiently advanced technology is indistinguishable from magic. \u2014 Arthur C. Clarke',
  'There are years that ask questions and years that answer. \u2014 Zora Neale Hurston',
  'Mr. Gorbachev, tear down this wall! \u2014 Ronald Reagan',
  'Chance favors only the prepared mind. \u2014 Louis Pasteur',
  'To love at all is to be vulnerable. \u2014 C. S. Lewis',
  'Machines take me by surprise with great frequency. \u2014 Alan Turing',
  'If you are neutral in situations of injustice, you have chosen the side of the oppressor. \u2014 Desmond Tutu',
  'What does not kill me makes me stronger. \u2014 Friedrich Nietzsche',
  'I cannot live without books. \u2014 Thomas Jefferson',
  'The future is already here \u2014 it\'s just not very evenly distributed. \u2014 William Gibson',
  'Those who cannot remember the past are condemned to repeat it. \u2014 George Santayana',
  'The best way to predict the future is to invent it. \u2014 Alan Kay',
  'All we have to decide is what to do with the time that is given us. \u2014 J.R.R. Tolkien',
  'Give me liberty, or give me death! \u2014 Patrick Henry',
  'Premature optimization is the root of all evil. \u2014 Donald Knuth',
  'I think, therefore I am. \u2014 Ren\u00e9 Descartes',
  'Knowledge itself is power. \u2014 Francis Bacon',
  'Power tends to corrupt, and absolute power corrupts absolutely. \u2014 Lord Acton',
  'Man is born free, and everywhere he is in chains. \u2014 Jean-Jacques Rousseau',
  'Computer science is no more about computers than astronomy is about telescopes. \u2014 Edsger Dijkstra',
  'Common sense is not so common. \u2014 Voltaire',
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
