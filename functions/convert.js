const sharp = require('sharp');
const PDFDocument = require('pdfkit');
const streamBuffers = require('stream-buffers');
const multipart = require('parse-multipart-data');

exports.handler = async (event, context) => {
  console.log('Function invoked');

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const boundary = multipart.getBoundary(event.headers['content-type']);
    const parts = multipart.parse(Buffer.from(event.body, 'base64'), boundary);

    console.log(`Number of parts: ${parts.length}`);

    if (parts.length === 0) {
      return { statusCode: 400, body: 'No files uploaded' };
    }

    const doc = new PDFDocument();
    const writeStream = new streamBuffers.WritableStreamBuffer();
    doc.pipe(writeStream);

    let pageAdded = false;

    for (const part of parts) {
      if (part.filename.toLowerCase().endsWith('.jpg') || part.filename.toLowerCase().endsWith('.jpeg')) {
        console.log(`Processing file: ${part.filename}`);
        try {
          const image = await sharp(part.data)
            .resize(595, 842, { fit: 'inside' })  // A4 size in points
            .toBuffer();

          doc.addPage().image(image, 0, 0, { fit: [595, 842] });
          pageAdded = true;
          console.log(`Page added for ${part.filename}`);
        } catch (error) {
          console.error(`Error processing image ${part.filename}:`, error);
        }
      }
    }

    if (!pageAdded) {
      console.log('No valid images were processed');
      return { statusCode: 400, body: 'No valid images were processed' };
    }

    doc.end();

    return new Promise((resolve) => {
      writeStream.on('finish', () => {
        const pdfBuffer = writeStream.getContents();
        console.log(`PDF generated. Size: ${pdfBuffer.length} bytes`);
        
        resolve({
          statusCode: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=converted.pdf'
          },
          body: pdfBuffer.toString('base64'),
          isBase64Encoded: true
        });
      });
    });
  } catch (error) {
    console.error('Error in function:', error);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};