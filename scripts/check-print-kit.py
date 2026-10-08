"""Render every modular sheet plus create contact sheets and inspect PDF objects."""
from pathlib import Path
import json, shutil, subprocess
import pypdfium2 as pdfium
from PIL import Image, ImageOps, ImageDraw
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/pdf'; QA=ROOT/'tmp/pdfs/qa'; QA.mkdir(parents=True,exist_ok=True)
report={}
for file in sorted(OUT.glob('0[123]-*.pdf')):
    doc=pdfium.PdfDocument(str(file)); thumbs=[]
    poppler=shutil.which('pdftoppm')
    if poppler:
        subprocess.run([poppler,'-r','130','-png',str(file),str(QA/file.stem)],check=True,capture_output=True)
    for i in range(len(doc)):
        if poppler:
            rendered=next(p for p in QA.glob(file.stem+'-*.png') if p.stem.rsplit('-',1)[-1].isdigit() and int(p.stem.rsplit('-',1)[-1])==i+1 and len(p.stem.rsplit('-',1)[-1])==len(str(len(doc))))
            im=Image.open(rendered).convert('RGB')
        else:im=doc[i].render(scale=1.8).to_pil().convert('RGB')
        im.save(QA/f'{file.stem}-{i+1:02}.png')
        thumb=im.copy();thumb.thumbnail((420,590))
        tile=Image.new('RGB',(440,620),'#deded8');tile.paste(thumb,((440-thumb.width)//2,20))
        ImageDraw.Draw(tile).text((12,603),f'{file.name} / {i+1}',fill='black');thumbs.append(tile)
    contact=Image.new('RGB',(440*min(3,len(thumbs)),620*((len(thumbs)+2)//3)),'#deded8')
    for i,im in enumerate(thumbs):contact.paste(im,((i%3)*440,(i//3)*620))
    contact.save(QA/f'{file.stem}-contact.png')
    reader=PdfReader(file);font_states=[]
    for page in reader.pages:
        for ref in page['/Resources']['/Font'].values():
            font=ref.get_object();fd=font.get('/FontDescriptor')
            if fd:
                fd=fd.get_object();font_states.append(any(k in fd for k in ['/FontFile','/FontFile2','/FontFile3']))
    assert font_states and all(font_states),file
    report[file.name]={'pages':len(reader.pages),'fonts_embedded':True,'rendered_all_pages':True}
(QA/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
