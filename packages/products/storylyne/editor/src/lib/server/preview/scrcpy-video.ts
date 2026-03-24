/**
 * scrcpy video stream parser.
 *
 * Parses the binary video stream from scrcpy's video socket:
 * 1. Codec metadata header (12 bytes): codec ID, width, height
 * 2. Per-frame headers (12 bytes): PTS, flags, packet size
 * 3. Raw H.264/H.265 NAL units in Annex B byte stream format
 *
 * Also provides NAL unit extraction and SPS/PPS detection for
 * initializing WebCodecs VideoDecoder on the client.
 *
 * @module
 */

import type { Num } from '@/schemas/common';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** H.264 codec ID — ASCII 'h264' = 0x68323634. */
export const CODEC_H264: Num = 0x68_32_36_34 as Num;

/** H.265 codec ID — ASCII 'h265' = 0x68323635. */
export const CODEC_H265: Num = 0x68_32_36_35 as Num;

/** Size of the codec metadata header in bytes. */
const CODEC_METADATA_SIZE: Num = 12 as Num;

/** Size of each frame header in bytes. */
const FRAME_HEADER_SIZE: Num = 12 as Num;

/** H.264 NAL type for Sequence Parameter Set. */
const NAL_TYPE_SPS: Num = 7 as Num;

/** H.264 NAL type for Picture Parameter Set. */
const NAL_TYPE_PPS: Num = 8 as Num;

/** Bitmask for config flag (bit 63). */
const CONFIG_FLAG: bigint = 1n << 63n;

/** Bitmask for keyframe flag (bit 62). */
const KEYFRAME_FLAG: bigint = 1n << 62n;

/** Bitmask for PTS (lower 62 bits). */
const PTS_MASK: bigint = 0x3f_ff_ff_ff_ff_ff_ff_ffn;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Parsed codec metadata from the video stream header. */
export type CodecMetadata = {
  /** Codec identifier (CODEC_H264 or CODEC_H265). */
  codecId: Num;
  /** Video width in pixels. */
  width: Num;
  /** Video height in pixels. */
  height: Num;
};

/** Parsed frame header preceding each NAL unit packet. */
export type FrameHeader = {
  /** Presentation timestamp in microseconds. */
  pts: bigint;
  /** Size of the NAL data following this header. */
  packetSize: Num;
  /** True if this frame contains SPS/PPS configuration data. */
  isConfig: boolean;
  /** True if this frame is a keyframe (IDR). */
  isKeyframe: boolean;
};

/** A single NAL unit extracted from an Annex B byte stream. */
export type NalUnit = {
  /** NAL unit type (lower 5 bits of first byte). */
  type: Num;
  /** Raw NAL unit data including the type byte. */
  data: Buffer;
};

/** SPS and PPS parameter sets extracted from H.264 stream. */
export type SpsPps = {
  /** Sequence Parameter Set NAL unit (including type byte). */
  sps: Buffer;
  /** Picture Parameter Set NAL unit (including type byte). */
  pps: Buffer;
};

/* ------------------------------------------------------------------ */
/*  Codec metadata parsing                                             */
/* ------------------------------------------------------------------ */

/**
 * Parse the 12-byte codec metadata header from the video stream.
 *
 * Layout (big-endian):
 * - bytes 0-3: codec ID (e.g., 0x68323634 for 'h264')
 * - bytes 4-7: video width
 * - bytes 8-11: video height
 *
 * @param buf - Buffer containing at least 12 bytes
 * @returns Parsed codec metadata
 * @throws Error if buffer is too small
 */
export function parseCodecMetadata(buf: Buffer): CodecMetadata {
  if (buf.length < (CODEC_METADATA_SIZE as number)) {
    throw new Error(`Codec metadata requires ${CODEC_METADATA_SIZE} bytes, got ${buf.length}`);
  }

  return {
    codecId: buf.readUInt32BE(0) as Num,
    width: buf.readUInt32BE(4) as Num,
    height: buf.readUInt32BE(8) as Num,
  };
}

/* ------------------------------------------------------------------ */
/*  Frame header parsing                                               */
/* ------------------------------------------------------------------ */

/**
 * Parse a 12-byte frame header from the video stream.
 *
 * Layout (big-endian):
 * - bytes 0-7: 64-bit field
 *   - bit 63: config flag (SPS/PPS data)
 *   - bit 62: keyframe flag (IDR frame)
 *   - bits 61-0: PTS in microseconds
 * - bytes 8-11: packet size (u32)
 *
 * @param buf - Buffer containing at least 12 bytes
 * @returns Parsed frame header
 * @throws Error if buffer is too small
 */
