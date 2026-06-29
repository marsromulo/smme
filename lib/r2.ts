import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

let r2Client: S3Client | null = null;

function getR2Client() {
  if (!r2Client) {
    r2Client = new S3Client({
      credentials: {
        accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
      },
      endpoint: requireEnv("R2_ENDPOINT"),
      region: "auto",
    });
  }

  return r2Client;
}

export function getR2BucketName() {
  return requireEnv("R2_BUCKET_NAME");
}

export async function createR2PutSignedUrl({
  contentType,
  key,
}: {
  contentType: string;
  key: string;
}) {
  const command = new PutObjectCommand({
    Bucket: getR2BucketName(),
    ContentType: contentType,
    Key: key,
  });

  return getSignedUrl(getR2Client(), command, { expiresIn: 300 });
}

export async function createR2GetSignedUrl({
  disposition,
  key,
}: {
  disposition?: string;
  key: string;
}) {
  const command = new GetObjectCommand({
    Bucket: getR2BucketName(),
    Key: key,
    ResponseContentDisposition: disposition,
  });

  return getSignedUrl(getR2Client(), command, { expiresIn: 300 });
}

export async function deleteR2Object({ key }: { key: string }) {
  const command = new DeleteObjectCommand({
    Bucket: getR2BucketName(),
    Key: key,
  });

  await getR2Client().send(command);
}
