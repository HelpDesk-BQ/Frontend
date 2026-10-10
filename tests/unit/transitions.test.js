import { ALLOWED_TRANSITIONS, nextStates } from '../../public/js/transitions.js';

describe('ticket transitions (espelho do backend)', () => {
  test('exposes the allowed map', () => {
    expect(ALLOWED_TRANSITIONS).toEqual({
      open: ['analysis'],
      analysis: ['in_progress'],
      in_progress: ['resolved'],
      resolved: ['closed', 'in_progress'],
      closed: [],
    });
  });

  test.each([
    ['open', ['analysis']],
    ['analysis', ['in_progress']],
    ['in_progress', ['resolved']],
    ['resolved', ['closed', 'in_progress']],
    ['closed', []],
    ['archived', []],
  ])('nextStates(%s) → %p', (from, expected) => {
    expect(nextStates(from)).toEqual(expected);
  });

  test('returns a copy', () => {
    const states = nextStates('open');
    states.push('closed');
    expect(nextStates('open')).toEqual(['analysis']);
  });
});
