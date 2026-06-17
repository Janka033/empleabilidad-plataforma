const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const STORAGE_DRIVER = process.env.STORAGE_DRIVER || 'local';
const LOCAL_UPLOAD_DIR = path.join(__dirname, '../../../uploads');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

if (STORAGE_DRIVER === 'local' && !fs.existsSync(LOCAL_UPLOAD_DIR)) {
    fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
}

async function uploadFile(fileBuffer, originalName, folder = 'cvs', userId) {
    const extension = path.extname(originalName);
    const fileName = `${uuidv4()}${extension}`;
    const key = `${folder}/${userId}/${fileName}`;

    if (STORAGE_DRIVER === 'local') {
        const filePath = path.join(LOCAL_UPLOAD_DIR, key);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, fileBuffer);
        return `${BASE_URL}/uploads/${key}`;
    } else if (STORAGE_DRIVER === 's3') {
        throw new Error('S3 no implementado');
    } else {
        throw new Error(`Driver no soportado: ${STORAGE_DRIVER}`);
    }
}

async function getSignedDownloadUrl(key) {
    if (STORAGE_DRIVER === 'local') {
        return `${BASE_URL}/uploads/${key}`;
    }
    throw new Error('S3 no implementado');
}

module.exports = { uploadFile, getSignedDownloadUrl };
