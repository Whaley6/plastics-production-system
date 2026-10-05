const fs = require('fs');
let code = fs.readFileSync('src/pages/SystemArchive.tsx', 'utf8');

const targetStrHead = `<th className="text-center px-6 py-4 font-semibold">Timestamp</th>
                    <th className="text-center px-6 py-4 font-semibold">Action</th>
                    <th className="text-center px-6 py-4 font-semibold w-full">Details</th>`;

const newStrHead = `<th className="text-center px-6 py-4 font-semibold">Timestamp</th>
                    <th className="text-center px-6 py-4 font-semibold">User</th>
                    <th className="text-center px-6 py-4 font-semibold">Action</th>
                    <th className="text-center px-6 py-4 font-semibold w-full">Details</th>`;

const targetStrBody = `<td className="text-center px-6 py-4 whitespace-nowrap text-xs text-muted">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="text-center px-6 py-4 whitespace-nowrap">`;

const newStrBody = `<td className="text-center px-6 py-4 whitespace-nowrap text-xs text-muted">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="text-center px-6 py-4 whitespace-nowrap text-xs text-secondary font-medium">
                        {log.user || 'System'}
                      </td>
                      <td className="text-center px-6 py-4 whitespace-nowrap">`;

if (code.includes(targetStrHead)) {
    code = code.replace(targetStrHead, newStrHead);
} else {
    console.log("Could not find table headers");
}

if (code.includes(targetStrBody)) {
    code = code.replace(targetStrBody, newStrBody);
} else {
    console.log("Could not find table body cells");
}

fs.writeFileSync('src/pages/SystemArchive.tsx', code);
console.log('Patched SystemArchive');
