/**
 * Tests for the scrcpy video stream parser.
 *
 * Verifies codec metadata parsing, frame header parsing,
 * NAL unit extraction, and SPS/PPS detection from H.264 streams.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import type { Num } from '@/schemas/common';
import {
  CODEC_H264,
  CODEC_H265,
  type CodecMetadata,
  type FrameHeader,
  parseCodecMetadata,
  parseFrameHeader,
  extractNalUnits,
  findSpsPps,
  type NalUnit,
  type SpsPps,
} from './scrcpy-video';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Build a codec metadata buffer (12 bytes, big-endian).
 *
 * @param codecId - Codec identifier (e.g., 0x68323634 for h264)
 * @param width - Video width
 * @param height - Video height
 * @returns 12-byte Buffer
 */
function buildCodecMetadata(codecId: Num, width: Num, height: Num): Buffer {
  const buf: Buffer = Buffer.alloc(12);
  buf.writeUInt32BE(codecId as number, 0);
  buf.writeUInt32BE(width as number, 4);
  buf.writeUInt32BE(height as number, 8);
  return buf;
}

/**
 * Build a frame header buffer (12 bytes, big-endian).
 *
 * Bit layout of first 8 bytes:
 * - bit 63: config flag (1 = SPS/PPS config, 0 = video frame)
 * - bit 62: keyframe flag
 * - bits 61..0: PTS in microseconds
 *
 * @param pts - Presentation timestamp in microseconds
 * @param packetSize - Size of the following NAL data
 * @param isConfig - Whether this is a config frame (SPS/PPS)
 * @param isKeyframe - Whether this is a keyframe
 * @returns 12-byte Buffer
 */
