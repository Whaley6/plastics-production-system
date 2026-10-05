const fs = require('fs');

const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacement = `const PageContent = ({ page, isDarkMode, setIsDarkMode, textScale, setTextScale }: { page: Page, isDarkMode: boolean, setIsDarkMode: any, textScale: number, setTextScale: any }) => {
   switch (page) {
     case 'workers': return <WorkerManagement />;
     case 'maintenance': return <MaintenanceOrders />;
     case 'auxiliary': return <AuxiliaryMaintenance />;
     case 'production': return <ProductionOrders />;
     case 'complaints': return <WorkerKPIs />;
     case 'machines': return <MachineDirectory />;
     case 'archive': return <SystemArchive />;
     case 'cnc': return <CncMoldTickets />;
     case 'settings': return <Settings isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} textScale={textScale} setTextScale={setTextScale} />;
     case 'account': return <Account />;
     case 'roles': return <Roles />;
     default: return <WorkerManagement />;
   }
};

export default function App() {`;

content = content.replace('export default function App() {', replacement);

const renderPageRegex = /const renderPage = \(\) => \{[\s\S]*?\};\s*if \(\!user\)/;
content = content.replace(renderPageRegex, 'if (!user)');

content = content.replace('{renderPage()}', '<PageContent page={currentPage} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} textScale={textScale} setTextScale={setTextScale} />');

fs.writeFileSync(file, content);
console.log('Patched App.tsx');
