# Conference Calendar Helper

A web application for tracking and managing conference schedules, deadlines, and notifications.

## Features

- Interactive timeline visualization of conferences
- Track registration and notification dates
- Automatic progress tracking
- Conference dependency management
- Responsive design

## Technologies Used

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Google Charts

## Local Development

### Prerequisites

- Node.js & npm - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Setup

```sh
# Install dependencies
npm install

# Start development server
npm run dev
```

## Docker Deployment

You can run the application using either Docker or Docker Compose.

### Using Docker Compose (Recommended)

```sh
# Start the application
docker compose up -d

# Stop the application
docker compose down
```

The application will be available at `http://localhost:8090`

### Using Docker directly

```sh
# Build the Docker image
docker build -t conference-calendar .

# Run the container
docker run -p 8090:80 conference-calendar
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Google Apps Script Integration

This project includes a Google Apps Script that fetches top-rated conferences (A++, A*, A+, A) from the CFP JSON endpoint and updates the Google Sheet automatically.

### Setup Instructions

1. Open the Google Sheet at [this link](https://docs.google.com/spreadsheets/d/18Qt_tHtdUPTXQMDyoiHjDi8ELiOBF7mUv-BAF-lltbg/edit?gid=0#gid=0)
2. Go to **Extensions → Apps Script**
3. Copy and paste the script from the file `apps_script/fetch_top_conferences.gs` in this repository
4. Save the script and run the `importTopCFPs()` function to test
5. Set up a trigger to run automatically:
   - Click on **Triggers** (clock icon) in the left sidebar
   - Click **Add Trigger**
   - Configure a time-driven trigger as needed (daily/weekly)

The script will fetch the latest conference data, filter for top-rated venues, and update the sheet automatically.