import { Conference } from '../types/conference';
import ConferenceTimeline from '../components/ConferenceTimeline';
import { DatePickerWithRange } from '../components/DateRangePicker';
import { MultiSelect } from '../components/MultiSelect';
import { useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { addMonths } from 'date-fns';

const Index = () => {
  // Get current date and date 18 months in the future
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const eighteenMonthsLater = addMonths(startOfMonth, 18);

  const [conferences, setConferences] = useState<Conference[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth,
    to: eighteenMonthsLater
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConferences = async () => {
      try {
        // Use the gviz API format for Google Sheets - Reverting to original working sheet ID
        const sheetId = '18Qt_tHtdUPTXQMDyoiHjDi8ELiOBF7mUv-BAF-lltbg';
        const response = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        console.log('Raw CSV data:', csvText);
        
        // Split into lines and remove empty lines
        const lines = csvText.split('\n').filter(line => line.trim());
        
        // Skip header row and process each line
        const parsedConferences: Conference[] = lines.slice(1).map(line => {
          // Split by comma and clean the data
          const columns = line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
          
          console.log('Processing line:', columns);
          
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
          conf.registration.match(/^\d{2}\/\d{2}\/\d{4}$/) && // Validate date format
          conf.notification.match(/^\d{2}\/\d{2}\/\d{4}$/)
        );

        console.log('Parsed conferences:', parsedConferences);

        if (parsedConferences.length === 0) {
          throw new Error('No valid conferences found in the data');
        }

        setConferences(parsedConferences);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching conferences:', error);
        setLoading(false);
      }
    };

    fetchConferences();
  }, []);

  const allTags = Array.from(
    new Set(conferences.flatMap(conf => conf.tags.split(';')))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading conferences...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Conference Calendar</h1>
        <p className="text-gray-600 mb-8">
          Track academic conferences, deadlines, and notifications
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="space-y-2">
            <label className="text-sm font-medium">Date Range</label>
            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Filter by Tags</label>
            <MultiSelect
              options={allTags}
              selected={selectedTags}
              onChange={setSelectedTags}
            />
          </div>
        </div>

        <ConferenceTimeline 
          conferences={conferences}
          dateRange={dateRange}
          selectedTags={selectedTags}
        />
      </div>
    </div>
  );
};

export default Index;