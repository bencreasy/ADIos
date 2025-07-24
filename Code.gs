// Air Devils Inn - Inventory Management System
// Standalone Apps Script - Connects to External Sheet

// =============================================================================
// CONFIGURATION - Update these IDs for your sheets
// =============================================================================

const INVENTORY_SHEET_ID = '1_-unGCxpXr_ZECKntpPuE-ZK6xC-E09vhM9mtPkqJSk';
const INVENTORY_SHEET_NAME = 'Liquor'; // Your main inventory tab name

// =============================================================================
// MAIN WEB APP FUNCTIONS
// =============================================================================
function testDoGet() {
  // Simulate different page requests
  const homeRequest = doGet({parameter: {}});
  console.log('Home request result:', homeRequest);
  
  const receivingRequest = doGet({parameter: {page: 'receiving'}});
  console.log('Receiving request result:', receivingRequest);
  
  return 'Check execution log for results';
}

function doGet(e) {
  // Handle page routing for web app
  const page = (e && e.parameter && e.parameter.page) || 'home';
  
  console.log('Requested page:', page);
  console.log('All parameters:', e ? e.parameter : 'No parameters');
  
  try {
    return HtmlService.createHtmlOutputFromFile(page)
      .setTitle('Air Devils Inn - Inventory System')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    console.error('Error loading page:', page, error);
    // Return error page instead of fallback
    return HtmlService.createHtmlOutput(`
      <h1>Page Not Found</h1>
      <p>Requested page "${page}" not found.</p>
      <p>Available pages: home, receiving</p>
      <p><a href="?">Return to Home</a></p>
    `).setTitle('Air Devils Inn - Error');
  }
}

// =============================================================================
// DATA ACCESS FUNCTIONS
// =============================================================================
function testSheetAccess() {
  try {
    // This will trigger the authorization dialog
    const sheet = SpreadsheetApp.openById('1_-unGCxpXr_ZECKntpPuE-ZK6xC-E09vhM9mtPkqJSk');
    console.log('Sheet name:', sheet.getName());
    return 'Success: Can access sheet';
  } catch (error) {
    console.error('Error:', error);
    return 'Error: ' + error.toString();
  }
}
function testFirstSheet() {
  try {
    const spreadsheet = SpreadsheetApp.openById('1_-unGCxpXr_ZECKntpPuE-ZK6xC-E09vhM9mtPkqJSk');
    const sheet = spreadsheet.getSheets()[0]; // Get first sheet
    
    console.log('First sheet name:', sheet.getName());
    
    const data = sheet.getDataRange().getValues();
    console.log('Data rows:', data.length);
    console.log('First row:', data[0]);
    
    return { success: true, sheetName: sheet.getName(), rows: data.length };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: error.toString() };
  }
}

function listAllSheets() {
  try {
    const spreadsheet = SpreadsheetApp.openById('1_-unGCxpXr_ZECKntpPuE-ZK6xC-E09vhM9mtPkqJSk');
    const sheets = spreadsheet.getSheets();
    
    console.log('Found', sheets.length, 'sheets:');
    sheets.forEach((sheet, index) => {
      console.log(`Sheet ${index}: "${sheet.getName()}"`);
    });
    
    return sheets.map(sheet => sheet.getName());
  } catch (error) {
    console.error('Error listing sheets:', error);
    return error.toString();
  }
}