export function parseFrameHeader(buf: Buffer): FrameHeader {
  if (buf.length < (FRAME_HEADER_SIZE as number)) {
    throw new Error(`Frame header requires ${FRAME_HEADER_SIZE} bytes, got ${buf.length}`);
  }

  const raw: bigint = buf.readBigUInt64BE(0);

  return {
    isConfig: (raw & CONFIG_FLAG) !== 0n,
    isKeyframe: (raw & KEYFRAME_FLAG) !== 0n,
    pts: raw & PTS_MASK,
    packetSize: buf.readUInt32BE(8) as Num,
  };
}

/* ------------------------------------------------------------------ */
/*  NAL unit extraction                                                */
/* ------------------------------------------------------------------ */

/**
 * Find all Annex B start code positions in a buffer.
 *
 * Scans for both 4-byte (0x00000001) and 3-byte (0x000001)
 * start codes used in H.264 Annex B byte stream format.
 *
 * @param data - Buffer containing H.264 Annex B data
 * @returns Array of { offset, length } for each start code
 */
function findStartCodes(data: Buffer): Array<{ offset: Num; length: Num }> {
  const positions: Array<{ offset: Num; length: Num }> = [];
  let i: number = 0;

  while (i < data.length - 2) {
    // Check for 4-byte start code: 0x00 0x00 0x00 0x01
    if (
      i < data.length - 3 &&
      data[i] === 0x00 &&
      data[i + 1] === 0x00 &&
      data[i + 2] === 0x00 &&
      data[i + 3] === 0x01
    ) {
      positions.push({ offset: i as Num, length: 4 as Num });
      i += 4;
      continue;
    }

    // Check for 3-byte start code: 0x00 0x00 0x01
    if (data[i] === 0x00 && data[i + 1] === 0x00 && data[i + 2] === 0x01) {
      positions.push({ offset: i as Num, length: 3 as Num });
      i += 3;
      continue;
    }

    i++;
  }

  return positions;
}

/**
 * Extract individual NAL units from an Annex B byte stream.
 *
 * Splits the data at Annex B start codes (0x00000001 or 0x000001)
 * and returns each NAL unit with its type (lower 5 bits of first byte).
 *
 * @param data - Buffer containing H.264 Annex B data
 * @returns Array of extracted NAL units
 */
export function extractNalUnits(data: Buffer): NalUnit[] {
  if (data.length === 0) {
    return [];
  }

  const startCodes = findStartCodes(data);
  if (startCodes.length === 0) {
    return [];
  }

  const units: NalUnit[] = [];

  for (let i: number = 0; i < startCodes.length; i++) {
    const sc = startCodes[i];
    if (sc === undefined) {
      continue;
    }
    const nalStart: number = (sc.offset as number) + (sc.length as number);

    // NAL data extends to the next start code or end of buffer
    const nextSc = i + 1 < startCodes.length ? startCodes[i + 1] : undefined;
    const nalEnd: number = nextSc === undefined ? data.length : (nextSc.offset as number);

    if (nalStart < nalEnd) {
      const nalData: Buffer = data.subarray(nalStart, nalEnd);
      const [firstByte] = nalData;
      if (firstByte === undefined) {
        continue;
      }
      // NAL type is the lower 5 bits of the first byte
      const nalType: Num = (firstByte & 0x1f) as Num;
      units.push({ type: nalType, data: Buffer.from(nalData) });
    }
  }

  return units;
}

/* ------------------------------------------------------------------ */
/*  SPS/PPS detection                                                  */
/* ------------------------------------------------------------------ */

/**
 * Find SPS and PPS parameter sets in H.264 Annex B data.
 *
 * Extracts all NAL units and looks for NAL type 7 (SPS) and
 * NAL type 8 (PPS). Both must be present for a valid result.
 *
 * @param data - Buffer containing H.264 Annex B data (typically a config frame)
 * @returns SPS and PPS buffers, or undefined if either is missing
 */
export function findSpsPps(data: Buffer): SpsPps | undefined {
  if (data.length === 0) {
    return undefined;
  }

  const units: NalUnit[] = extractNalUnits(data);

  let sps: Buffer | undefined;
  let pps: Buffer | undefined;

  for (const unit of units) {
    if ((unit.type as number) === (NAL_TYPE_SPS as number)) {
      sps = unit.data;
    } else if ((unit.type as number) === (NAL_TYPE_PPS as number)) {
      pps = unit.data;
    }
  }

  if (sps === undefined || pps === undefined) {
    return undefined;
  }

  return { sps, pps };
}
