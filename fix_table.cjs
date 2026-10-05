const fs = require('fs');
let content = fs.readFileSync('src/pages/AuxiliaryMaintenance.tsx', 'utf-8');

content = content.replace(
  /<th className="px-4 py-3 font-semibold">Work \/ Details<\/th>\s*\.map\(\(wo\) => \(/,
  `<th className="px-4 py-3 font-semibold">Work / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {workOrders
                  .filter(wo => (wo.category || 'GENERATORS') === activeCategory)
                  .filter(wo => (wo.machineName || '').toLowerCase().includes(searchQuery.toLowerCase()) || (wo.workDetails || '').toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((wo) => (`
);

fs.writeFileSync('src/pages/AuxiliaryMaintenance.tsx', content);