function testConnection() {
  try {
    console.log('Testing connection to external sheet...');
    console.log('Sheet ID:', INVENTORY_SHEET_ID);
    
    const sheet = SpreadsheetApp.openById(INVENTORY_SHEET_ID).getSheetByName(INVENTORY_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    
    console.log('✅ Connected successfully!');
    console.log('Found', data.length - 1, 'inventory items');
    console.log('Columns:', data[0]);
    console.log('Sample item:', data[1]);
    
    return { 
      success: true, 
      itemCount: data.length - 1,
      sheetName: sheet.getName(),
      columns: data[0],
      sampleItem: data[1]
    };
  } catch (error) {
    console.error('❌ Connection failed:', error);
    return { 
      success: false, 
      error: error.toString(),
      sheetId: INVENTORY_SHEET_ID,
      sheetName: INVENTORY_SHEET_NAME
    };
  }
}

function getInventoryData() {
  try {
    const sheet = SpreadsheetApp.openById(INVENTORY_SHEET_ID).getSheetByName(INVENTORY_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return []; // No data besides headers
    }
    
    // Skip header row, format data for frontend
    return data.slice(1).map((row, index) => ({
      rowIndex: index + 2, // +2 because we skipped header and sheets are 1-based
      itemId: row[0] || '',        // Column A - Item ID  
      itemName: row[1] || '',      // Column B - Item name
      type: row[2] || '',          // Column C - Type/Category
      unitCost: row[3] || 0,       // Column D - Unit Cost
      stock: row[4] || 0,          // Column E - Current Stock
      status: row[5] || '',        // Column F - Status
      caseSize: row[6] || null,    // Column G - Case Size (new)
      pourCost: row[7] || 0,       // Column H - Pour Cost (new)
      reorderPoint: row[8] || 0    // Column I - Reorder Point (new)
    })).filter(item => item.itemName); // Filter out empty rows
  } catch (error) {
    console.error('Error getting inventory data:', error);
    return [];
  }
}

// =============================================================================
// RECEIVING FUNCTIONS
// =============================================================================

function addReceiving(itemName, quantity, unitCost, supplier, isStockCount = false) {
  try {
    console.log(`Processing ${isStockCount ? 'stock count' : 'receiving'} for ${itemName}`);
    
    const sheet = SpreadsheetApp.openById(INVENTORY_SHEET_ID).getSheetByName(INVENTORY_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    
    // Find the item row by name
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === itemName) { // Column B = Item name
        const currentStock = parseInt(data[i][4]) || 0; // Column E = Current Stock
        let newStock;
        let logType;
        let discrepancy = 0;
        
        if (isStockCount) {
          // Stock count: SET to new quantity (not add)
          newStock = parseInt(quantity);
          discrepancy = newStock - currentStock;
          logType = 'Stock Count';
          
          console.log(`Stock count: ${itemName} from ${currentStock} to ${newStock} (${discrepancy > 0 ? '+' : ''}${discrepancy})`);
          
        } else {
          // Regular receiving: ADD quantity
          newStock = currentStock + parseInt(quantity);
          logType = 'Receiving';
          
          console.log(`Receiving: ${quantity} of ${itemName}, stock ${currentStock} → ${newStock}`);
        }
        
        // Update stock in inventory sheet
        sheet.getRange(i + 1, 5).setValue(newStock); // Column E (stock)
        
        // Update status to "In stock" if it was empty/out
        if (newStock > 0 && (!data[i][5] || data[i][5] === 'Out of stock')) {
          sheet.getRange(i + 1, 6).setValue('In stock'); // Column F (status)
        }
        
        // Log the transaction
        const logResult = logReceiving(itemName, quantity, unitCost, supplier, logType, discrepancy);
        
        return { 
          success: true, 
          newStock: newStock,
          oldStock: currentStock,
          discrepancy: discrepancy,
          type: logType,
          logged: logResult,
          message: isStockCount ? 
            `Stock count completed: ${itemName} set to ${newStock} bottles (${discrepancy > 0 ? '+' : ''}${discrepancy} adjustment)` :
            `Successfully received ${quantity} of ${itemName}. New stock: ${newStock} bottles`
        };
      }
    }
    
    return { success: false, error: `Item "${itemName}" not found in inventory` };
    
  } catch (error) {
    console.error('Error in addReceiving:', error);
    return { success: false, error: error.toString() };
  }
}

