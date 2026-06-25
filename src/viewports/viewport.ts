/**
 * Viewport domain: the sizes Argus renders a frontend at.
 *
 * Keeping presets and resolution logic here (instead of inside the tools) means
 * every tool resolves user input the same way, and new presets are added in one
 * place (Single Responsibility).
 */

export interface Viewport {
  readonly width: number;
  readonly height: number;
  /** Optional human-readable label surfaced in tool output (e.g. "mobile"). */
  readonly label?: string;
}

export type ViewportPreset = "mobile" | "tablet" | "laptop" | "desktop";

export const VIEWPORT_PRESETS: Readonly<Record<ViewportPreset, Viewport>> = {
  mobile: { width: 375, height: 667, label: "mobile" },
  tablet: { width: 768, height: 1024, label: "tablet" },
  laptop: { width: 1366, height: 768, label: "laptop" },
  desktop: { width: 1920, height: 1080, label: "desktop" },
};

/** Raw viewport request coming from a tool's input (a preset or a custom size). */
export interface ViewportInput {
  readonly preset?: ViewportPreset;
  readonly width?: number;
  readonly height?: number;
  readonly label?: string;
}

/**
 * Turns a {@link ViewportInput} into a concrete {@link Viewport}.
 *
 * Precedence: explicit width+height wins over a preset. If neither is provided
 * the `fallback` is used; without a fallback this throws, so callers that
 * require an explicit size get a clear validation error.
 */
export function resolveViewport(input: ViewportInput, fallback?: Viewport): Viewport {
  if (input.width !== undefined && input.height !== undefined) {
    return { width: input.width, height: input.height, label: input.label };
  }
  if (input.preset !== undefined) {
    const base = VIEWPORT_PRESETS[input.preset];
    return input.label !== undefined ? { ...base, label: input.label } : base;
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error("Each viewport must specify either a preset or both width and height.");
}

export function describeViewport(viewport: Viewport): string {
  return viewport.label !== undefined
    ? `${viewport.label} (${viewport.width}x${viewport.height})`
    : `${viewport.width}x${viewport.height}`;
}
