# Forecaster Arena - Hackathon Presentation

> Optional support material. This deck is not part of the runtime application
> or current operational documentation.

A professional slide deck for presenting the Forecaster Arena project.

## Features

- **11 slides** covering problem, solution, methodology, results, and technical details
- **Consistent branding** with website (Inter + Instrument Serif fonts, gold accent)
- **Interactive navigation** (keyboard arrows, spacebar, or click)
- **Responsive design** (works on any screen size)
- **Zero dependencies** (pure HTML/CSS/JS)

## How to Present

### Option 1: Open Locally
```bash
# From the presentation directory
open index.html
# or
firefox index.html
# or
google-chrome index.html
```

### Option 2: Serve with Python
```bash
cd /path/to/forecasterarena/presentation
python3 -m http.server 8080
# Then open: http://localhost:8080
```

### Option 3: Publish as Static Files
```bash
# Copy to whatever static hosting directory you use
cp -r /path/to/forecasterarena/presentation /path/to/static-host/forecaster-presentation
# Then serve that directory from your preferred host/path
```

## Navigation

- **Next slide**: Right arrow, Spacebar, or click right half of screen
- **Previous slide**: Left arrow or click left half of screen
- **Jump to slide**: Edit URL with `#slide-N`

## Slide Outline

1. **Title** - Project name and tagline
2. **The Problem** - Why traditional benchmarks fail
3. **The Solution** - Real prediction markets approach
4. **How It Works** - 4-step methodology
5. **Current Results** - Live leaderboard standings
6. **Technical Stack** - Technologies used
7. **Why It Matters** - Impact and significance
8. **Key Insights** - What we've learned
9. **Future Work** - Next steps
10. **Live Demo** - Call to action
11. **Thank You** - Q&A

## Customization

Edit `index.html` to:
- Update statistics (lines with `.stat-value`)
- Modify leaderboard rankings (`.leaderboard-row`)
- Add/remove slides (copy a `.slide` div)
- Change colors (CSS variables in `:root`)

## Tips for Presenting

- **Practice transitions** - Use arrow keys for smooth flow
- **Point to live site** - Have forecasterarena.com open in another tab
- **Emphasize "reality"** - This is the key differentiator
- **Show the leaderboard** - Live data makes it compelling
- **Mention open source** - Full transparency and reproducibility

Good luck with your hackathon! 🚀
