/**
 * Default-deny projection of an author's identity: only 42 members (truthy `ftId`)
 * see the real identity; everyone else — non-42 and unauthenticated viewers — sees
 * the pre-generated anonymised `rdm*` identity. Fail closed.
 */

export type Viewer = { ftId: string | null } | null | undefined;

export interface AuthorIdentity {
  name: string;
  ftPfpUrl: string | null;
  campus: string | null;
  rdmName: string | null;
  rdmPfp: string | null;
  rdmCampus: string | null;
}

export interface PublicIdentity {
  name: string | null;
  ftPfpUrl: string | null;
  campus: string | null;
}

export function isFtMember(viewer: Viewer): boolean {
  return !!viewer?.ftId;
}

/** 42 member → real identity; anyone else → anonymised `rdm*`. */
export function authorView(
  viewer: Viewer,
  author: AuthorIdentity,
): PublicIdentity {
  if (isFtMember(viewer)) {
    return {
      name: author.name,
      ftPfpUrl: author.ftPfpUrl,
      campus: author.campus,
    };
  }
  return {
    name: author.rdmName,
    ftPfpUrl: author.rdmPfp,
    campus: author.rdmCampus,
  };
}
