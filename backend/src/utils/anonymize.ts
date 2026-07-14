// Single source of truth for "which author identity is this viewer allowed to
// see". Default-deny: only a viewer with a linked 42 account (ftId) sees real 42
// identities; EVERYONE else — email/password-only users AND unknown/deleted
// accounts whose access token is still valid — sees the anonymous identity.
//
// Route every author display through `authorView` so a new read endpoint cannot
// silently leak real identities by forgetting or mis-writing the gate.

export interface AuthorSource {
  name: string | null;
  ftPfpUrl: string | null;
  campus: string | null;
  rdmName: string | null;
  rdmPfp: string | null;
  rdmCampus: string | null;
}

export interface PublicAuthor {
  name: string | null;
  ftPfpUrl: string | null;
  campus: string | null;
}

export function isFtMember(
  viewer: { ftId: string | null } | null | undefined,
): boolean {
  return !!viewer?.ftId;
}

export function authorView(
  viewer: { ftId: string | null } | null | undefined,
  author: AuthorSource,
): PublicAuthor {
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
