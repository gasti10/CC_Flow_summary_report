document.addEventListener('DOMContentLoaded', () => {
    new Accordion('.accordion', {
        duration: 300,
        showMultiple: false,
        collapse: true,
    });

    // Selecciona todos los encabezados del acordeón
    const accordionHeaders = document.querySelectorAll('.accordion-header');

    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            // Obtener el ítem padre
            const accordionItem = header.parentElement;

            // Alternar la clase "active"
            const isActive = accordionItem.classList.contains('active');
            document.querySelectorAll('.accordion-item.active').forEach(item => {
                item.classList.remove('active');
            });

            if (!isActive) {
                accordionItem.classList.add('active');
                if(window.GLOBALS.data[header.id]) {
                    setTimeout(() => {
                        generateChart(window.GLOBALS.data[header.id], header.id);
                        //window.GLOBALS.charts[header.id].resize();
                    }, 300);
                }
            }
        });
    });
});