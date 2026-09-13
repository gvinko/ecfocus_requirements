declare module 'piexifjs' {
  interface Rational extends Array<number> {}

  interface ImageIFDTags {
    ImageDescription: number;
    DateTime: number;
  }
  interface ExifIFDTags {
    DateTimeOriginal: number;
  }
  interface GPSIFDTags {
    GPSLatitudeRef: number;
    GPSLatitude: number;
    GPSLongitudeRef: number;
    GPSLongitude: number;
    GPSDateStamp: number;
    GPSHPositioningError: number;
  }

  const piexif: {
    ImageIFD: ImageIFDTags;
    ExifIFD: ExifIFDTags;
    GPSIFD: GPSIFDTags;
    dump(exifObj: Record<string, Record<number, unknown>>): string;
    insert(exifBytes: string, jpegDataUrlOrBinary: string): string;
    load(jpegDataUrlOrBinary: string): Record<string, Record<number, unknown>>;
    remove(jpegDataUrlOrBinary: string): string;
  };

  export = piexif;
}
