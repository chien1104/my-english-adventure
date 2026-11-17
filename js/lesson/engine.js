// 課程引擎（純邏輯，不碰畫面與資料庫，方便測試）
// 狀態可以存進 IndexedDB，之後用來「暫停／繼續」。

export const MAX_RETRY_PER_GROUP = 2;

// 把 words 步驟展開成一張張單字卡
export function expandLesson(lesson) {
  const steps = [];
  for (const step of lesson.steps) {
    if (step.kind === 'words') {
      step.wordIds.forEach((wordId, i) => {
        steps.push({ kind: 'word', title: `${step.title}（${i + 1}/${step.wordIds.length}）`, wordId });
      });
    } else {
      steps.push(step);
    }
  }
  return { ...lesson, steps };
}

export function normalizeText(s) {
  return String(s ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function isCorrect(q, answer) {
  if (answer === null || answer === undefined) return false;
  switch (q.type) {
    case 'choice':
      return answer === q.answer;
    case 'type': {
      const accepted = [q.answer, ...(q.accept || [])];
      return accepted.some((a) => normalizeText(a) === normalizeText(answer));
    }
    case 'order':
      return Array.isArray(answer) && answer.length === q.answer.length && answer.every((t, i) => t === q.answer[i]);
    default:
      return false;
  }
}

export function answerText(q, answer = q.answer) {
  if (answer === null || answer === undefined) return '（不知道）';
  if (q.type === 'order') return (Array.isArray(answer) ? answer.join(' ') : '') + (q.punct || '');
  return String(answer);
}

function findQuestion(step, id) {
  return (step.questions || []).find((q) => q.id === id) || (step.similar || []).find((q) => q.id === id) || null;
}

export function createState(lesson, now = Date.now()) {
  return {
    lessonId: lesson.id,
    stepIndex: 0,
    practice: {},
    status: 'in_progress',
    startedAt: now,
    updatedAt: now,
    completedAt: null,
  };
}

function freshPractice(step) {
  return { queue: step.questions.map((q) => q.id), pos: 0, answered: false, results: [], retries: {}, usedSimilar: [] };
}

// 教材更新後，舊的進度可能對不上：修正到安全的位置
export function reconcileState(lesson, saved) {
  if (!saved || saved.lessonId !== lesson.id) return createState(lesson);
  const s = structuredClone(saved);
  if (s.status === 'completed') return s;
  if (typeof s.stepIndex !== 'number' || s.stepIndex < 0) s.stepIndex = 0;
  if (s.stepIndex >= lesson.steps.length) s.stepIndex = lesson.steps.length - 1;
  s.practice = s.practice || {};
  for (const key of Object.keys(s.practice)) {
    const step = lesson.steps[key];
    const p = s.practice[key];
    const valid = step && step.kind === 'practice' && Array.isArray(p.queue) && p.queue.every((id) => findQuestion(step, id));
    if (!valid) delete s.practice[key];
  }
  return s;
}

export function currentStep(lesson, state) {
  return lesson.steps[state.stepIndex] || null;
}

export function practiceOf(lesson, state, index = state.stepIndex) {
  const step = lesson.steps[index];
  if (!step || step.kind !== 'practice') return null;
  return state.practice[index] || freshPractice(step);
}

export function currentQuestion(lesson, state) {
  const step = currentStep(lesson, state);
  const p = practiceOf(lesson, state);
  if (!p) return null;
  const id = p.queue[p.pos];
  return id ? findQuestion(step, id) : null;
}

// 已作答但還沒按「繼續」就離開時，用來還原作答結果
export function pendingResult(lesson, state) {
  const p = practiceOf(lesson, state);
  if (!p || !p.answered || !p.results.length) return null;
  const r = p.results[p.results.length - 1];
  const q = currentQuestion(lesson, state);
  if (!q || r.qid !== q.id) return null;
  return { correct: r.correct, question: q, followUp: r.followUp || null, answer: r.answer, correctText: answerText(q), yourText: answerText(q, r.answer) };
}

export function practiceProgress(lesson, state) {
  const p = practiceOf(lesson, state);
  if (!p) return null;
  return { current: Math.min(p.pos + 1, p.queue.length), total: p.queue.length };
}

// 作答：答錯時把同組的相似題（或同一題）排到後面再練
export function submitAnswer(lesson, state, answer, now = Date.now()) {
  const step = currentStep(lesson, state);
  if (!step || step.kind !== 'practice') throw new Error('目前不是練習題');
  const s = structuredClone(state);
  const p = s.practice[s.stepIndex] || freshPractice(step);
  s.practice[s.stepIndex] = p;
  if (p.answered) throw new Error('這題已經作答');

  const q = findQuestion(step, p.queue[p.pos]);
  const correct = isCorrect(q, answer);
  p.results.push({ qid: q.id, group: q.group, correct, answer, at: now });
  p.answered = true;

  let followUp = null;
  if (!correct) {
    const used = p.retries[q.group] || 0;
    if (used < MAX_RETRY_PER_GROUP) {
      const similar = (step.similar || []).find((x) => x.group === q.group && !p.usedSimilar.includes(x.id) && x.id !== q.id);
      if (similar) {
        p.usedSimilar.push(similar.id);
        p.queue.push(similar.id);
        followUp = 'similar';
      } else {
        p.queue.push(q.id);
        followUp = 'retry';
      }
      p.retries[q.group] = used + 1;
    }
  }
  p.results[p.results.length - 1].followUp = followUp;
  s.updatedAt = now;
  return { state: s, result: { correct, question: q, followUp, correctText: answerText(q), yourText: answerText(q, answer) } };
}

export function canAdvance(lesson, state) {
  const step = currentStep(lesson, state);
  if (!step) return false;
  if (step.kind !== 'practice') return true;
  const p = practiceOf(lesson, state);
  return p.answered;
}

export function advance(lesson, state, now = Date.now()) {
  if (!canAdvance(lesson, state)) throw new Error('請先作答');
  const s = structuredClone(state);
  const step = currentStep(lesson, s);
  if (step.kind === 'practice') {
    const p = s.practice[s.stepIndex];
    p.pos += 1;
    p.answered = false;
    if (p.pos < p.queue.length) { s.updatedAt = now; return s; }
  }
  s.stepIndex += 1;
  if (s.stepIndex >= lesson.steps.length) {
    s.stepIndex = lesson.steps.length - 1;
    s.status = 'completed';
    s.completedAt = now;
  }
  s.updatedAt = now;
  return s;
}

export function canGoBack(lesson, state) {
  if (state.stepIndex === 0 || state.status === 'completed') return false;
  const cur = currentStep(lesson, state);
  if (cur.kind === 'practice') {
    const p = practiceOf(lesson, state);
    if (p.pos > 0 || p.answered) return false;
  }
  const prev = lesson.steps[state.stepIndex - 1];
  return prev.kind !== 'practice' && prev.kind !== 'review';
}

export function goBack(lesson, state, now = Date.now()) {
  if (!canGoBack(lesson, state)) return state;
  const s = structuredClone(state);
  s.stepIndex -= 1;
  s.updatedAt = now;
  return s;
}

// 解析頁：列出前面所有練習題「第一次作答」的結果
export function reviewItems(lesson, state, uptoIndex = state.stepIndex) {
  const items = [];
  for (let i = 0; i < uptoIndex; i++) {
    const step = lesson.steps[i];
    if (step.kind !== 'practice' || !state.practice[i]) continue;
    for (const r of state.practice[i].results) {
      const q = findQuestion(step, r.qid);
      items.push({ question: q, correct: r.correct, yourText: answerText(q, r.answer), correctText: answerText(q), retry: !step.questions.some((m) => m.id === r.qid) });
    }
  }
  return items;
}

// 正確率：每個主題目第一次作答的結果
export function lessonStats(lesson, state) {
  let total = 0;
  let firstCorrect = 0;
  lesson.steps.forEach((step, i) => {
    if (step.kind !== 'practice') return;
    const p = state.practice[i];
    for (const q of step.questions) {
      total += 1;
      const first = p && p.results.find((r) => r.qid === q.id);
      if (first && first.correct) firstCorrect += 1;
    }
  });
  return { total, firstCorrect, accuracy: total ? Math.round((firstCorrect / total) * 100) : 0 };
}

export function stepLabel(lesson, state) {
  return `第 ${state.stepIndex + 1} / ${lesson.steps.length} 步`;
}
