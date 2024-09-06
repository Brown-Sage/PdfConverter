const multiparty = require('parse-multipart-data');
const sharp = require('sharp');
const PDFDocument = require('pdfkit');
const { Readable } = require('stream');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Parse the form data
    const form = await parseForm(req);
    const files = form.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No image files uploaded.' });
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

    for (const file of files) {
      if (file.mimetype.startsWith('image/')) {
        const imageBuffer = await sharp(file.data).toBuffer();
        pdfDoc.addPage().image(imageBuffer, {
          fit: [500, 500],
          align: 'center',
          valign: 'center'
        });
      }
    }

    pdfDoc.end();
  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ error: 'Error converting images to PDF' });
  }
};

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'];
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      const boundary = contentType.split('boundary=')[1];
      const parts = multiparty.parse(Buffer.from(body), boundary);
      const files = parts.filter(part => part.filename && part.mimetype.startsWith('image/'));
      resolve({ files });
    });
    req.on('error', reject);
  });
}