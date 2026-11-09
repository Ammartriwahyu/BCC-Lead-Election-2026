/**
 * Set while a sign-out is in progress, so the 401s that follow (queries refetching after the
 * cookie is gone) are not mistaken for an expired session.
 */
let ending = false;

export function markSessionEnding(): void {
  ending = true;
}

export function clearSessionEnding(): void {
  ending = false;
}

export function isSessionEnding(): boolean {
  return ending;
}
