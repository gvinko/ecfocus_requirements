import piexif from 'piexifjs';

export interface ExifStampInput {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: string; // ISO 8601
  description: string; // e.g. "JOB #1234 | switchboard"
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function exifDateTime(date: Date): string {
  return `${date.getFullYear()}:${pad(date.getMonth() + 1)}:${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function exifDateStamp(date: Date): string {
  return `${date.getFullYear()}:${pad(date.getMonth() + 1)}:${pad(date.getDate())}`;
}

/** Converts a signed decimal-degree coordinate into EXIF's [deg,min,sec] rational triples. */
function toDMSRationals(decimalDegrees: number): [[number, number], [number, number], [number, number]] {
  const abs = Math.abs(decimalDegrees);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  return [
    [degrees, 1],
    [minutes, 1],
    [Math.round(seconds * 100), 100]
  ];
}

/**
 * Embeds real EXIF metadata (GPS lat/long, GPS accuracy, capture timestamp,
 * and a job/category description) into a JPEG data URL's file header —
 * distinct from, and in addition to, the visible pixel watermark burned in
 * by the camera capture component. Audits and downstream tooling that read
 * EXIF (not just the visible banner) can then verify the same data.
 *
 * Falls back to returning the original data URL unchanged if injection
 * fails for any reason, so a metadata-embedding bug never blocks a capture.
 */
export function injectExifMetadata(jpegDataUrl: string, info: ExifStampInput): string {
  try {
    const date = new Date(info.timestamp);
    const dateTimeStr = exifDateTime(date);

    const zeroth: Record<number, unknown> = {
      [piexif.ImageIFD.ImageDescription]: info.description,
      [piexif.ImageIFD.DateTime]: dateTimeStr
    };
    const exif: Record<number, unknown> = {
      [piexif.ExifIFD.DateTimeOriginal]: dateTimeStr
    };
    const gps: Record<number, unknown> = {};

    if (info.latitude !== null && info.longitude !== null) {
      gps[piexif.GPSIFD.GPSLatitudeRef] = info.latitude >= 0 ? 'N' : 'S';
      gps[piexif.GPSIFD.GPSLatitude] = toDMSRationals(info.latitude);
      gps[piexif.GPSIFD.GPSLongitudeRef] = info.longitude >= 0 ? 'E' : 'W';
      gps[piexif.GPSIFD.GPSLongitude] = toDMSRationals(info.longitude);
      gps[piexif.GPSIFD.GPSDateStamp] = exifDateStamp(date);
      if (info.accuracy !== null) {
        gps[piexif.GPSIFD.GPSHPositioningError] = [Math.round(info.accuracy * 100), 100];
      }
    }

    const exifBytes = piexif.dump({ '0th': zeroth, Exif: exif, GPS: gps });
    return piexif.insert(exifBytes, jpegDataUrl);
  } catch (err) {
    console.error('EXIF injection failed, saving photo without embedded EXIF:', err);
    return jpegDataUrl;
  }
}
