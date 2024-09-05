import os
from flask import Flask, request, render_template, send_file
from werkzeug.utils import secure_filename
from PIL import Image
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import io

app = Flask(__name__)

# Ensure the upload folder exists
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def convert_jpg_to_pdf(jpg_files):
    pdf_buffer = io.BytesIO()
    c = canvas.Canvas(pdf_buffer, pagesize=letter)
    width, height = letter

    for jpg_file in jpg_files:
        img = Image.open(jpg_file)
        
        # If the image is larger than the PDF page, resize it
        if img.width > width or img.height > height:
            img.thumbnail((width, height))
        
        # Center the image on the page
        x = (width - img.width) / 2
        y = (height - img.height) / 2
        
        # Draw the image on the PDF
        c.drawImage(jpg_file, x, y, img.width, img.height)
        
        # Add a new page for the next image
        c.showPage()
    
    c.save()
    pdf_buffer.seek(0)
    return pdf_buffer

@app.route('/', methods=['GET', 'POST'])
def upload_file():
    if request.method == 'POST':
        if 'file' not in request.files:
            return 'No file part'
        files = request.files.getlist('file')
        if not files or files[0].filename == '':
            return 'No selected file'
        
        filenames = []
        for file in files:
            if file and file.filename.lower().endswith(('.jpg', '.jpeg')):
                filename = secure_filename(file.filename)
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                filenames.append(filepath)
        
        if filenames:
            pdf_buffer = convert_jpg_to_pdf(filenames)
            
            # Clean up the uploaded files
            for filepath in filenames:
                os.remove(filepath)
            
            return send_file(
                pdf_buffer,
                as_attachment=True,
                download_name='converted.pdf',
                mimetype='application/pdf'
            )
        else:
            return 'No valid JPG files uploaded'
    
    return render_template('upload.html')

if __name__ == '__main__':
    app.run(debug=True)