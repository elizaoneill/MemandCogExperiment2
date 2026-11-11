'use strict';

const WORD_LISTS = [
  ['apple', 'ladder', 'candle', 'rabbit', 'window', 'hammer'],
  ['garden', 'pencil', 'turtle', 'basket', 'cloud', 'button'],
  ['bottle', 'mountain', 'orange', 'blanket', 'guitar', 'ticket']
];

// Add common variants/near-spellings where meaning is unambiguous.
// The canonical word remains the word shown and the value recorded in the trial CSV.
const ALIASES = {
  apple: ['aple'], ladder: ['lader'], candle: ['candel'], rabbit: ['rabit'],
  window: ['wind ow', 'windw'], hammer: ['hamer'], garden: ['gardn'],
  pencil: ['pensil'], turtle: ['turtel'], basket: ['baskit'],
  bottle: ['bottel'], mountain: ['mountin'], orange: ['oranj'],
  blanket: ['blanket'], guitar: ['gitar'], ticket: ['tiket']
};

const STRATEGIES = [
  {
    id: 'maintenance_rehearsal',
    name: 'Maintenance rehearsal',
    instructions: 'Repeat the word silently in your mind over and over. Focus on keeping the word active in your memory. Do not try to connect it to yourself or create a mental picture.'
  },
  {
    id: 'self_reference',
    name: 'Self-reference',
    instructions: 'Think about how the word relates to you personally. For example, ask yourself whether you own it, use it, like it, or have an experience connected to it.'
  },
  {
    id: 'mental_imagery',
    name: 'Mental imagery',
    instructions: 'Create a clear mental picture of the word. Imagine what it looks like, including its shape, color, size, or setting.'
  }
];

const WORD_DURATION_MS = 3000;
const DISTRACTOR_SECONDS = 30;

const sections = ['welcome', 'instructions', 'study', 'distractor', 'recall', 'results'];
const $ = id => document.getElementById(id);
let session = null;
let blockIndex = 0;
let wordIndex = 0;
let distractorInterval = null;
let remainingSeconds = DISTRACTOR_SECONDS;
let currentExpectedNumber = null;
let countEntries = [];

