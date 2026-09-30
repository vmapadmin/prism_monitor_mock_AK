from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'src'
DIST = ROOT / 'dist'
DIST.mkdir(exist_ok=True)

read = lambda p: p.read_text(encoding='utf-8')
css = read(SRC / 'style.css')
js = '\n'.join(read(SRC / f) for f in ['core.js', 'ui.js', 'case.js', 'views.js', 'app.js'])
html = f'''<!DOCTYPE html>
<html lang="en-IN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Prism Monitor · ValueMap Prism</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>{css}</style></head>
<body><div id="app"><aside id="side" aria-label="Main navigation"></aside><div id="mainwrap"><header id="top"></header><main id="main"></main></div></div>
<div id="modal-root"></div><div id="toasts" aria-live="polite"></div><div id="print-root"></div>
<script>{js}</script></body></html>'''
(DIST / 'prism-monitor.html').write_text(html, encoding='utf-8')
(DIST / 'all.js').write_text(js, encoding='utf-8')
print(f'Built dist/prism-monitor.html ({len(html)} chars)')
