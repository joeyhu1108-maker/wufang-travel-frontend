// Media ships with the site and resolves relative to its deployment directory.
export function assetUrl(name) {
  return `./media/${name}`;
}