function showSection(name) {
  sections.forEach(section => $(section).classList.toggle('hidden', section !== name));
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeSession() {
  const strategies = shuffle(STRATEGIES);
  const lists = shuffle(WORD_LISTS);
  const trials = [];
  strategies.forEach((strategy, sIndex) => {
    lists[sIndex].forEach((word, wIndex) => {
      trials.push({
        strategy_id: strategy.id,
        strategy: strategy.name,
        list_id: WORD_LISTS.indexOf(lists[sIndex]) + 1,
        word,
        position_in_block: wIndex + 1,
        recalled: false,
        matched_response: ''
      });
    });
  });
  return {
    session_id: `S${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    participant_code: $('participantId').value.trim(),
    started_at: new Date().toISOString(),
    strategies,
    trials,
    recall_responses: [],
    distractor_start: null,
    distractor_entries: [],
    completed_at: null
  };
}

$('startBtn').addEventListener('click', () => {
  session = makeSession();
  blockIndex = 0;
  showInstructions();
});

function showInstructions() {
  const strategy = session.strategies[blockIndex];
  $('blockCounter').textContent = `BLOCK ${blockIndex + 1} OF 3`;
  $('strategyTitle').textContent = strategy.name;
  $('strategyDescription').textContent = strategy.instructions;
  showSection('instructions');
}

$('beginBlockBtn').addEventListener('click', () => {
  wordIndex = 0;
  showSection('study');
  showNextWord();
});

function showNextWord() {
  const strategy = session.strategies[blockIndex];
  const blockTrials = session.trials.filter(t => t.strategy_id === strategy.id);
  if (wordIndex >= blockTrials.length) {
    blockIndex++;
    if (blockIndex < session.strategies.length) showInstructions();
    else startDistractor();
    return;
  }
  const trial = blockTrials[wordIndex];
  $('studyProgress').textContent = `${strategy.name.toUpperCase()} · WORD ${wordIndex + 1} OF 6`;
  $('wordDisplay').textContent = trial.word;
  wordIndex++;
  setTimeout(() => {
    $('wordDisplay').textContent = '+';
    setTimeout(showNextWord, 450);
  }, WORD_DURATION_MS);
}

function startDistractor() {
  remainingSeconds = DISTRACTOR_SECONDS;
  currentExpectedNumber = Math.floor(Math.random() * 800) + 200;
  session.distractor_start = currentExpectedNumber;
  countEntries = [];
  $('startingNumber').textContent = currentExpectedNumber;
  $('timer').textContent = remainingSeconds;
  $('countInput').value = '';
  $('countFeedback').textContent = '';
  showSection('distractor');
  $('countInput').focus();
  distractorInterval = setInterval(() => {
    remainingSeconds--;
    $('timer').textContent = remainingSeconds;
    if (remainingSeconds <= 0) {
      clearInterval(distractorInterval);
      session.distractor_entries = countEntries;
      showSection('recall');
      $('recallInput').focus();
    }
  }, 1000);
}

function submitCount() {
  const raw = $('countInput').value.trim();
  if (!raw) return;
  const entered = Number(raw);
  const expected = currentExpectedNumber - 3;
  const correct = entered === expected;
  countEntries.push({ entered, expected, correct, elapsed_seconds: DISTRACTOR_SECONDS - remainingSeconds });
  currentExpectedNumber = entered;
  $('countFeedback').textContent = correct ? 'Correct. Keep going!' : 'Recorded. Keep counting backward by 3.';
  $('countInput').value = '';
  $('countInput').focus();
}
$('submitCountBtn').addEventListener('click', submitCount);
$('countInput').addEventListener('keydown', event => {
  if (event.key === 'Enter') submitCount();
});

function normalize(text) {
  return text.toLowerCase().trim().replace(/[^a-z]/g, '');
}

function levenshtein(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const old = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = old;
    }
  }
  return row[b.length];
}

function findMatch(response, availableTrials) {
  const clean = normalize(response);
  if (!clean) return null;
  for (const trial of availableTrials) {
    const target = normalize(trial.word);
    const aliases = (ALIASES[trial.word] || []).map(normalize);
    if (clean === target || aliases.includes(clean)) return trial;
  }
  // Accept a one-character typo for words of at least five letters.
  const close = availableTrials.filter(t => normalize(t.word).length >= 5 &&
    levenshtein(clean, normalize(t.word)) === 1);
  return close.length === 1 ? close[0] : null;
}

$('submitRecallBtn').addEventListener('click', () => {
  const responses = $('recallInput').value.split(/\n|,|;/).map(s => s.trim()).filter(Boolean);
  session.recall_responses = responses;
  session.trials.forEach(t => { t.recalled = false; t.matched_response = ''; });
  const available = [...session.trials];
  responses.forEach(response => {
    const match = findMatch(response, available);
    if (match) {
      match.recalled = true;
      match.matched_response = response;
      available.splice(available.indexOf(match), 1);
    }
  });
  session.completed_at = new Date().toISOString();
  showResults();
});

function showResults() {
  const results = session.strategies.map(strategy => {
    const trials = session.trials.filter(t => t.strategy_id === strategy.id);
    return { name: strategy.name, correct: trials.filter(t => t.recalled).length, total: trials.length };
  });
  const totalCorrect = session.trials.filter(t => t.recalled).length;
  $('resultIntro').textContent = `You recalled ${totalCorrect} of 18 words (${Math.round(totalCorrect / 18 * 100)}%).`;
  const highestScore = Math.max(...results.map(r => r.correct));
  const comparison = results.map(r => {
    const percent = Math.round((r.correct / r.total) * 100);
    const bestClass = r.correct === highestScore ? ' best' : '';
    return `<div class="result-bar-row">
      <div class="result-bar-label"><span>${r.name}</span><strong>${r.correct} / ${r.total} (${percent}%)</strong></div>
      <div class="result-bar-track" role="progressbar" aria-label="${r.name} recall score" aria-valuemin="0" aria-valuemax="6" aria-valuenow="${r.correct}">
        <div class="result-bar-fill${bestClass}" style="width: ${percent}%"></div>
      </div>
    </div>`;
  }).join('');
  $('scoreResults').innerHTML = `<div class="results-chart">
    <p class="chart-heading">Recall by encoding strategy</p>
    ${comparison}
    <p class="result-bar-note">Each bar represents the percentage of the six words recalled from that strategy. This comparison is descriptive and does not by itself establish a statistically significant difference.</p>
  </div>` + results.map(r =>
    `<div class="score-row"><span>${r.name}</span><strong>${r.correct} / ${r.total} words recalled</strong></div>`
  ).join('');
  showSection('results');
}

function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCSV(filename, headers, rows) {
  const csv = [headers, ...rows].map(row => row.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

$('summaryDownloadBtn').addEventListener('click', () => {
  const counts = {};
  session.strategies.forEach(s => {
    const ts = session.trials.filter(t => t.strategy_id === s.id);
    counts[s.id] = ts.filter(t => t.recalled).length;
  });
  const headers = [
    'session_id', 'participant_code', 'started_at', 'completed_at',
    'strategy_order', 'maintenance_rehearsal_recalled', 'self_reference_recalled',
    'mental_imagery_recalled', 'total_recalled', 'total_studied',
    'distractor_start_number', 'distractor_entries'
  ];
  const row = [
    session.session_id, session.participant_code, session.started_at, session.completed_at,
    session.strategies.map(s => s.name).join(' > '),
    counts.maintenance_rehearsal, counts.self_reference, counts.mental_imagery,
    session.trials.filter(t => t.recalled).length, 18, session.distractor_start,
    session.distractor_entries.length
  ];
  downloadCSV('memory_experiment_summary.csv', headers, [row]);
});

$('trialDownloadBtn').addEventListener('click', () => {
  const headers = [
    'session_id', 'participant_code', 'strategy_order', 'strategy_id', 'strategy',
    'word_list_id', 'word', 'position_in_block', 'recalled', 'matched_response'
  ];
  const order = session.strategies.map(s => s.name).join(' > ');
  const rows = session.trials.map(t => [
    session.session_id, session.participant_code, order, t.strategy_id, t.strategy,
    t.list_id, t.word, t.position_in_block, t.recalled ? 1 : 0, t.matched_response
  ]);
  downloadCSV('memory_experiment_trials.csv', headers, rows);
});

$('restartBtn').addEventListener('click', () => {
  if (distractorInterval) clearInterval(distractorInterval);
  $('participantId').value = '';
  $('recallInput').value = '';
  showSection('welcome');
});
