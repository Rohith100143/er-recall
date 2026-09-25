import math

width = 1920
height = 1080
paths = []

for i in range(60):
    points = []
    y_base = height / 2 + (i - 30) * 8
    
    for x in range(0, width + 50, 50):
        # Create a wave that pinches in the middle and expands on the edges
        pinch = math.sin(x / width * math.pi)
        amplitude = 150 + (1 - pinch) * 300
        
        y = y_base + math.sin(x / 200.0 + i * 0.05) * amplitude * 0.3 + math.sin(x / 600.0) * amplitude * 0.5
        points.append(f'{x},{y}')
    
    path_d = 'M ' + ' L '.join(points)
    paths.append(f'<path d="{path_d}" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="1.5" />')

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="75%">
      <stop offset="0%" stop-color="#8a949e" />
      <stop offset="100%" stop-color="#3b424a" />
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bgGrad)" />
  {''.join(paths)}
</svg>'''

with open('frontend/public/wave-bg.svg', 'w') as f:
    f.write(svg)
