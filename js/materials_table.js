document.addEventListener('globalsReady', async () => {
    try {
        let materialOrderIDs = document.getElementById('materialOrderIDs').textContent;
        materialOrderIDs = materialOrderIDs.replace(/\n/g, '').split(',').map(id => id.trim()).filter(id => id.length > 0); //clean up
        const response = await fetch(`${window.GLOBALS.apiBaseUrl}?action=getMaterials&orders=`+materialOrderIDs.join(', '));
        if (!response.ok) throw new Error('Network response was not ok '+ response.statusText);
        
        let materialOrderNumbers = document.getElementById('materialOrderNumbers').textContent;
        materialOrderNumbers = materialOrderNumbers.replace(/\n/g, '').split(',').map(id => id.trim()).filter(id => id.length > 0); //clean up
        let materialOrderDates = document.getElementById('materialOrderDueDates').textContent;
        materialOrderDates = materialOrderDates.replace(/\n/g, '').split(',').map(id => id.trim()).filter(id => id.length > 0); //clean up
        //join materialsOrders
        let materialOrders = [];
        materialOrderIDs.forEach((id, index) => {
            materialOrders[id] = {
                OrderNumber: materialOrderNumbers[index],
                Date: materialOrderDates[index]
            };
        });     

        const materialsData = await response.json();
        window.GLOBALS.data.materials = materialsData;
        fillMaterialsTable(materialsData);
        fillMaterialsTableDetails(materialsData, materialOrders);
    } catch (error) {
        console.error('There has been a problem with your fetch operation:', error);
    }
    
    window.showTable = function(tableID){
        const materialsTable = document.getElementById('materialsTable');
        const materialsTable_details = document.getElementById('materialsTable_details');
        if(tableID == "materialsTable"){
            materialsTable.classList.remove('hidden');
            materialsTable_details.classList.add('hidden');
        } else {
            materialsTable.classList.add('hidden');
            materialsTable_details.classList.remove('hidden');
        }
    }

    document.getElementById('btnSummary').addEventListener('click', () => showTable('materialsTable'));
    document.getElementById('btnDetails').addEventListener('click', () => showTable('materialsTable_details'));
   
    function fillMaterialsTable(data){
        const materialsTableBody = document.getElementById('materialsTable').getElementsByTagName('tbody')[0];
        materialsTableBody.innerHTML = '';
        const categories = { 
            'Top hat': {}, 'Angles': {}, 'Screws': {}, 
            'Caulking Glue': {}, 'Packers': {}, 'Tapes': {}, 'Others': {} 
        };
        
        data.forEach(material => {
            let category = material.Category;
            const itemID = material.ItemID;
            if(!categories.hasOwnProperty(material.Category)) category = 'Others';

            if(!categories[category][itemID]){
                categories[category][itemID] = {
                    Name: material.Name,
                    SubCategory: material.SubCategory,
                    Description: material.Description,
                    Total: 0
                };
            }
            
            categories[category][itemID].Total += Number(material.Quantity);
        });

        for(const [category, items] of  Object.entries(categories)){
            //if(Object.keys(items).length === 0) continue;
            const categoryRow = materialsTableBody.insertRow();
            categoryRow.innerHTML = `<td colspan="4" class="category">${category}</td>`;
            for(const [itemID, item] of Object.entries(items)){
                const itemRow = materialsTableBody.insertRow();
                itemRow.classList.add('item');
                itemRow.innerHTML = `
                    <td>${item.Name}</td>
                    <td>${item.SubCategory}</td>
                    <td>${item.Description}</td>
                    <td>${item.Total}</td>
                `;
            }            
        }

    }

    function fillMaterialsTableDetails(data, ordersData){
        const materialsTableBody = document.getElementById('materialsTable_details').getElementsByTagName('tbody')[0];
        materialsTableBody.innerHTML = '';
        const categories = { 
            'Top hat': {}, 'Angles': {}, 'Screws': {}, 
            'Caulking Glue': {}, 'Packers': {}, 'Tapes': {}, 'Others': {} 
        };

        data.forEach(material => {
            let category = material.Category;
            if(!categories.hasOwnProperty(material.Category)) category = 'Others';
            if(!categories[category].hasOwnProperty(material.ItemID)) categories[category][material.ItemID] = [];

            categories[category][material.ItemID].push(Object.assign({}, material, ordersData[material.OrderID]));            
        });

        for(const [category, items] of Object.entries(categories)){
            const categoryRow = materialsTableBody.insertRow();
            categoryRow.innerHTML = `<td colspan="6" class="category">${category}</td>`;
            for(const [itemID, item] of Object.entries(items)){
                item.forEach(material => {
                    const itemRow = materialsTableBody.insertRow();
                    itemRow.classList.add('item');
                    itemRow.innerHTML = `
                        <td>${material.OrderNumber}</td>
                        <td>${material.Date}</td>
                        <td>${material.Name}</td>
                        <td>${material.Description}</td>
                        <td>${material.UserSpecification}</td>
                        <td>${material.Quantity}</td>
                    `;
                });
            }
        };
    }

    // Simulando los datos para probar
    const data = [
        {
            ItemID: "ANG-20X40-16",
            Category: "Angles",
            SubCategory: "Steel",
            Name: "Angle 20x40 1.6mm",
            Description: "20x40mm Steel Angle, 1.6mm thickness",
            UserSpecification: "ASTM A36",
            Quantity: 50
        },
        {
            ItemID: "ANG-20X40-16", // Mismo ItemID (sumará 50 + 30 = 80)
            Category: "Angles",
            SubCategory: "Steel",
            Name: "Angle 20x40 1.6mm",
            Description: "20x40mm Steel Angle, 1.6mm thickness",
            UserSpecification: "ASTM A36",
            Quantity: 30
        },
        {
            ItemID: "ANG-25X50-30",
            Category: "Angles",
            SubCategory: "Aluminum",
            Name: "Angle 25x50 3.0mm",
            Description: "25x50mm Aluminum Angle, 3.0mm thickness",
            UserSpecification: "DIN 912",
            Quantity: 20
        },
        {
            ItemID: "THT-35-15",
            Category: "Top Hats",
            SubCategory: "Galvanized",
            Name: "Top Hat 35x15mm",
            Description: "Galvanized Steel Top Hat, 35x15mm",
            UserSpecification: "ISO 4032",
            Quantity: 100
        },
        {
            ItemID: "SCR-PH2-50",
            Category: "Screws",
            SubCategory: "Stainless Steel",
            Name: "Phillips Screw 5.0x50mm",
            Description: "Stainless Steel Phillips Head Screw, 5.0x50mm",
            UserSpecification: "SAE J429",
            Quantity: 200
        },
        {
            ItemID: "SCR-PH2-50", // Mismo ItemID (sumará 200 + 150 = 350)
            Category: "Screws",
            SubCategory: "Stainless Steel",
            Name: "Phillips Screw 5.0x50mm",
            Description: "Stainless Steel Phillips Head Screw, 5.0x50mm",
            UserSpecification: "SAE J429",
            Quantity: 150
        },
        {
            ItemID: "GLU-SIKA-250",
            Category: "Caulking Glue",
            SubCategory: "Silicone",
            Name: "SikaFlex-250",
            Description: "Polyurethane Sealant, 310ml Cartridge",
            UserSpecification: "ASTM C920",
            Quantity: 30
        },
        {
            ItemID: "PAC-5MM",
            Category: "Packers",
            SubCategory: "Plastic",
            Name: "5mm Plastic Packers",
            Description: "5mm Thick Plastic Shims",
            UserSpecification: "ISO 9001",
            Quantity: 500
        },
        {
            ItemID: "TAP-AL-50",
            Category: "Tapes",
            SubCategory: "Aluminum",
            Name: "Aluminum Foil Tape 50mm",
            Description: "50mm Wide Aluminum Foil Tape",
            UserSpecification: "UL 723",
            Quantity: 80
        },
        {
            ItemID: "OTH-WD-10",
            Category: "Others",
            SubCategory: "Wood",
            Name: "Wooden Dowel 10mm",
            Description: "10mm Diameter Hardwood Dowel",
            UserSpecification: "ANSI/HPVA HP-1-2020",
            Quantity: 60
        }
    ];

    // Llenar las tablas con los datos
    //fillMaterialsTable(data);
});