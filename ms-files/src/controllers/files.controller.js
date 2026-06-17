const path = require("path");
const { v4: uuidv4 } = require("uuid");
const {
    PutObjectCommand,
    GetObjectCommand,
    ListObjectsV2Command,
} = require("@aws-sdk/client-s3");
const { s3, BUCKET } = require("../s3");

// URL pública del propio servicio (accesible desde el navegador)
const PUBLIC_FILES_URL = process.env.PUBLIC_FILES_URL || "http://localhost:3009";

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

function viewUrl(key) {
    return `${PUBLIC_FILES_URL}/files/view/${key}`;
}

// POST /files — sube un documento a S3/MinIO (RF20, RF09).
const subir = asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Archivo requerido (campo 'file')" });

    const folder = (req.body.folder || "cvs").replace(/[^a-z0-9_-]/gi, "");
    const ext = path.extname(req.file.originalname);
    const key = `${folder}/${req.user.id}/${uuidv4()}${ext}`;

    await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        Metadata: { originalname: encodeURIComponent(req.file.originalname) },
    }));

    return res.status(201).json({ key, url: viewUrl(key) });
});

// GET /files/view/* — sirve el documento (descarga/visualización por enlace).
// Sin JWT: el enlace es la credencial (clave UUID no adivinable), consistente
// con el modelo de enlaces de documentos. El objeto en S3 permanece privado.
const ver = asyncHandler(async (req, res) => {
    const key = req.params[0];
    if (!key) return res.status(400).json({ message: "Clave requerida" });

    try {
        const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
        res.setHeader("Content-Type", obj.ContentType || "application/octet-stream");
        const nombre = obj.Metadata && obj.Metadata.originalname
            ? decodeURIComponent(obj.Metadata.originalname)
            : path.basename(key);
        res.setHeader("Content-Disposition", `inline; filename="${nombre}"`);
        obj.Body.pipe(res);
    } catch (_) {
        return res.status(404).json({ message: "Documento no encontrado" });
    }
});

// GET /files/me — lista los documentos del usuario autenticado.
const mios = asyncHandler(async (req, res) => {
    const folder = (req.query.folder || "cvs").replace(/[^a-z0-9_-]/gi, "");
    const out = await s3.send(new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: `${folder}/${req.user.id}/`,
    }));
    const documentos = (out.Contents || []).map((o) => ({
        key: o.Key,
        url: viewUrl(o.Key),
        size: o.Size,
        lastModified: o.LastModified,
    }));
    return res.json({ documentos });
});

module.exports = { subir, ver, mios };
