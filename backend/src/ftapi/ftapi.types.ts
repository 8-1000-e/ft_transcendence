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

export interface FtProject {
  id: number;
  name: string;
  slug: string;
  exam?: boolean;
  parent?: { id: number; slug: string } | null;
}

export interface FtCursus {
  id: number;
  name: string;
}
