import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from '../config';

export const s3Client = new S3Client({
  region: config.aws_region,
  credentials: {
    accessKeyId: config.aws_access_key_id!,
    secretAccessKey: config.aws_secret_access_key!,
  },
});

export const buildS3PublicUrl = (bucket: string, key: string) =>
  `https://${bucket}.s3.${config.aws_region}.amazonaws.com/${key}`;

export const generatePresignedUploadUrl = ({
  bucket,
  key,
  contentType,
  expiresInSeconds,
}: {
  bucket: string;
  key: string;
  contentType: string;
  expiresInSeconds: number;
}) => {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
};
