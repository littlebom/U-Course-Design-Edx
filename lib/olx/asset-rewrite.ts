const ASSET_RE = /asset:\/\/([A-Za-z0-9_.\-/]+)/g;

export function rewriteAssets(html: string): { html: string; refs: Set<string> } {
  const refs = new Set<string>();
  const out = html.replace(ASSET_RE, (_m, name: string) => {
    refs.add(name);
    return `/static/${name}`;
  });
  return { html: out, refs };
}
