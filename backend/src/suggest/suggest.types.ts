export interface SuggestedUser {
  id: string;
  isGroupe: boolean;
  users: userInfo[];
  final_mark: number | null;
  marked_at: string | null;
}

export interface userInfo {
  id: string;
  login: string;
  name: string | null;
  ppurl: string | null;
  location: string | null;
  last_connexion: string | null;
}

export interface FtProjectUser {
  final_mark: number | null;
  marked_at: string | null;
  status: string;
  'validated?': boolean | null;
  current_team_id: number | null;
  user: {
    id: number;
    login: string;
    url: string;
    displayname?: string | null;
    usual_full_name?: string | null;
    image?: { link?: string };
  };
}

export interface FtLocation {
  host: string | null;
  begin_at: string;
  end_at: string | null;
  user: {
    id: number;
  };
}
