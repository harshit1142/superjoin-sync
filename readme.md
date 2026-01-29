# 2-Way Real-Time Data Sync: Google Sheets & MySQL

A robust, bidirectional synchronization engine built with **Node.js** and **Google Apps Script**. This project ensures that any change made in a Google Sheet is reflected in a MySQL database and vice versa, while preventing infinite update loops and handling concurrency.

## Live Links
* **Backend Status:** [https://superjoin-sync-frkp.onrender.com/](https://superjoin-sync-frkp.onrender.com/)
* **Database View:** [https://superjoin-sync-frkp.onrender.com/view-db](https://superjoin-sync-frkp.onrender.com/view-db)

## Technical Architecture



The system employs two distinct synchronization strategies:
1.  **Google Sheets → MySQL (Webhook):** An `onEdit` trigger in Apps Script detects changes and sends an authorized POST request to the Node.js backend.
2.  **MySQL → Google Sheets (Polling):** The backend runs a 5-second polling interval to detect database changes tagged with a specific `source_id` and pushes them to the Sheet via the Google Sheets API.

## 🏗️ Technical Nuances & Edge Cases Handled

### 1. Bidirectional Loop Prevention
To prevent an infinite loop (where a Sheet update triggers a DB update, which then triggers the Sheet to update again), I implemented a **Source Tracking System**. Each update is tagged with a `source_id` (`SHEET`, `MYSQL`, or `SYNCED`). The sync logic only processes records where the source is the opposite of the destination.

### 2. Concurrency & Race Conditions
* **Timestamp Validation:** In the `UPDATE` query for MySQL, a timestamp check (`updated_at < ?`) is utilized. This ensures that older, delayed network packets from Google Sheets do not overwrite more recent data already present in the database.
* **Multiplayer Readiness:** By leveraging Google Apps Script’s `onEdit` triggers and a Node.js connection pool, the system handles simultaneous edits from multiple users across different rows without dropping data. 

### 3. Secure Credential Management
* **Zero-Exposure Policy:** Sensitive Google Service Account keys are managed via **Render Secret Files** (`credentials.json`) rather than being hardcoded or committed to version control.
* **Environment Isolation:** Critical configuration details like the `SPREADSHEET_ID` and database credentials are kept in environment variables, allowing the repository to remain public while keeping the system secure.


### 5. Manifest-Level Permissions
UnResolved `UrlFetchApp` permission issues by explicitly defining `oauthScopes` in the `appsscript.json` manifest, the script has the required `script.external_request` authority to communicate with the Render backend.

## 💻 Local Setup

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/your-username/your-repo-name.git](https://github.com/your-username/your-repo-name.git)
    cd your-repo-name
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Environment Variables:** Create a `.env` file with your Aiven and Google Sheet credentials.
4.  **Database Schema:**
    ```sql
    CREATE TABLE sync_data (
        id INT PRIMARY KEY,
        column1 VARCHAR(255),
        column2 VARCHAR(255),
        source_id VARCHAR(50),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
    ```
5.  **Run:**
    ```bash
    npm start
    ```