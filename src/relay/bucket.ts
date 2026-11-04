/** The part of the R2 bucket binding that the relay uses. The tests use a bucket in memory. */

export interface RelayHead {
  /** The ETag without quotes. */
  etag: string;
  customMetadata?: Record<string, string>;
}

export interface RelayObject extends RelayHead {
  text(): Promise<string>;
}

export interface RelayPutOptions {
  /** R2 writes only when the condition is true. Else `put()` gives null. */
  onlyIf?: { etagMatches?: string; etagDoesNotMatch?: string };
  customMetadata?: Record<string, string>;
}

export interface RelayBucket {
  head(key: string): Promise<RelayHead | null>;
  get(key: string): Promise<RelayObject | null>;
  put(key: string, value: string, options?: RelayPutOptions): Promise<RelayHead | null>;
  delete(key: string): Promise<void>;
}
