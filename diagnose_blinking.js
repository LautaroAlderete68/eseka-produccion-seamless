function matchStyleAlert(alertStyle, rowArticulo) {
  if (!alertStyle || !rowArticulo) return false;
  
  const cleanAlert = String(alertStyle).trim().toUpperCase();
  const cleanRow = String(rowArticulo).trim().toUpperCase().replace(',', '.');
  
  if (cleanAlert === cleanRow) return true;

  const rowParts = cleanRow.split('.');
  const rowBase = parseInt(rowParts[0], 10);
  const rowDecimal = rowParts[1] || '';

  const alertMatch = cleanAlert.match(/^\d+/);
  if (!alertMatch) return false;
  
  const alertDigits = alertMatch[0];
  const alertBase = alertDigits.length >= 5 
    ? parseInt(alertDigits.substring(0, 5), 10) 
    : parseInt(alertDigits, 10);

  if (alertBase !== rowBase) return false;

  if (rowDecimal !== '') {
    const lastChar = cleanAlert.substring(cleanAlert.length - 1);
    return rowDecimal === lastChar;
  }

  return true;
}

const testAlerts = ['020018D1', '020018D2', '020018D3'];
const articlos = ["2001.1", "2001,2", "2001.3", "2001"];

console.log('--- TEST NEW MATCH LOGIC ---');
testAlerts.forEach(alert => {
  articlos.forEach(art => {
    const isMatch = matchStyleAlert(alert, art);
    console.log(`matchStyleAlert(alert="${alert}", art="${art}") => ${isMatch}`);
  });
});
