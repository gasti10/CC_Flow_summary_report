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
            const accordionBody = accordionItem.querySelector('.accordion-body');

            // Alternar la clase "active"
            const isActive = accordionItem.classList.contains('active');
            document.querySelectorAll('.accordion-item.active').forEach(item => {
                item.classList.remove('active');
                const body = item.querySelector('.accordion-body');
                body.style.maxHeight = null; // Resetea el alto
            });

            if (!isActive) {
                accordionItem.classList.add('active');
                console.log(' 1 scrollHeight:', accordionBody.scrollHeight);
                if(window.GLOBALS.data[header.id]) {
                    setTimeout(() => {
                        if(!window.GLOBALS.charts[header.id]) generateChart(window.GLOBALS.data[header.id], header.id);
                        else window.GLOBALS.charts[header.id].resize();
                        console.log(' 2 scrollHeight:', accordionBody.scrollHeight);
                        setTimeout(() => {
                            accordionBody.style.maxHeight = `${Math.min(accordionBody.scrollHeight, 500)}px`; // Máximo de 500px
                            console.log('3 scrollHeight:', accordionBody.scrollHeight);
                        }, 100);                        
                    }, 300);
                }
            }
        });
    });
});