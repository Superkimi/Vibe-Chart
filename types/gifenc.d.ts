declare module "gifenc" {
  export type GifPalette = Array<[number, number, number]>;

  export type GifEncoder = {
    writeFrame: (
      indexedPixels: Uint8Array,
      width: number,
      height: number,
      options: {
        palette: GifPalette;
        delay?: number;
        repeat?: number;
      },
    ) => void;
    finish: () => void;
    bytes: () => Uint8Array;
  };

  export function GIFEncoder(options?: {
    initialCapacity?: number;
    auto?: boolean;
  }): GifEncoder;
  export function quantize(
    rgba: Uint8Array,
    maxColors: number,
    options?: Record<string, unknown>,
  ): GifPalette;
  export function applyPalette(
    rgba: Uint8Array,
    palette: GifPalette,
    format?: "rgb565" | "rgb444" | "rgba4444",
  ): Uint8Array;
}
