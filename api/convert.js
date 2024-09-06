const multiparty = require('parse-multipart-data');
const sharp = require('sharp');
const PDFDocument = require('pdfkit');
const { Readable } = require('stream');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    // Parse the form data
    const contentType = req.headers['content-type'];
    const bodyBuffer = await getRawBody(req);
    const parts = multiparty.parse(Buffer.from(bodyBuffer), contentType);

    const images = parts.filter(part => part.filename && part.mimetype.startsWith('image/'));
    if (images.length === 0) {
      res.status(400).send('No image files uploaded.');
      return;
    }

    const pdfDoc = new PDFDocument();
    const buffers = [];
    pdfDoc.on('data', buffers.push.bind(buffers));
    pdfDoc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=converted.pdf');
      res.status(200).send(pdfBuffer);
    });

    for (const image of images) {
      const imageBuffer = await sharp(image.data).toBuffer();
      pdfDoc.image(imageBuffer, { fit: [500, 500], align: 'center', valign: 'center' });
      pdfDoc.addPage();
    }

    pdfDoc.end();
  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).send('Error converting images to PDF');
  }
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
    req.on('error', err => reject(err));
  });
}
