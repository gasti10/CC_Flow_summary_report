document.addEventListener('DOMContentLoaded', () => {
    const rawString = document.getElementById('deliveryDates').textContent;
    // Remove newline characters
    const cleanedString = rawString.replace(/\r?\n|\r/g, ' ');
    // Now trim and split by commas
    const rawDates = cleanedString.trim().split(',');
    // Clean up spaces
    const trimmedDates = rawDates.map(d => d.trim());
  
    // Now parse each date string
    // Format is "DD/MM/YYYY HH:MM:SS"
    // We need to convert it to something parseable by JavaScript Date
    // For example, split by ' ' to separate date and time
    const parsedDates = trimmedDates.map(dt => {
      const [datePart, timePart] = dt.split(' ');
      const [day, month, year] = datePart.split('/');
      // Rearrange to ISO format: "YYYY-MM-DDTHH:MM:SS"
      const isoString = `${year}-${month}-${day}T${timePart}`;
      return new Date(isoString);
    });
  
    // Now you have an array of JavaScript Date objects
    // You can aggregate them by day and count trips per day
    const dateCounts = {};
    parsedDates.forEach(dateObj => {
      const dayStr = dateObj.toISOString().split('T')[0]; // "YYYY-MM-DD"
      dateCounts[dayStr] = (dateCounts[dayStr] || 0) + 1;
    });
  
    const labels = Object.keys(dateCounts).sort();
    const data = labels.map(l => dateCounts[l]);
  
    // Now create a chart with Chart.js (assuming you included Chart.js and a canvas)
    const chartContainer = document.createElement('div');
    chartContainer.innerHTML = `<h3>Trips Over Time</h3><canvas id="tripChart" width="400" height="200"></canvas>`;
    document.body.appendChild(chartContainer);
  
    const ctx = document.getElementById('tripChart').getContext('2d');
  
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Trips per Day',
          data: data,
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76,175,80,0.2)',
          fill: true,
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'day'
            }
          },
          y: { beginAtZero: true }
        },
        plugins: {
          title: {
            display: true,
            text: 'Number of Trips by Date'
          }
        }
      }
    });
  });
  