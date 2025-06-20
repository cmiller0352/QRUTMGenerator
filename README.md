# QRUTMGenerator

A streamlined QR Code + UTM link generator for outreach, marketing, and analytics. Built with React, Supabase, and Material UI.

---

## 🚀 Features

- **Real-time UTM URL Generator**: Dynamically appends `utm_source`, `utm_medium`, and `utm_campaign` to your base URL.
- **QR Code Preview**: Live canvas preview with color and logo customization.
- **PNG & SVG Export**: Export your QR code in either format.
- **Copy to Clipboard**: Instantly copy the URL or QR code.
- **Logo Overlay**: Upload your own logo or use the default Road Home Program shield.
- **Save to Supabase**: Log your generated QR codes for future access.
- **QR History View**: Regenerate any past QR code.
- **Snackbar Notifications**: Confirmation messages on success or failure.

---

## 📦 Tech Stack

- **React** (with hooks)
- **Material UI** (v5)
- **Supabase** (PostgreSQL backend + REST API)
- **Canvas API** (for QR code rendering)

---

## 🛠️ Getting Started

### Clone the Repo
```bash
git clone https://github.com/cmiller0352/QRUTMGenerator.git
cd QRUTMGenerator
```

### Install Dependencies
```bash
npm install
```

### Run Locally
```bash
npm start
```
This opens `http://localhost:3000`

### Environment Variables
Create a `.env` file (if needed) and include:
```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
```

---

## 📁 Folder Structure
```
├── src/
│   ├── App.js               # Main UI and logic
│   ├── CanvasUtils.js       # Drawing/exporting QR logic
│   ├── HistoryPage.js       # Saved QR codes
│   ├── supabaseClient.js    # Supabase connection
│   ├── assets/
│   │   └── shield.png        # Default logo
│   └── theme.js             # Material UI theme override
```

---

## 🔮 Roadmap

- [ ] Support for `utm_term` and `utm_content`
- [ ] Shortened URLs with redirect tracking
- [ ] Campaign tagging via AI prompts
- [ ] View stats like scan count + last scanned timestamp
- [ ] User login + private history filtering

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you’d like to change.

---

## 📄 License
MIT

---

## 🧠 Author
Built by [Chris Miller](https://github.com/cmiller0352) at the Road Home Program, Rush University Medical Center.

> Helping veterans, service members, and their families heal from the invisible wounds of war.
