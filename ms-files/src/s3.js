const {
    S3Client,
    HeadBucketCommand,
    CreateBucketCommand,
} = require("@aws-sdk/client-s3");

const S3_ENDPOINT = process.env.S3_ENDPOINT || "http://minio:9000";
const S3_REGION = process.env.S3_REGION || "us-east-1";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || "minioadmin";
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || "minioadmin";
const BUCKET = process.env.S3_BUCKET || "empleouni-documentos";

// Cliente S3. Apunta a MinIO en desarrollo; en producción basta cambiar
// endpoint/credenciales para usar AWS S3 real (forcePathStyle compatible).
const s3 = new S3Client({
    endpoint: S3_ENDPOINT,
    region: S3_REGION,
    credentials: { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET_KEY },
    forcePathStyle: true,
});

// Crea el bucket si no existe (idempotente).
async function ensureBucket() {
    try {
        await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
    } catch (_) {
        await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
        console.log(`[ms-files] Bucket creado: ${BUCKET}`);
    }
}

module.exports = { s3, BUCKET, ensureBucket };
