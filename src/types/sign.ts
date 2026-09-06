/**
 * Props for creating an HMAC-SHA256 signature.
 */
export type CreateSignatureProps = {
    requestId: string;
    issuedAt: string;
    secret: string;
};

/**
 * Props for verifying signature freshness and equality.
 */
export type VerifySignatureProps = {
    signature: string;
    requestId: string;
    issuedAt: string;
    secret: string;
    skewMs?: number;
};
