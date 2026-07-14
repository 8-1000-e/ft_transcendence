/**
 * anonymize.ts — default-deny projection of an author's identity for a viewer.
 *
 * ACCOUNT MODEL: a viewer is a "42 member" iff its account carries a truthy
 * `ftId` (i.e. it is linked to a 42 account). Only 42 members may see an
 * author's REAL identity. Everyone else — non-42 accounts AND unauthenticated
 * (null/undefined) viewers — sees the pre-generated anonymised `rdm*` identity.
 *
 * Fail closed: anything that is not clearly a 42 member is anonymised.
 */

/** Minimal viewer shape needed to decide 42-membership. */
export type Viewer = { ftId: string | null } | null | undefined;

/** The author fields we read from. `rdm*` are the stable anon values. */
export interface AuthorIdentity {
  name: string;
  ftPfpUrl: string | null;
  campus: string | null;
  rdmName: string | null;
  rdmPfp: string | null;
  rdmCampus: string | null;
}

/** The public identity actually exposed to a given viewer. */
export interface PublicIdentity {
  name: string | null;
  ftPfpUrl: string | null;
  campus: string | null;
}

/** True only when the viewer exists and has a linked 42 account (`ftId`). */
export function isFtMember(viewer: Viewer): boolean {
  return !!viewer?.ftId;
}

/**
 * Project `author`'s identity for `viewer`.
 * 42 member → real identity; anyone else → anonymised `rdm*` identity.
 */
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
