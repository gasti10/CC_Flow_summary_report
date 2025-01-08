document.addEventListener('DOMContentLoaded', () => { async () => {
    const projectName = document.getElementById('projectName').textContent;
    // Datos simulados: reemplaza esto con la llamada al backend para obtener el JSON
    const apiUrl = `https://script.google.com/macros/s/AKfycby0imLlKjegWFr29LKgHWEa4RdaApP7Au8h2i3jdcrvH6GuBbyVmuhKjP898Bq4tvuf/exec`;
    
    try {
        const response = await fetch(`${apiUrl}?action=getSheets&project=${encodeURIComponent(projectName)}`);
        if (!response.ok) {
            throw new Error('Network response was not ok '+ response.statusText);
        }
        const sheetsData = await response.json();

        generateChart(sheetsData);
    } catch (error) {
        console.error('There has been a problem with your fetch operation:', error);
    }
}});

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
    new Chart(ctx, {
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
            plugins: {
                legend: {
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Sheets Overview by Details'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Sheets'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantity'
                    }
                }
            }
        }
    });
}

    
