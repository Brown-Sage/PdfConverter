const sharp = require('sharp');
const PDFDocument = require('pdfkit');
const streamBuffers = require('stream-buffers');
const multipart = require('parse-multipart-data');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const boundary = multipart.getBoundary(event.headers['content-type']);
  const parts = multipart.parse(Buffer.from(event.body, 'base64'), boundary);

  if (parts.length === 0) {
    return { statusCode: 400, body: 'No files uploaded' };
  }

  const doc = new PDFDocument();
  const writeStream = new streamBuffers.WritableStreamBuffer();
  doc.pipe(writeStream);

  for (const part of parts) {
    if (part.filename.toLowerCase().endsWith('.jpg') || part.filename.toLowerCase().endsWith('.jpeg')) {
      const image = await sharp(part.data)
        .resize(595, 842, { fit: 'inside' })  // A4 size in points
        .toBuffer();

      doc.addPage().image(image, 0, 0, { fit: [595, 842] });
    }
  }

  doc.end();

  return new Promise((resolve) => {
    writeStream.on('finish', () => {
      resolve({
        statusCode: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename=converted.pdf'
        },
        body: writeStream.getContents().toString('base64'),
        isBase64Encoded: true
      });
    });
  });
};
