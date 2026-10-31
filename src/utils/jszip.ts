type JSZipStatic = typeof import('jszip');
export type JSZipInstance = ReturnType<JSZipStatic>;

let loader: Promise<JSZipStatic> | null = null;

/**
 * Lazily loads the JSZip runtime the first time an archive actually needs to be
 * parsed. ZIP handling is a cold path (only used for `.zip` drops and GitHub
 * zipballs), so keeping it out of the entry chunk saves ~100 KB on first paint.
 */
export const getJSZip = (): Promise<JSZipStatic> => {
  if (!loader) {
    loader = import('jszip').then((mod) => {
      // JSZip is CommonJS: bundlers expose the class on `.default`.
      const ns = mod as unknown as { default?: JSZipStatic };
      return (ns.default ?? (mod as unknown as JSZipStatic)) as JSZipStatic;
    });
  }
  return loader;
};