function buildFrameHeader(
  pts: bigint,
  packetSize: Num,
  isConfig: boolean,
  isKeyframe: boolean,
): Buffer {
  const buf: Buffer = Buffer.alloc(12);

  // Pack flags into top 2 bits of the 64-bit PTS field
  let ptsWithFlags: bigint = pts & 0x3f_ff_ff_ff_ff_ff_ff_ffn;
  if (isConfig) {
    ptsWithFlags |= 1n << 63n;
  }
  if (isKeyframe) {
    ptsWithFlags |= 1n << 62n;
  }

  buf.writeBigUInt64BE(ptsWithFlags, 0);
  buf.writeUInt32BE(packetSize as number, 8);
  return buf;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('scrcpy-video', (): void => {
  /* ---------------------------------------------------------------- */
  /*  Constants                                                        */
  /* ---------------------------------------------------------------- */

  it('exports H.264 codec constant', (): void => {
    // 'h264' as ASCII → 0x68323634
    expect(CODEC_H264).toBe(0x68_32_36_34 as Num);
  });

  it('exports H.265 codec constant', (): void => {
    // 'h265' as ASCII → 0x68323635
    expect(CODEC_H265).toBe(0x68_32_36_35 as Num);
  });

  /* ---------------------------------------------------------------- */
  /*  Codec metadata parsing                                           */
  /* ---------------------------------------------------------------- */

  it('parses H.264 codec metadata from 12-byte buffer', (): void => {
    const buf: Buffer = buildCodecMetadata(0x68_32_36_34 as Num, 1080 as Num, 1920 as Num);
    const meta: CodecMetadata = parseCodecMetadata(buf);

    expect(meta.codecId).toBe(0x68_32_36_34 as Num);
    expect(meta.width).toBe(1080 as Num);
    expect(meta.height).toBe(1920 as Num);
  });

  it('parses H.265 codec metadata', (): void => {
    const buf: Buffer = buildCodecMetadata(0x68_32_36_35 as Num, 3840 as Num, 2160 as Num);
    const meta: CodecMetadata = parseCodecMetadata(buf);

    expect(meta.codecId).toBe(0x68_32_36_35 as Num);
    expect(meta.width).toBe(3840 as Num);
    expect(meta.height).toBe(2160 as Num);
  });

  it('throws on buffer too small for codec metadata', (): void => {
    const buf: Buffer = Buffer.alloc(8);
    expect((): CodecMetadata => parseCodecMetadata(buf)).toThrow();
  });

  /* ---------------------------------------------------------------- */
  /*  Frame header parsing                                             */
  /* ---------------------------------------------------------------- */

  it('parses a regular frame header (no flags)', (): void => {
    const buf: Buffer = buildFrameHeader(1000n, 5000 as Num, false, false);
    const header: FrameHeader = parseFrameHeader(buf);

    expect(header.pts).toBe(1000n);
    expect(header.packetSize).toBe(5000 as Num);
    expect(header.isConfig).toBe(false);
    expect(header.isKeyframe).toBe(false);
  });

  it('parses a keyframe header', (): void => {
    const buf: Buffer = buildFrameHeader(2000n, 10_000 as Num, false, true);
    const header: FrameHeader = parseFrameHeader(buf);

    expect(header.pts).toBe(2000n);
    expect(header.packetSize).toBe(10_000 as Num);
    expect(header.isConfig).toBe(false);
    expect(header.isKeyframe).toBe(true);
  });

  it('parses a config frame header (SPS/PPS)', (): void => {
    const buf: Buffer = buildFrameHeader(0n, 30 as Num, true, false);
    const header: FrameHeader = parseFrameHeader(buf);

    expect(header.pts).toBe(0n);
    expect(header.packetSize).toBe(30 as Num);
    expect(header.isConfig).toBe(true);
    expect(header.isKeyframe).toBe(false);
  });

  it('parses config + keyframe combined flags', (): void => {
    const buf: Buffer = buildFrameHeader(500n, 100 as Num, true, true);
    const header: FrameHeader = parseFrameHeader(buf);

    expect(header.isConfig).toBe(true);
    expect(header.isKeyframe).toBe(true);
    expect(header.pts).toBe(500n);
  });

  it('throws on buffer too small for frame header', (): void => {
    const buf: Buffer = Buffer.alloc(8);
    expect((): FrameHeader => parseFrameHeader(buf)).toThrow();
  });

  /* ---------------------------------------------------------------- */
  /*  NAL unit extraction                                              */
  /* ---------------------------------------------------------------- */

  it('extracts NAL units from Annex B byte stream', (): void => {
    // Annex B format: 0x00000001 <NAL> 0x00000001 <NAL>
    const nal1: Buffer = Buffer.from([0x67, 0x42, 0x00, 0x1e]); // SPS
    const nal2: Buffer = Buffer.from([0x68, 0x01, 0x02]); // PPS
    const data: Buffer = Buffer.concat([
      Buffer.from([0x00, 0x00, 0x00, 0x01]),
      nal1,
      Buffer.from([0x00, 0x00, 0x00, 0x01]),
      nal2,
    ]);

    const units: NalUnit[] = extractNalUnits(data);
    expect(units.length).toBe(2);
    expect(units[0]!.type).toBe(7 as Num); // SPS NAL type = 7
    expect(units[1]!.type).toBe(8 as Num); // PPS NAL type = 8
  });

  it('extracts NAL units with 3-byte start code', (): void => {
    // 3-byte start code: 0x000001
    const nal1: Buffer = Buffer.from([0x65, 0xaa, 0xbb]); // IDR slice
    const data: Buffer = Buffer.concat([Buffer.from([0x00, 0x00, 0x01]), nal1]);

    const units: NalUnit[] = extractNalUnits(data);
    expect(units.length).toBe(1);
    expect(units[0]!.type).toBe(5 as Num); // IDR NAL type = 5
  });

  it('returns empty array for empty buffer', (): void => {
    const units: NalUnit[] = extractNalUnits(Buffer.alloc(0));
    expect(units.length).toBe(0);
  });

  it('handles single NAL unit without trailing start code', (): void => {
    const data: Buffer = Buffer.concat([
      Buffer.from([0x00, 0x00, 0x00, 0x01]),
      Buffer.from([0x67, 0x42, 0x00, 0x1e, 0xff]),
    ]);

    const units: NalUnit[] = extractNalUnits(data);
    expect(units.length).toBe(1);
    expect(units[0]!.data.length).toBe(5);
  });

  /* ---------------------------------------------------------------- */
  /*  SPS/PPS detection                                                */
  /* ---------------------------------------------------------------- */

  it('finds SPS and PPS from NAL units', (): void => {
    const spsData: Buffer = Buffer.from([0x67, 0x42, 0x00, 0x1e, 0xab]);
    const ppsData: Buffer = Buffer.from([0x68, 0x01, 0x02]);
    const data: Buffer = Buffer.concat([
      Buffer.from([0x00, 0x00, 0x00, 0x01]),
      spsData,
      Buffer.from([0x00, 0x00, 0x00, 0x01]),
      ppsData,
    ]);

    const result: SpsPps | undefined = findSpsPps(data);
    expect(result).toBeDefined();
    expect(result!.sps).toEqual(spsData);
    expect(result!.pps).toEqual(ppsData);
  });

  it('returns undefined when SPS is missing', (): void => {
    const ppsData: Buffer = Buffer.from([0x68, 0x01, 0x02]);
    const data: Buffer = Buffer.concat([Buffer.from([0x00, 0x00, 0x00, 0x01]), ppsData]);

    const result: SpsPps | undefined = findSpsPps(data);
    expect(result).toBeUndefined();
  });

  it('returns undefined when PPS is missing', (): void => {
    const spsData: Buffer = Buffer.from([0x67, 0x42, 0x00, 0x1e]);
    const data: Buffer = Buffer.concat([Buffer.from([0x00, 0x00, 0x00, 0x01]), spsData]);

    const result: SpsPps | undefined = findSpsPps(data);
    expect(result).toBeUndefined();
  });

  it('returns undefined for empty buffer', (): void => {
    const result: SpsPps | undefined = findSpsPps(Buffer.alloc(0));
    expect(result).toBeUndefined();
  });

  it('extracts SPS/PPS even with other NAL types present', (): void => {
    const spsData: Buffer = Buffer.from([0x67, 0x42, 0x00, 0x1e]);
    const ppsData: Buffer = Buffer.from([0x68, 0x01]);
    const idrData: Buffer = Buffer.from([0x65, 0xaa, 0xbb, 0xcc]);
    const data: Buffer = Buffer.concat([
      Buffer.from([0x00, 0x00, 0x00, 0x01]),
      spsData,
      Buffer.from([0x00, 0x00, 0x00, 0x01]),
      ppsData,
      Buffer.from([0x00, 0x00, 0x00, 0x01]),
      idrData,
    ]);

    const result: SpsPps | undefined = findSpsPps(data);
    expect(result).toBeDefined();
    expect(result!.sps).toEqual(spsData);
    expect(result!.pps).toEqual(ppsData);
  });
});
