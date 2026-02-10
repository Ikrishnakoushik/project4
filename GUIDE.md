# Your Website "To-Do" List (Full Stack Edition)

Use this guide to finish your website and make it real.

## 1. How to Run the App (New Way)
Since we added a backend (login system), you can't just open the file directly anymore. You need to run the server.

1.  Make sure you have **Node.js** and **MongoDB** installed.
2.  Open a terminal in your project folder.
3.  Run this command to start the server:
    ```bash
    node server.js
    ```
4.  Open your browser and visit: `http://localhost:3000`

## 2. Customize the Content
Open `public/index.html` (Note: it moved to the `public` folder) and look for these sections to change:
-   **Name & Bio**: Search for `Your Name` and `Digital Craftsman`. Replace it with your actual name and a 1-sentence bio.
-   **Projects**: Replace "Project Alpha" and "Design System" with things you have actually worked on.

## 3. Make the Images Real
Currently, I used emojis (👨‍💻, 🚀) as placeholders. To use real images:
1.  Save a photo of yourself as `avatar.jpg` in the `public/` folder.
2.  In `public/index.html`, find `<div class="avatar">👨‍💻</div>`.
3.  Replace it with: `<img src="avatar.jpg" class="avatar" alt="Profile Photo" style="object-fit: cover;">`.

## 4. Deploy (Go Live)
To let people visit the site, you need a backend host now (like Render, Heroku, or Railway).
1.  Push your code to GitHub.
2.  Connect your repo to **Render.com**.
3.  It will detect `node server.js` and deploy it for you.
