export interface FtTokenResponse {
  access_token: string;
  expires_in: number;
}

export interface FtProfile {
  id: number;
  login: string;
  email: string;
  image?: { link?: string };
  campus?: { name: string; id: number }[];
}

export interface FtTeam {
  id: number;
  name: string;
  project_id: number;
  users: { id: number }[];
  'validated?': boolean | null;
}

// Raw shape of `v2/users?filter[id]=…`, and the trimmed view we expose.
export interface FtUserSummary {
  id: number;
  login: string;
  displayname?: string | null;
  usual_full_name?: string | null;
  image?: { link?: string };
}

export interface FtMember {
  ftId: string;
  login: string;
  name: string;
  ppUrl: string | null;
}

// Carries the upstream HTTP status so callers can answer 4xx with 4xx instead of
// turning every 42-API failure into a 500. Still an Error — existing generic
// `catch` blocks behave exactly as before.
export class FtApiError extends Error {
  constructor(readonly status: number) {
    super(`42 API request failed with status ${status}`);
    this.name = 'FtApiError';
  }
}

// An open session on a campus workstation (`host` = the seat, e.g. "e1r2p3").
export interface FtActiveLocation {
  host: string | null;
  user: { id: number };
}

export interface FtProject {
  id: number;
  name: string;
  slug: string;
  exam?: boolean;
  parent?: { id: number; slug: string } | null;
}
