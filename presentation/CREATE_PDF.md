# How to Create PDF from Presentation

> Optional support workflow for the static presentation deck. This is not part
> of the runtime app or deployment process.

## Method 1: Browser Print to PDF (Easiest)

### Step 1: Open the print version
```bash
# If server is running on port 8888:
http://localhost:8888/print.html
```

### Step 2: Print to PDF

**Chrome/Chromium:**
1. Press `Cmd+P` (Mac) or `Ctrl+P` (Windows/Linux)
2. Destination: **Save as PDF**
3. Paper size: **Custom** → **16 x 9 inches** (or A4 Landscape)
4. Margins: **None**
5. Background graphics: **✓ Enabled**
6. Click **Save**

**Firefox:**
1. Press `Cmd+P` (Mac) or `Ctrl+P` (Windows/Linux)
2. Destination: **Save to PDF**
3. Orientation: **Landscape**
4. Print backgrounds: **✓ Enabled**
5. Click **Save**

**Safari:**
1. Press `Cmd+P`
2. PDF menu (bottom left) → **Save as PDF**
3. Paper size: **US Letter** (Landscape)
4. Click **Save**

## Method 2: Command Line (Linux/Mac)

### Install wkhtmltopdf:
```bash
# Ubuntu/Debian
sudo apt-get install wkhtmltopdf

# Mac
brew install wkhtmltopdf
```

### Generate PDF:
```bash
cd /path/to/forecasterarena/presentation

wkhtmltopdf \
  --page-width 16in \
  --page-height 9in \
  --margin-top 0 \
  --margin-bottom 0 \
  --margin-left 0 \
  --margin-right 0 \
  --enable-local-file-access \
  print.html \
  forecaster-arena-presentation.pdf
```

## Method 3: Using Chrome Headless (Server)

```bash
# Install Chrome
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt-get update
sudo apt-get install google-chrome-stable

# Generate PDF
google-chrome \
  --headless \
  --disable-gpu \
  --print-to-pdf=forecaster-arena-presentation.pdf \
  --print-to-pdf-no-header \
  --no-margins \
  print.html
```

## Method 4: Online Converter (Quick)

1. Download `print.html` to your local machine
2. Open in browser
3. Use browser's **Print to PDF** feature
4. Or upload to: https://www.web2pdfconvert.com/

## Expected Result

- **11-page PDF** (one slide per page)
- **16:9 aspect ratio** (widescreen)
- **Dark theme** with gold accents
- **Print-optimized** (all colors preserved)

## Tips

- Make sure "Background graphics" is enabled in print settings
- Use Landscape orientation
- Set margins to 0 or minimal
- If fonts look wrong, ensure you're connected to internet (Google Fonts)

## File Locations

```
presentation/
├── index.html              # Interactive slideshow (keyboard navigation)
├── print.html              # Print-optimized version (all slides on one page)
├── forecaster-arena.pdf    # PDF output (you'll create this)
└── README.md               # Documentation
```
