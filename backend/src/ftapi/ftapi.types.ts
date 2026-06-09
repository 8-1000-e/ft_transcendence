// Type minimal pour la réponse OAuth "client_credentials" de 42.
// On ne garde ici que les champs dont notre client API a besoin.
export interface FtTokenResponse {
  access_token: string;
  expires_in: number;
}

export interface FtProfile {
  id: number;
  login: string;
  email: string;
  image: { link: string };
  campus: { name: string }[];
}

export interface FtTeam {
  id: number;
  name: string;
  project_id: number;
  users: { id: number }[];
  'validated?': boolean | null;
}

export interface FtProject {
  name: string;
}
