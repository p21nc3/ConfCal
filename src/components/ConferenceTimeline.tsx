import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Conference, ConferenceWithDates } from '../types/conference';
import { processConferences, formatDate, getTagColor } from '../utils/conference';
import { Badge } from './ui/badge';
import { DateRange } from 'react-day-picker';
import { Button } from './ui/button';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { toast } from 'sonner';

interface Props {
  conferences: Conference[];
  dateRange: DateRange | undefined;
  selectedTags: string[];
}

declare global {
  interface Window {
    google: any;
  }
}

const ConferenceTimeline: React.FC<Props> = ({ conferences: propConferences, dateRange, selectedTags }) => {
  console.log('ConferenceTimeline component mounting');
  const [conferences, setConferences] = useState<Conference[]>(propConferences);
  console.log('Initial conferences state:', conferences);
  
  const [selectedConference, setSelectedConference] = useState<ConferenceWithDates | null>(null);
  const [showResubmissions, setShowResubmissions] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<any>(null);
  const [isChartLoaded, setIsChartLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Log when props change
  useEffect(() => {
    console.log('Props updated:', { propConferences, dateRange, selectedTags });
  }, [propConferences, dateRange, selectedTags]);

  useEffect(() => {
    console.log('Setting up event listeners for Google Charts and data');
    
    const handleGoogleChartsLoaded = (event: CustomEvent<{ conferences: Conference[] }>) => {
      console.log('Google Charts loaded event received with data:', event.detail);
      setIsChartLoaded(true);
      if (event.detail?.conferences) {
        console.log('Setting conferences from loaded data:', event.detail.conferences);
        setConferences(event.detail.conferences);
      }
    };

    const handleGoogleChartsError = (event: CustomEvent<Error>) => {
      console.error('Google Charts error event received:', event.detail);
      setLoadError(event.detail.message);
      toast.error('Failed to load chart library');
    };

    window.addEventListener('googleChartsLoaded', handleGoogleChartsLoaded as EventListener);
    window.addEventListener('googleChartsError', handleGoogleChartsError as EventListener);

    // Check if Google Charts is already available
    if (window.google?.visualization) {
      console.log('Google Charts already available on component mount');
      setIsChartLoaded(true);
    }

    return () => {
      console.log('Cleaning up event listeners');
      window.removeEventListener('googleChartsLoaded', handleGoogleChartsLoaded as EventListener);
      window.removeEventListener('googleChartsError', handleGoogleChartsError as EventListener);
    };
  }, []);

  const processedConferences = useMemo(() => {
    console.log('Processing conferences in useMemo');
    if (!conferences || conferences.length === 0) {
      console.log('No conferences to process');
      return [];
    }

    let filtered = processConferences(conferences);
    console.log('Initial processed conferences:', filtered);

    if (dateRange?.from) {
      filtered = filtered.filter(conf => {
        const confDate = new Date(conf.registrationDate);
        return confDate >= dateRange.from!;
      });
    }
    if (dateRange?.to) {
      filtered = filtered.filter(conf => {
        const confDate = new Date(conf.notificationDate);
        return confDate <= dateRange.to!;
      });
    }
    if (selectedTags.length > 0) {
      filtered = filtered.filter(conf => 
        selectedTags.some(tag => conf.tags_array.includes(tag))
      );
    }

    console.log('Final filtered conferences:', filtered);
    return filtered.sort((a, b) => a.registrationDate.getTime() - b.registrationDate.getTime());
  }, [conferences, dateRange, selectedTags]);

  const findPossibleResubmissions = (conference: ConferenceWithDates) => {
    if (!processedConferences || processedConferences.length === 0) {
      return [];
    }

    return processedConferences.filter(conf => {
      const isDifferentConference = conf.conf_id !== conference.conf_id;
      const isAfterNotification = conf.registrationDate > conference.notificationDate;
      const hasMatchingTag = conf.tags_array.some(tag => 
        conference.tags_array.includes(tag)
      );

      return isDifferentConference && isAfterNotification && hasMatchingTag;
    });
  };

  const generateDependencies = (conferences: ConferenceWithDates[]) => {
    if (!conferences || conferences.length === 0) {
      return [];
    }

    const dependencies: { from: string; to: string }[] = [];
    const visited = new Set<string>();
    
    conferences.forEach((conf1) => {
      const possibleResubmissions = findPossibleResubmissions(conf1);
      possibleResubmissions.forEach((conf2) => {
        const key = `${conf1.conf_id}-${conf2.conf_id}`;
        const reverseKey = `${conf2.conf_id}-${conf1.conf_id}`;
        
        if (!visited.has(reverseKey)) {
          dependencies.push({
            from: conf1.conf_id,
            to: conf2.conf_id
          });
          visited.add(key);
        }
      });
    });
    
    console.log('Generated dependencies:', dependencies);
    return dependencies;
  };

  useEffect(() => {
    console.log('Setting up Google Charts event listeners');
    const handleGoogleChartsLoaded = () => {
      console.log('Google Charts loaded event received in component');
      setIsChartLoaded(true);
    };

    const handleGoogleChartsError = (event: CustomEvent) => {
      console.error('Google Charts error event received in component:', event.detail);
      setLoadError(event.detail.message);
      toast.error('Failed to load chart library');
    };

    if (window.google && window.google.visualization) {
      console.log('Google Charts already loaded in component');
      setIsChartLoaded(true);
      return;
    }

    window.addEventListener('googleChartsLoaded', handleGoogleChartsLoaded);
    window.addEventListener('googleChartsError', handleGoogleChartsError as EventListener);

    return () => {
      window.removeEventListener('googleChartsLoaded', handleGoogleChartsLoaded);
      window.removeEventListener('googleChartsError', handleGoogleChartsError as EventListener);
    };
  }, []);

  useEffect(() => {
    console.log('Chart drawing effect triggered', {
      isChartLoaded,
      hasRef: !!chartRef.current,
      loadError,
      processedConferencesLength: processedConferences.length,
      windowGoogle: !!window.google,
      windowGoogleViz: !!window.google?.visualization
    });

    if (!isChartLoaded || !chartRef.current || loadError) {
      console.log('Chart not ready:', { isChartLoaded, hasRef: !!chartRef.current, loadError });
      return;
    }

    console.log('Drawing chart with data:', processedConferences);

    const drawChart = () => {
      try {
        console.log('Creating DataTable');
        const data = new window.google.visualization.DataTable();
        data.addColumn('string', 'Task ID');
        data.addColumn('string', 'Task Name');
        data.addColumn('date', 'Start Date');
        data.addColumn('date', 'End Date');
        data.addColumn('number', 'Duration');
        data.addColumn('number', 'Percent Complete');
        data.addColumn('string', 'Dependencies');

        if (!processedConferences || processedConferences.length === 0) {
          console.log('No conferences to display, adding empty row');
          const today = new Date();
          const futureDate = new Date();
          futureDate.setDate(today.getDate() + 30);
          
          data.addRows([
            ['no_data', 'No conferences found', today, futureDate, 30, 0, null]
          ]);
        } else {
          console.log('Processing conferences for chart');
          const dependencies = generateDependencies(processedConferences);
          console.log('Generated dependencies:', dependencies);
          
          const dependencyMap = new Map<string, string>();
          dependencies.forEach(({ from, to }) => {
            const existing = dependencyMap.get(to);
            if (existing) {
              dependencyMap.set(to, `${existing},${from}`);
            } else {
              dependencyMap.set(to, from);
            }
          });

          const today = new Date();
          
          const rows = processedConferences.map(conf => {
            // Validate dates to prevent NaN errors
            if (!conf.registrationDate || !conf.notificationDate || 
                isNaN(conf.registrationDate.getTime()) || isNaN(conf.notificationDate.getTime())) {
              console.error('Invalid dates for conference:', conf);
              return null;
            }
            
            // Ensure end date is after start date
            let regDate = conf.registrationDate;
            let notifDate = conf.notificationDate;
            
            if (regDate >= notifDate) {
              console.warn('Registration date is after or equal to notification date, adjusting:', conf);
              notifDate = new Date(regDate.getTime());
              notifDate.setDate(notifDate.getDate() + 1); // Add one day to ensure valid duration
            }
            
            const duration = Math.max(
              1, // Minimum 1 day
              Math.ceil((notifDate.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24))
            );

            let percentComplete = 0;
            if (today > notifDate) {
              percentComplete = 100;
            } else if (regDate <= today && notifDate >= today) {
              const totalDuration = notifDate.getTime() - regDate.getTime();
              const remainingDuration = notifDate.getTime() - today.getTime();
              percentComplete = Math.round((1 - (remainingDuration / totalDuration)) * 100);
            }

            const formattedName = conf.conf_id + (conf.isRollover ? ' (Anticipated)' : '');
            console.log('Adding row:', {
              id: conf.conf_id,
              name: formattedName,
              start: regDate,
              end: notifDate,
              duration,
              percentComplete,
              dependencies: dependencyMap.get(conf.conf_id)
            });

            return [
              conf.conf_id,
              formattedName,
              regDate,
              notifDate,
              duration,
              percentComplete,
              dependencyMap.get(conf.conf_id) || null
            ];
          })
          .filter(row => row !== null); // Remove any invalid rows
          
          console.log('Chart rows prepared:', rows);
          data.addRows(rows);
        }

        const options = {
          height: Math.max(processedConferences.length * 45, 400),
          width: '100%',
          gantt: {
            trackHeight: 40,
            criticalPathEnabled: false,
            labelStyle: {
              fontName: 'Arial',
              fontSize: 13,
              color: '#7E69AB'
            },
            arrow: {
              angle: 100,
              width: 1,
              color: '#E53E3E',
              radius: 0
            }
          },
          backgroundColor: '#ffffff'
        };

        console.log('Drawing chart with options:', options);

        if (chartInstance.current) {
          console.log('Clearing existing chart');
          chartInstance.current.clearChart();
        }

        console.log('Creating new chart instance');
        chartInstance.current = new window.google.visualization.Gantt(chartRef.current);
        
        try {
          chartInstance.current.draw(data, options);
          console.log('Chart drawing completed successfully');
        } catch (drawError) {
          console.error('Error during chart draw operation:', drawError);
          // Fall back to basic display if chart fails
          if (chartRef.current) {
            chartRef.current.innerHTML = `
              <div class="p-4 text-red-500 border border-red-200 rounded">
                <p>Error displaying chart. Please check console for details.</p>
                <p>Try refreshing the page or check the data format.</p>
              </div>
            `;
          }
        }

        if (processedConferences && processedConferences.length > 0) {
          window.google.visualization.events.addListener(chartInstance.current, 'select', () => {
            const selection = chartInstance.current.getSelection();
            if (selection && selection.length > 0) {
              const conf = processedConferences[selection[0].row];
              setSelectedConference(conf);
            }
          });
        }
      } catch (error) {
        console.error('Error drawing chart:', error);
        setLoadError(error.toString());
        toast.error('Error drawing chart');
      }
    };

    drawChart();

    const handleResize = () => {
      console.log('Window resize detected, redrawing chart');
      drawChart();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isChartLoaded, processedConferences, loadError]);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-white p-6 rounded-lg shadow-sm border">
        <div className="text-red-500">
          Failed to load chart: {loadError}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border h-[calc(100vh-12rem)]">
      <ScrollArea className="h-full w-full">
        <div className="space-y-2">
          <div ref={chartRef} id="chartDiv" className="min-w-[800px]" />
          
          {selectedConference && (
            <div className="p-4 bg-gray-50 rounded-lg border animate-slide-in">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-conference-primary">
                    {selectedConference.conf_name}
                    {selectedConference.isRollover && (
                      <Badge variant="outline" className="ml-2">
                        Anticipated
                      </Badge>
                    )}
                  </h3>
                  <div className="mt-2 space-x-2">
                    {selectedConference.tags_array && selectedConference.tags_array.map(tag => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className={`${getTagColor(tag)} hover:opacity-80 transition-opacity duration-200 transform hover:scale-105`}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                {selectedConference.link && (
                  <a
                    href={selectedConference.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-conference-network hover:text-conference-primary transition-colors duration-200"
                  >
                    Website →
                  </a>
                )}
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Registration:</span>{' '}
                  {formatDate(selectedConference.registrationDate)}
                </div>
                <div>
                  <span className="font-medium">Notification:</span>{' '}
                  {formatDate(selectedConference.notificationDate)}
                </div>
              </div>
              
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowResubmissions(!showResubmissions)}
                  className="w-full justify-between"
                >
                  Possible Resubmissions
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                    {findPossibleResubmissions(selectedConference).length}
                  </span>
                </Button>
                
                {showResubmissions && (
                  <div className="mt-3 space-y-2">
                    {findPossibleResubmissions(selectedConference).map(conf => (
                      <div key={conf.conf_id} className="p-3 bg-white rounded border hover:border-conference-primary transition-colors duration-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">
                              {conf.conf_name}
                              {conf.isRollover && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Anticipated
                                </Badge>
                              )}
                            </h4>
                            <div className="text-sm text-gray-500">
                              Registration: {formatDate(conf.registrationDate)}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {conf.tags_array.filter(tag => 
                              selectedConference.tags_array.includes(tag)
                            ).map(tag => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className={`${getTagColor(tag)} text-xs hover:opacity-80 transition-opacity duration-200 transform hover:scale-105`}
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <ScrollBar orientation="vertical" />
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default ConferenceTimeline;
