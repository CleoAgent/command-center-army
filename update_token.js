const fs = require('fs');
const file = '/home/node/.openclaw/workspace/command-center/integrations.json';
const data = JSON.parse(fs.readFileSync(file));
data.printful = '9FDQtSlZ85IjkMrOobGNWrGojaL7M9b0tuy8Psq6';
fs.writeFileSync(file, JSON.stringify(data, null, 2));
