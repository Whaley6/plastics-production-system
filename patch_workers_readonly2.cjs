const fs = require('fs');
let code = fs.readFileSync('src/pages/WorkerManagement.tsx', 'utf8');

// Hide edit button block
const editBtnTarget = `<button onClick={() => handleEdit(worker)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors">
                            <Pencil className="w-4 h-4" /> Edit Details
                          </button>`;
const editBtnReplacement = `{!isReadOnly && (
                          <button onClick={() => handleEdit(worker)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors">
                            <Pencil className="w-4 h-4" /> Edit Details
                          </button>
                        )}`;
if(code.includes(editBtnTarget)) {
  code = code.replace(editBtnTarget, editBtnReplacement);
}

// Hide delete button block
const delBtnTarget = `<button onClick={() => handleDelete(worker)} className="p-2 text-red-400 bg-red-400/10 rounded-lg hover:bg-red-400/20 transition-colors" title="Delete Worker">
                            <Trash2 className="w-4 h-4" />
                          </button>`;
const delBtnReplacement = `{!isReadOnly && (
                          <button onClick={() => handleDelete(worker)} className="p-2 text-red-400 bg-red-400/10 rounded-lg hover:bg-red-400/20 transition-colors" title="Delete Worker">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}`;
if(code.includes(delBtnTarget)) {
  code = code.replace(delBtnTarget, delBtnReplacement);
}

// Ensure isReadOnly check on new worker
const newBtnTarget = `<button onClick={() => setIsAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors">
              <Plus className="w-4 h-4" /> New Worker
            </button>`;
const newBtnReplacement = `{!isReadOnly && (
            <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors">
              <Plus className="w-4 h-4" /> New Worker
            </button>
            )}`;
if(code.includes(newBtnTarget)) {
  code = code.replace(newBtnTarget, newBtnReplacement);
}

fs.writeFileSync('src/pages/WorkerManagement.tsx', code);
