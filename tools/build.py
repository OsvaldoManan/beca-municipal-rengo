#!/usr/bin/env python3
"""Genera dist/beca-municipal-rengo.html, una versión de un solo archivo (CSS, JS y logos incrustados)."""
import base64, pathlib, re
r = pathlib.Path(__file__).resolve().parent.parent
html = (r / "index.html").read_text(encoding="utf8")
css = (r / "css/estilos.css").read_text(encoding="utf8")
def uri(m):
    p = r / m.group(1)
    mime = {"webp": "image/webp", "png": "image/png", "svg": "image/svg+xml"}[p.suffix[1:]]
    return 'src="data:%s;base64,%s"' % (mime, base64.b64encode(p.read_bytes()).decode())
html = re.sub(r'src="(assets/[^"]+)"', uri, html)
html = html.replace('<link rel="stylesheet" href="css/estilos.css">', "<style>\n" + css + "</style>")
html = re.sub(r'<script src="(js/[^"]+)"></script>', lambda m: "<script>\n" + (r / m.group(1)).read_text(encoding="utf8") + "</script>", html)
(r / "dist").mkdir(exist_ok=True)
(r / "dist/beca-municipal-rengo.html").write_text(html, encoding="utf8")
# Fragmento sin <html>/<head>/<body>, para vista previa como artefacto
frag = re.search(r"<title>.*?</title>", html, re.S).group(0) + "\n" + \
    '<meta name="claude:viewport-fit-sides" content="cover">\n' + \
    "".join(re.findall(r'<link rel="stylesheet" href="https://fonts[^>]+>\n?', html)) + \
    re.search(r"<style>.*?</style>", html, re.S).group(0) + "\n" + \
    re.search(r"<body>(.*)</body>", html, re.S).group(1)
(r / "dist/vista-previa.html").write_text(frag, encoding="utf8")
print("dist listo")
