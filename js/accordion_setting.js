document.addEventListener('DOMContentLoaded', () => {
    new Accordion('#accordion', {
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
                if(window.GLOBALS.charts[header.id]) {
                    window.GLOBALS.charts[header.id].update();
                    window.GLOBALS.charts[header.id].resize();
                }
                accordionItem.classList.add('active');
            }
        });
    });
});