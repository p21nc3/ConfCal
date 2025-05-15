// Google Charts Loader with improved error handling and initialization
(function() {
  console.log('Initializing Google Charts Loader');
  
  const loadGoogleCharts = () => {
    return new Promise((resolve, reject) => {
      // Check if Google Charts is already available
      if (window.google && window.google.visualization) {
        console.log('Google Charts already loaded, resolving immediately');
        resolve(window.google.visualization);
        return;
      }

      // If google object exists but visualization doesn't, load the package
      if (window.google && window.google.charts) {
        console.log('Google Charts base loaded, loading visualization package');
        google.charts.load('current', {'packages':['gantt']});
        google.charts.setOnLoadCallback(() => {
          console.log('Google Charts packages loaded and ready');
          resolve(window.google.visualization);
        });
        return;
      }

      // If neither exists, we need to load the script first
      console.log('Loading Google Charts from CDN');
      const chartScript = document.createElement('script');
      chartScript.type = 'text/javascript';
      chartScript.src = 'https://www.gstatic.com/charts/loader.js';
      chartScript.async = true;
      
      chartScript.onload = () => {
        console.log('Google Charts Library loaded successfully');
        if (window.google && window.google.charts) {
          google.charts.load('current', {'packages':['gantt']});
          google.charts.setOnLoadCallback(() => {
            console.log('Google Charts packages loaded and ready');
            resolve(window.google.visualization);
          });
        } else {
          reject(new Error('Google Charts object not available after script load'));
        }
      };
      
      chartScript.onerror = (error) => {
        console.error('Failed to load Google Charts Library:', error);
        reject(new Error('Failed to load Google Charts Library'));
      };
      
      // Remove any existing Google Charts script to prevent conflicts
      const existingScript = document.querySelector('script[src="https://www.gstatic.com/charts/loader.js"]');
      if (existingScript) {
        existingScript.remove();
      }
      
      document.head.appendChild(chartScript);
    });
  };

  const loadConferenceData = async () => {
    console.log('Starting to load conference data');
    try {
      // Fix: Use the standard Google Sheets ID format without any extra characters
      const sheetId = '18Qt_tHtdUPTXQMDyoiHjDi8ELiOBF7mUv-BAF-lltbg'; // Reverting to original working sheet ID
      // Use the 'gviz' API which is more reliable for CSV export
      const response = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const csvText = await response.text();
      console.log('Raw CSV data received:', csvText.substring(0, 200) + '...');
      
      // Split into lines and remove empty lines
      const lines = csvText.split('\n').filter(line => line.trim());
      console.log(`Found ${lines.length} lines in CSV`);
      
      // Skip header row and process each line
      const conferences = lines.slice(1).map(line => {
        // Handle quoted CSV properly
        const columns = line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
        return {
          conf_id: columns[0],
          conf_name: columns[1],
          registration: columns[2],
          notification: columns[3],
          tags: columns[4],
          link: columns[5]
        };
      }).filter(conf => 
        conf.conf_id &&
        conf.conf_name && 
        conf.registration && 
        conf.notification &&
        conf.registration.match(/^\d{2}\/\d{2}\/\d{4}$/) && 
        conf.notification.match(/^\d{2}\/\d{2}\/\d{4}$/)
      );

      console.log('Processed conference data:', conferences);
      return conferences;
    } catch (error) {
      console.error('Error loading conference data:', error);
      throw error;
    }
  };

  // Initialize loader and load data
  Promise.all([loadGoogleCharts(), loadConferenceData()])
    .then(([visualization, conferences]) => {
      console.log('Google Charts and conference data loaded successfully');
      window.dispatchEvent(new CustomEvent('googleChartsLoaded', {
        detail: { conferences }
      }));
    })
    .catch(error => {
      console.error('Initialization failed:', error);
      const errorEvent = new CustomEvent('googleChartsError', { detail: error });
      window.dispatchEvent(errorEvent);
    });
})();