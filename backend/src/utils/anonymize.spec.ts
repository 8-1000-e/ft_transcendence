import { authorView, isFtMember } from './anonymize';

const author = {
  name: 'Real Name',
  ftPfpUrl: 'https://cdn/real.jpg',
  campus: 'Paris',
  rdmName: 'Anon-1234',
  rdmPfp: 'https://cdn/anon.png',
  rdmCampus: null,
};

describe('authorView (anonymisation gate)', () => {
  it('shows the real identity to a 42 member (has ftId)', () => {
    expect(authorView({ ftId: 'ft-1' }, author)).toEqual({
      name: 'Real Name',
      ftPfpUrl: 'https://cdn/real.jpg',
      campus: 'Paris',
    });
  });

  it('anonymises for a non-42 user (ftId null)', () => {
    expect(authorView({ ftId: null }, author)).toEqual({
      name: 'Anon-1234',
      ftPfpUrl: 'https://cdn/anon.png',
      campus: null,
    });
  });

  it('anonymises for an unknown/deleted viewer (null) — default-deny', () => {
    expect(authorView(null, author)).toEqual({
      name: 'Anon-1234',
      ftPfpUrl: 'https://cdn/anon.png',
      campus: null,
    });
  });

  it('never leaks the real name or the raw ftId in the anon projection', () => {
    const view = authorView({ ftId: null }, author);
    expect(view.name).not.toBe('Real Name');
    expect(view).not.toHaveProperty('ftId');
  });

  it('isFtMember: false for null and non-42, true for 42', () => {
    expect(isFtMember(null)).toBe(false);
    expect(isFtMember({ ftId: null })).toBe(false);
    expect(isFtMember({ ftId: 'x' })).toBe(true);
  });
});
