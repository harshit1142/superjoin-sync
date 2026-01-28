require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json', 
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`;
app.get('/', (req, res) => {
    res.send(`
        <html>
            <body>
                <h1>Superjoin 2-Way Sync Status</h1>
                <p>Backend Status: 🟢 Online</p>
                <p>Check the Google Sheet and MySQL DB to see the live sync in action.</p>
                <a href=${SPREADSHEET_URL} target="_blank">Open Google Sheet</a>
            </body>
        </html>
    `);
});

// --- ENDPOINT: Sync Sheet change to MySQL ---
app.post('/sync-to-db', async (req, res) => {
    const { row, data, timestamp } = req.body;

    try {
        const query = `
            UPDATE sync_data 
            SET column1 = ?, column2 = ?, source_id = 'SHEET'
            WHERE id = ? AND updated_at < ?`;

        const [result] = await pool.execute(query, [data[0], data[1], row, timestamp]);

        console.log(`Row ${row} updated in MySQL.`);
        res.status(200).send('Success');
    } catch (err) {
        console.error(err);
        res.status(500).send('Sync Error');
    }
});

// --- NEW LOGIC: Sync MySQL changes to Google Sheets ---
async function syncDbToSheet() {
    try {
        const [rows] = await pool.execute(
            "SELECT * FROM sync_data WHERE source_id = 'MYSQL'"
        );

        for (const row of rows) {
            const values = [[row.id, row.column1, row.column2]];

            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `Sheet1!A${row.id + 1}`,
                valueInputOption: 'RAW',
                resource: { values },
            });

            await pool.execute(
                "UPDATE sync_data SET source_id = 'SYNCED' WHERE id = ?",
                [row.id]
            );
            console.log(`MySQL Row ${row.id} synced to Sheet.`);
        }
    } catch (err) {
        console.error("Error in DB to Sheet sync:", err.message);
    }
}

// Poll every 5 seconds
setInterval(syncDbToSheet, 5000);

app.get('/view-db', async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM sync_data");
        res.json(rows); 
    } catch (err) {
        res.status(500).send("Error fetching data: " + err.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sync Engine running on port ${PORT}`));