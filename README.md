# BigQuery Release Notes Hub

A premium, responsive dark-themed dashboard application built using **Python Flask** and **Vanilla HTML, CSS, and JavaScript**. This application fetches the live Google Cloud BigQuery Release Notes Atom feed, structures the updates dynamically by category (Features, Announcements, Changes, Issues, General), and lets you search, copy updates, and compose posts to share them on X (Twitter).

## 🚀 Features

*   **Live XML Feed Parsing**: Automatically fetches, parses, and handles the official Atom release notes feed from Google Cloud Platform.
*   **Intelligent Caching**: In-memory caching mechanism (10-minute expiry) to prevent unnecessary network overhead, featuring a manual sync override.
*   **Visual Organization & Indicators**: Clean layout with visual indicator colors for different categories (e.g. green for Features, amber for Announcements, red for Issues).
*   **Filter & Search**: Instantly filter updates by clicking categories in the sidebar or using the live keyword search bar.
*   **Copy-to-Clipboard**: Copy text snippets directly to your clipboard with animated status checkmark feedback.
*   **Interactive X (Twitter) Composer Modal**: 
    *   Previews your post as a simulated card.
    *   Tracks character constraints (up to 280 characters) with color warnings.
    *   Redirects to the official X Web Intent on submit.

## 🛠️ Tech Stack

*   **Backend**: Python, Flask, Requests, ElementTree XML Parser.
*   **Frontend**: HTML5 (Semantic Structure), CSS3 (Modern HSL variables, glassmorphism, responsive grids), Vanilla ES6 JavaScript (Fetch API, DOM manipulation).
*   **Fonts & Icons**: Outfit & Inter (Google Fonts), Lucide Icons.

## 📁 Directory Structure

```text
agy-cli-projects/
│
├── app.py                  # Flask main backend server
├── templates/
│   └── index.html          # HTML dashboard structure
├── static/
│   ├── css/
│   │   └── style.css       # Core stylesheets & variables
│   └── js/
│       └── app.js          # App state, filters, copy, and Twitter composer
├── .gitignore              # Ignored local environments and caches
└── README.md               # Project documentation
```

## 💻 Local Installation & Setup

1.  **Clone this Repository** (or copy folder contents):
    ```bash
    git clone https://github.com/your-username/bq-release-notes-app.git
    cd bq-release-notes-app
    ```

2.  **Install Dependencies**:
    Make sure you have Python 3.x installed. Run:
    ```bash
    pip install flask requests
    ```

3.  **Run the Server**:
    Start the local development server:
    ```bash
    python app.py
    ```

4.  **Open in Browser**:
    Navigate to the following address:
    ```text
    http://127.0.0.1:5000
    ```
