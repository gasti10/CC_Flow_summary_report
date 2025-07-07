function doGet(e) {
    try {
      const action = e.parameter.action; // Leer el parámetro "action"
      const userIp = e.parameter["X-Forwarded-For"] || "Unknown IP";
      Logger.log("IP ---> " + userIp);
      
      // Validar que se proporcione una acción
      if (!action) throw new Error("Missing 'action' parameter.");
      
      // Switch para manejar diferentes acciones
      switch (action) {
        case "hello":
          return ContentService.createTextOutput("Hello, World!").setMimeType(ContentService.MimeType.TEXT);
        case "getSheets":
          return handleGetSheets(e);
        case "getMaterials":
          return handleGetMaterials(e);
        default:
          throw new Error(`Unknown action: '${JSON.stringify(e,null,2)}'`);
      }
    } catch (error) {
      Logger.log(error + ' - Message: ' + error.message);
      // Manejar errores y enviar un mensaje claro
      return ContentService.createTextOutput(JSON.stringify({
          error: true,
          message: error.message
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  function handleGetSheets(e){
    const projectName = e.parameter.project;
    if (!projectName) throw new Error("Missing 'project' parameter.");
    //const sheetsFilter = "Filter(Sheets, AND([Project]='Reflections - Sea Tower 1', [Off Cut]=false))";
    const sheetsFilter = 'Filter(Sheets, AND([Project]=' + JSON.stringify(projectName) + ', [Off Cut]=false))';
    let sheetsData = get_from_api(sheetsFilter, "Sheets");
    //Logger.log(sheetsData);
    const sheetInventoryIds = sheetsData.map(sheet => sheet["Related Sheets Inventorys"] || "").flatMap(ids => ids.split(" , ").filter(id => id));
    //Logger.log(sheetInventoryIds);
    const filterConditions = sheetInventoryIds.map(id => `[sheet_inventory_id]=${JSON.stringify(id)}`).join(", ");
    const filterSheetsInvetories = `Filter(Sheets Inventory, OR(${filterConditions}))`;
    const sheetsInventories = get_from_api(filterSheetsInvetories, "Sheets Inventory");
    //Logger.log(sheetsInventories);
  
    sheetsData = sheetsData.map(sheet => {
        // Filtrar filas de inventario relacionadas con esta Sheet
        const relatedInventory = sheetsInventories.filter(item => item.sheet === sheet["Sheet ID"]);
        if(relatedInventory.length === 0) return {...sheet, TotalReceived: 0, TotalUsed: 0};
        const totalReceived = relatedInventory.filter( inv => Number(inv.qty) > 0).reduce((sum, inv) => sum + Number(inv.qty), 0);
        const totalUsed = relatedInventory.filter( inv => Number(inv.qty) < 0).reduce((sum, inv) => sum + Math.abs(Number(inv.qty)), 0);
        return {
          ...sheet,
          TotalReceived: totalReceived,
          TotalUsed: totalUsed
        };
      }
    );
    //Logger.log(sheetsData);
  
    return ContentService.createTextOutput(JSON.stringify(sheetsData)).setMimeType(ContentService.MimeType.JSON);
  }
  
  function handleGetMaterials(e) {
    //Logger.log(e.parameter.orders);
    const orderIds = e.parameter.orders ? e.parameter.orders.split(',').map(id => id.trim()) : [];
    const itemsRequestFilter = `Filter(Items Request, IN([Order ID], {${orderIds.join(',')}}))`;
    //const itemsRequestFilter = `Filter(Items Request, IN([Order ID], {5368f2c3,e72c53ef,ac1659cb}))`;
    //Logger.log(itemsRequestFilter)
    let itemsRequestData = get_from_api(itemsRequestFilter, "Items Request");
  
    const itemIds = [...new Set(itemsRequestData.map(item => item["Item ID"]))];
    let itemsDetails = getItemDetails(itemIds);
  
    itemsRequestData = itemsRequestData.map(item => {
      const itemDetail = itemsDetails.find(detail => detail["Item ID"] === item["Item ID"]);
      return {
        ItemID: item['Item ID'],
        Category: item.Category,
        SubCategory: item['Sub Category'],
        Name: itemDetail ? itemDetail.Name : "Unknown Item", // Nombre del ítem
        Description: item['Description Material'],
        UserSpecification: item['Description'],
        Quantity: item.Quantity,
        OrderID: item['Order ID']
      };
    });
    return ContentService.createTextOutput(JSON.stringify(itemsRequestData)).setMimeType(ContentService.MimeType.JSON);
  }
  
  function getItemDetails(itemIds) {
    // Intentar obtener los datos del caché
    const cache = CacheService.getScriptCache();
    const cacheKey = '_items_all';
    let cachedItems = cache.get(cacheKey);
    cachedItems = JSON.parse(cachedItems);
  
    if (!cachedItems || cachedItems.length == 0) {
      // Si no están en el caché, hacer la consulta a la API de AppSheet
      const itemsFilter = `Filter(Items, true)`; 
      cachedItems = get_from_api(itemsFilter, "Items");
      // Filtrar los datos para quedarse solo con los campos necesarios
      cachedItems = cachedItems.map(item => {
        return {
          "Item ID": item["Item ID"],
          "Category": item["Category"],
          "Name": item["Name"],
          "Detailed Specification": item["Detailed Specification"]
        };
      });
      // Almacenar los detalles de los ítems en el caché
      cache.put(cacheKey, JSON.stringify(cachedItems), 7200); // Guardamos por 7200 segundos (2 horas)
    }
  
    return cachedItems.filter(item => itemIds.includes(item['Item ID']));
  }

  function create_from_api(record, table) {  
    var url = "https://api.appsheet.com/api/v2/apps/" + appId + "/tables/" + table + "/Action?applicationAccessKey="+apiKey;
  
    var payload = {
      "Action": "Add",
      "Properties": {
        "Locale": "en-AU",
        "Location": "-28.0167, 153.4000",
        "Timezone": "E. Australia Standard Time"
      },
      "Rows": [record]
    };
  
    var options = {
      "method": "POST",
      "contentType": "application/json",
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };
  
    try {
      var response = UrlFetchApp.fetch(url, options);
      Logger.log(url+" --> response: "+response);
    } catch (e) {
      Logger.log("Error: " + e.toString());
      Logger.log("Response: " + e.response.getContentText());
    }
  }

  function get_from_api(filter = '', table) {
    const encodeTable = encodeURIComponent(table); 
    var url = "https://api.appsheet.com/api/v2/apps/" + appId + "/tables/" + encodeTable + "/Action?applicationAccessKey="+apiKey;
  
    var payload = {
      "Action": "Find",
      "Properties": {
        "Locale": "en-AU",
        "Location": "-28.0167, 153.4000",
        "Selector": filter,
        "Timezone": "E. Australia Standard Time"
      },
      "Rows": []
    };
  
    var options = {
      "method": "POST",
      "contentType": "application/json",
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };
  
    try {
      var response = UrlFetchApp.fetch(url, options);
      Logger.log(url+" --> response: "+response);
      return JSON.parse(response.getContentText());
    } catch (e) {
      Logger.log("Error: " + e.toString());
      Logger.log("Response: " + e.response.getContentText());
      return [];
    }
  }
  
  function delete_from_api(rows = [{}],table="") {
    var url = "https://api.appsheet.com/api/v2/apps/" + appId + "/tables/" + table + "/Action?applicationAccessKey="+apiKey;
  
    if (typeof rows === 'string') {
      rows = JSON.parse(rows);
    }
  
    var payload = {
      "Action": "Delete",
      "Properties": {
        "Locale": "en-AU",
        "Location": "-28.0167, 153.4000",
        "Timezone": "E. Australia Standard Time"
      },
      "Rows": rows
    };
    
    var options = {
      "method": "POST",
      "contentType": "application/json",
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };
  
    try {
      var response = UrlFetchApp.fetch(url, options);
      Logger.log(url+" --> OK DELETED! "+response);
      //Logger.log(url+" --> response: "+response);
      return response;
      //return [];
    } catch (e) {
      Logger.log("Error: " + e.toString());
      Logger.log("Response: " + e.response);
      return [];
    }
  }