function logReceiving(itemName, quantity, unitCost, supplier, logType, discrepancy = 0) {
  try {
    // Get or create receiving log sheet in the same spreadsheet
    const spreadsheet = SpreadsheetApp.openById(INVENTORY_SHEET_ID);
    let receivingSheet;
    
    try {
      receivingSheet = spreadsheet.getSheetByName('Receiving');
    } catch (e) {
      // Sheet doesn't exist, create it
      console.log('Creating new Receiving sheet...');
      receivingSheet = spreadsheet.insertSheet('Receiving');
      
      // Add headers
      receivingSheet.getRange(1, 1, 1, 8).setValues([[
        'Timestamp', 'Item Name', 'Quantity', 'Unit Cost', 'Total Cost', 'Supplier', 'Type', 'Notes'
      ]]);
      
      // Format header row
      const headerRange = receivingSheet.getRange(1, 1, 1, 8);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#dc2626');
      headerRange.setFontColor('white');
      
      console.log('✅ Created new Receiving log sheet');
    }
    
    // Verify we have a valid sheet
    if (!receivingSheet) {
      console.error('❌ Could not create or access Receiving sheet');
      return false;
    }
    
    // Prepare log entry
    const timestamp = new Date();
    const totalCost = logType === 'Stock Count' ? 0 : quantity * unitCost;
    const notes = logType === 'Stock Count' ? 
      `Stock count adjustment: ${discrepancy > 0 ? '+' : ''}${discrepancy}` : 
      'Regular receiving';
    
    // Add new log entry
    const newRow = [
      timestamp,
      itemName,
      quantity,
      unitCost,
      totalCost,
      supplier,
      logType,
      notes
    ];
    
    console.log('Adding row to Receiving sheet:', newRow);
    receivingSheet.appendRow(newRow);
    
    console.log(`✅ Logged ${logType}: ${quantity} of ${itemName} from ${supplier}`);
    return true;
    
  } catch (error) {
    console.error('❌ Error logging receiving:', error);
    console.error('Error details:', error.toString());
    return false;
  }
}

// =============================================================================
// STOCK CHECK FUNCTIONS
// =============================================================================

function searchInventory(query) {
  try {
    const inventory = getInventoryData();
    
    if (!query || query.length < 2) {
      return [];
    }
    
    // Search by item name (case insensitive)
    const matches = inventory.filter(item => 
      item.itemName && item.itemName.toLowerCase().includes(query.toLowerCase())
    );
    
    // Return top 10 matches
    return matches.slice(0, 10);
    
  } catch (error) {
    console.error('Error searching inventory:', error);
    return [];
  }
}

function getItemDetails(itemName) {
  try {
    const inventory = getInventoryData();
    const item = inventory.find(inv => inv.itemName === itemName);
    
    if (!item) {
      return { success: false, error: 'Item not found' };
    }
    
    // Get stock status
    let stockStatus = 'In Stock';
    if (item.stock <= 0) {
      stockStatus = 'Out of Stock';
    } else if (item.reorderPoint && item.stock <= item.reorderPoint) {
      stockStatus = 'Low Stock';
    }
    
    // Calculate total inventory value for this item
    const totalValue = (item.stock * item.unitCost) || 0;
    
    return {
      success: true,
      item: {
        ...item,
        stockStatus: stockStatus,
        totalValue: totalValue,
        lowStock: item.reorderPoint && item.stock <= item.reorderPoint
      }
    };
    
  } catch (error) {
    console.error('Error getting item details:', error);
    return { success: false, error: error.toString() };
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function convertCasesToBottles(itemName, caseQuantity) {
  try {
    const inventory = getInventoryData();
    const item = inventory.find(inv => inv.itemName === itemName);
    
    if (!item || !item.caseSize) {
      return { bottles: caseQuantity, caseSize: 1 }; // Assume single units if no case size
    }
    
    const bottles = caseQuantity * item.caseSize;
    return { bottles: bottles, caseSize: item.caseSize };
    
  } catch (error) {
    console.error('Error converting cases to bottles:', error);
    return { bottles: caseQuantity, caseSize: 1 };
  }
}

function getStockStatus(stock, reorderPoint) {
  if (stock <= 0) return 'out';
  if (reorderPoint && stock <= reorderPoint) return 'low';
  return 'good';
}

// =============================================================================
// ADMIN FUNCTIONS
// =============================================================================

function getSystemStats() {
  try {
    const inventory = getInventoryData();
    
    const totalItems = inventory.length;
    const inStock = inventory.filter(item => item.stock > 0).length;
    const outOfStock = inventory.filter(item => item.stock <= 0).length;
    const lowStock = inventory.filter(item => 
      item.reorderPoint && item.stock > 0 && item.stock <= item.reorderPoint
    ).length;
    
    const totalValue = inventory.reduce((sum, item) => 
      sum + (item.stock * item.unitCost || 0), 0
    );
    
    return {
      totalItems,
      inStock,
      outOfStock,
      lowStock,
      totalValue: totalValue.toFixed(2)
    };
    
  } catch (error) {
    console.error('Error getting system stats:', error);
    return null;
  }
}
