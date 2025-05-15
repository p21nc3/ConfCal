# Conference Calendar Google Apps Script

This directory contains a Google Apps Script that automatically fetches top-rated conferences from the CFP JSON endpoint and updates the Google Sheet.

## Features

- Fetches conference data from the [CFP Timeline JSON](https://github.com/lucjaulmes/cfp-timeline)
- Filters for only top-rated conferences (A++, A*, A+, A)
- Formats dates in DD/MM/YYYY format
- Writes data to the specified Google Sheet
- Provides a custom menu for manual updates
- Can be scheduled to run automatically

## Setup Instructions

1. Open your [Google Sheet](https://docs.google.com/spreadsheets/d/18Qt_tHtdUPTXQMDyoiHjDi8ELiOBF7mUv-BAF-lltbg/edit?gid=0#gid=0)
2. In the Google Sheet, go to **Extensions → Apps Script**
3. Delete any existing code in the script editor
4. Copy the entire content of `fetch_top_conferences.gs` and paste it into the script editor
5. Save the script (Ctrl+S or Cmd+S) and give it a name like "Conference Calendar Updater"

## Running Manually

1. After setting up the script, reload your Google Sheet
2. You'll see a new menu item called "Conference Tools"
3. Click on **Conference Tools → Import Top Conferences**
4. The first time you run it, you'll need to authorize the script to:
   - Make external requests (to fetch the JSON)
   - Modify your spreadsheet

The script will then:
- Fetch the latest conference data
- Filter for top-rated venues
- Update your sheet with the filtered data

## Setting Up Automatic Updates

To have the script run automatically:

1. In the Apps Script editor, click on the **Triggers** icon in the left sidebar (clock icon)
2. Click the **+ Add Trigger** button in the bottom right
3. Configure the trigger:
   - Choose function: `importTopCFPs`
   - Event source: "Time-driven"
   - Type of time: Select "Day timer" for daily updates
   - Time of day: Choose when you want it to run
4. Click **Save**

Now the script will run automatically on your specified schedule.

## Troubleshooting

- Check the **Executions** page in the Apps Script dashboard to see logs and any errors
- If you get authorization errors, try running the function manually once to grant permissions
- If the JSON format changes, you may need to update the script

## Data Fields

The script writes the following fields to the sheet:

1. **conf_id**: Conference identifier
2. **conf_name**: Full name of the conference
3. **registration**: Abstract submission deadline (formatted as DD/MM/YYYY)
4. **notification**: Notification deadline (formatted as DD/MM/YYYY)
5. **tags**: Conference topics/tags (semicolon-separated)
6. **website**: Conference website URL 