document.addEventListener('globalsReady', async () => {   
    try {
        const projectName = document.getElementById('projectName').textContent;
        const response = await fetch(`${window.GLOBALS.apiBaseUrl}?action=getSheets&project=${encodeURIComponent(projectName)}`);
        if (!response.ok) throw new Error('Network response was not ok '+ response.statusText);
        const sheetsData = await response.json();
        window.GLOBALS.data.sheets = sheetsData;
        //generateChart(sheetsData);
    } catch (error) {
        console.error('There has been a problem with your fetch operation:', error);
    }
});

function generateChart(sheetsData) {
    if (sheetsData.length === 0) {
        console.error('No data to display');
        return;
    }

    // 1. Preparar datos para el gráfico
    const sheets = sheetsData.map(sheet => sheet.Sheet);
    const totalReceived = sheetsData.map(sheet => sheet.TotalReceived);
    const totalUsed = sheetsData.map(sheet => sheet.TotalUsed);

    // 2. Crear el gráfico de barras vertical
    const ctx = document.getElementById('sheetsChart').getContext('2d');
    const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sheets,
                datasets: [
                    {
                        label: 'Total Received',
                        data: totalReceived,
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Total Used',
                        data: totalUsed,
                        backgroundColor: 'rgba(255, 99, 132, 0.6)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        bottom: 30
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        font: {
                            size: 20, 
                            weight: 'bold'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Sheets Overview by Details',
                        font: {
                            size: 24, 
                            weight: 'bold'
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Sheets',
                            font: {
                                size: 22, 
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            autoSkip: true, 
                            maxRotation: 45, 
                            minRotation: 0,
                            font: {
                                size: 20, 
                                weight: 'bold'
                            }, 
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Quantity',
                            font: {
                                size: 22, 
                                weight: 'bold'
                            },
                        },
                        ticks: {
                            font: {
                                size: 20, 
                                weight: 'bold'
                            }
                        } 
                    }
                }
            }
        });
    window.GLOBALS.charts.sheets = chart;
}

    
