# 🔔 QuizBuzz — Real-Time Multi-Team Buzzer

QuizBuzz is a static, single-page web application that provides a real-time buzzer system for live quiz games. It's designed to be projected for a live audience, with players joining and buzzing in from their phones. It uses Firebase Realtime Database for synchronization and requires no backend server.

## ✨ Features

- **Serverless & Real-Time:** Uses Firebase Realtime Database for instant synchronization.
- **Zero Build Step:** Pure HTML, CSS, and Vanilla JavaScript. Deploy directly to any static hosting service.
- **Host & Player Views:** Separate, optimized interfaces for the game host and the players.
- **Up to 8 Teams:** Customizable teams with unique colors.
- **Fair Buzz-ins:** Buzz order is determined by server timestamps, not client-side clocks, ensuring fairness.
- **Responsive Design:** Looks great on a projector (Host View) and on mobile phones (Player View).
- **Engaging UX:** Includes sound effects, haptic feedback, and fun animations like confetti on the first buzz.
- **Easy Setup:** Get a room running in under 5 minutes.

---

## 🚀 Quick Start: Setup & Deployment

Follow these steps to get your own QuizBuzz instance running.

### Step 1: Get the Code

Clone or download this repository to your local machine.

### Step 2: Create a Firebase Project

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Click **"Add project"**. Give it a name (e.g., "My QuizBuzz App") and continue.
3.  You can **disable Google Analytics** for this project to speed up creation.
4.  Click **"Create project"**.

### Step 3: Set Up Realtime Database

1.  From your new project's dashboard, go to the **Build** section in the left sidebar and click **Realtime Database**.
2.  Click the **"Create Database"** button.
3.  Choose a server location nearest to you.
4.  Select **"Start in test mode"** and click **"Enable"**. *Test mode allows open read/write access for 30 days. See the security rules below for a slightly more secure setup.*

### Step 4: Get Your Firebase Config

1.  In the top-left, click the gear icon ⚙️ next to "Project Overview" and select **Project settings**.
2.  In the **General** tab, scroll down to the "Your apps" section.
3.  Click the Web icon `</>`.
4.  Give your app a nickname (e.g., "QuizBuzz Web") and click **"Register app"**.
5.  In the "Add Firebase SDK" step, select the **`Config`** option.
6.  You will see a `firebaseConfig` object. Copy this entire object.

### Step 5: Add Config to Your Code

1.  Open the `firebase-config.js` file in the code you downloaded.
2.  **Paste** the `firebaseConfig` object you copied, replacing the placeholder content.
3.  Save the file.

### Step 6: Set Firebase Security Rules

1.  Go back to your Firebase Console.
2.  Navigate to **Build → Realtime Database**.
3.  Select the **Rules** tab.
4.  Delete the existing JSON and paste the following rules:

    ```json
    {
      "rules": {
        "rooms": {
          "$roomCode": {
            ".read": true,
            ".write": "newData.exists()", // Allow creating/updating rooms, but not deleting them entirely
            "buzzes": {
              // Allow writing a new buzz if it has the required fields
              "$buzzId": {
                ".write": "!data.exists() && newData.hasChildren(['playerId', 'playerName', 'team', 'timestamp'])",
                ".validate": "newData.hasChildren(['playerId', 'playerName', 'team', 'timestamp'])"
              }
            }
          }
        }
      }
    }
    ```
5.  Click **"Publish"**.

### Step 7: Deploy to GitHub Pages (or any static host)

1.  Create a new repository on GitHub and push the code to it.
2.  In your GitHub repo, go to **Settings → Pages**.
3.  Under "Build and deployment", select **Source:** `Deploy from a branch`.
4.  Select **Branch:** `main` and folder `/(root)`.
5.  Click **Save**.
6.  Create an empty file named `.nojekyll` in the root of your repository and push it. This tells GitHub Pages not to process the site with Jekyll.

**That's it!** Your QuizBuzz app will be live at the URL provided by GitHub Pages in a few minutes.

---

## 🎮 How to Play

### For the Host:

1.  Open the deployed URL.
2.  Click **"🎤 Host a Room"**.
3.  Select which teams (A-H) will be participating.
4.  Click **"🚀 Open Lobby"**.
5.  Share the 6-digit **Room Code** with your players. You can also use the QR code for easy sharing.
6.  The host screen will show players joining teams in real-time.
7.  When ready for a question, click **"🟢 ARM BUZZERS"**. This enables the buzzers on all players' phones.
8.  The first player to buzz appears at the top of the queue.
9.  After the question is resolved, you can either **"🧹 CLEAR QUEUE"** or click **"⏭️ NEXT QUESTION"** to reset for the next round.

### For Players:

1.  Open the deployed URL on your phone.
2.  Click **"🎮 Join a Room"**.
3.  Enter the 6-digit **Room Code** provided by the host and your name.
4.  Select a team from the available options.
5.  Wait for the host to arm the buzzers. The button will turn gray and say "Waiting for host...".
6.  When the button turns your team color and says "TAP TO BUZZ", you're live! Tap it to buzz in.
7.  If you successfully buzz, your phone will show your rank in the queue.
