import React, { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useClientStorage } from '../hooks/useClientStorage';
import { useAuth } from '../hooks/useAuth';
import { defaultRoles } from './Roles';
import { logAction } from '../utils/logger';
import { Factory, Plus, Edit, Trash2, BrainCircuit, X, Play, RefreshCw, CheckCircle, XCircle, Activity } from 'lucide-react';

export interface InjectionMachine {
  id: string;
  name: string;
  description?: string;
  usedMaterial: string;
  filler: string;
  mold: string;
  quantityInPlasticBag: number | '';
  quantityInCarton: number | '';
  usedNylonWithoutCrate: string;
  usedNylonWithCrate: string;
  usedCrate: string;
  usedHandle: string;
  packageOfHandle: string;
}

const INITIAL_MACHINE: InjectionMachine = {
  id: '',
  name: '',
  description: '',
  usedMaterial: '',
  filler: '',
  mold: '',
  quantityInPlasticBag: '',
  quantityInCarton: '',
  usedNylonWithoutCrate: '',
  usedNylonWithCrate: '',
  usedCrate: '',
  usedHandle: '',
  packageOfHandle: '',
};

export default function MachineDirectory() {
  const [, setCurrentPage] = useClientStorage<string>('currentPage', 'machines');
  const [machines, setMachines] = useLocalStorage<InjectionMachine[]>('machines_data_v2', []);
  const [prodMachines] = useLocalStorage<any[]>('production_machines_v11', []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [currentMachine, setCurrentMachine] = useState<InjectionMachine>(INITIAL_MACHINE);

  const handleOpenModal = (machine?: InjectionMachine) => {
    setCurrentMachine(machine || { ...INITIAL_MACHINE, id: Date.now().toString() });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentMachine(INITIAL_MACHINE);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setMachines(prev => {
      const existingMachine = prev.find(m => m.id === currentMachine.id);
      if (existingMachine) {
        const changes = Object.keys(currentMachine).filter(k => {
          const oldVal = (existingMachine as any)[k];
          const newVal = (currentMachine as any)[k];
          if (typeof oldVal === 'object' || typeof newVal === 'object') return false;
          return oldVal !== newVal;
        });
        const changeDetails = changes.map(k => `${k}: ${(existingMachine as any)[k]} -> ${(currentMachine as any)[k]}`).join(', ');
        logAction('Machine Updated', `Machine ${currentMachine.name} was updated.${changeDetails ? ` Changes: ${changeDetails}` : ''}`, 'info');
        return prev.map(m => m.id === currentMachine.id ? currentMachine : m);
      }
      const detailsArray = Object.entries(currentMachine).filter(([k,v]) => v !== undefined && k !== 'id').map(([k,v]) => `${k}: ${v}`).join(', ');
      logAction('Machine Created', `Machine ${currentMachine.name} was added. Added: ${detailsArray}`, 'success');
      return [...prev, currentMachine];
    });
    handleCloseModal();
  };

  const [trash, setTrash] = useLocalStorage<any[]>('trash_data', []);

  const handleDelete = (id: string) => {
    const machine = machines.find(m => m.id === id);
    if (!machine) return;

    if (confirm(`Move machine "${machine.name}" to trash? It can be restored within 30 days.`)) {
      const trashItem = {
        id: machine.id,
        type: 'machine',
        name: machine.name,
        data: machine,
        deletedAt: new Date().toISOString()
      };
      setTrash(prev => [...prev, trashItem]);
      setMachines(prev => prev.filter(m => m.id !== id));
      logAction('Machine Deleted', `Machine ${machine.name} was moved to trash. Removed: name: ${machine.name}, usedMaterial: ${machine.usedMaterial}, mold: ${machine.mold}`, 'warning');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentMachine(prev => {
      const updates: any = {
        [name]: name.startsWith('quantity') ? (value ? Number(value) : '') : value
      };
      
      if (name === 'name') {
        const selectedProdMachine = prodMachines.find(m => m.name === value);
        if (selectedProdMachine && selectedProdMachine.moldName) {
          updates.description = selectedProdMachine.moldName;
        }
      }
      
      return { ...prev, ...updates };
    });
  };

  return (
    <div className="flex flex-col gap-6 h-full pb-4 text-primary">
      <div className="flex justify-between items-center shrink-0 border-b border-divider pb-4">
        <div>
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <Factory className="w-5 h-5 text-blue-500" />
            Machine Directory
          </h1>
          <p className="text-xs text-tertiary mt-1">Manage injection machine specifications and configurations.</p>
        </div>
        <div className="flex gap-3">
          <button type="button"
            onClick={() => setCurrentPage('machine-health')}
            className="flex items-center gap-2 px-3.5 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-500/20 transition-colors text-sm font-medium"
          >
            <Activity className="w-4 h-4" />
            Health & Downtime Trends
          </button>
          <button type="button"
            onClick={() => setIsGameOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 text-purple-500 border border-purple-500/30 rounded-lg hover:bg-purple-500/20 transition-colors text-sm font-medium"
          >
            <BrainCircuit className="w-4 h-4" />
            Memory Game
          </button>
          <button type="button"
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Machine
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {machines.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-tertiary">
            <Factory className="w-12 h-12 mb-4 opacity-50 text-blue-500" />
            <p>No machines configured yet.</p>
            <button type="button" onClick={() => handleOpenModal()} className="mt-4 text-blue-500 hover:text-blue-400 text-sm">
              Click here to add your first machine.
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {machines.map(machine => (
              <div key={machine.id} className="bg-surface border border-divider rounded-xl hover:border-blue-500/50 transition-colors shadow-sm overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-divider flex justify-between items-center bg-surface-elevated/30">
                  <div>
                    <h3 className="font-bold text-lg text-primary">{machine.name}</h3>
                    {machine.description && <p className="text-xs text-tertiary mt-0.5">{machine.description}</p>}
                  </div>
                  <div className="flex gap-1.5 shrink-0 ml-2">
                    <button type="button" onClick={() => handleOpenModal(machine)} className="p-1.5 text-tertiary hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors" title="Edit">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => handleDelete(machine.id)} className="p-1.5 text-tertiary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-5 flex-1 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div className="text-tertiary text-xs">Used Material:</div><div className="font-medium text-secondary truncate"><bdi dir="auto">{machine.usedMaterial || '-'}</bdi></div>
                  <div className="text-tertiary text-xs">Filler:</div><div className="font-medium text-secondary truncate"><bdi dir="auto">{machine.filler || '-'}</bdi></div>
                  <div className="text-tertiary text-xs">Mold:</div><div className="font-medium text-secondary truncate"><bdi dir="auto">{machine.mold || '-'}</bdi></div>
                  <div className="text-tertiary text-xs">Qty / Plastic Bag:</div><div className="font-medium text-secondary"><bdi dir="auto">{machine.quantityInPlasticBag || '-'}</bdi></div>
                  <div className="text-tertiary text-xs">Qty / Carton:</div><div className="font-medium text-secondary"><bdi dir="auto">{machine.quantityInCarton || '-'}</bdi></div>
                  <div className="text-tertiary text-xs">Nylon (w/o Crate):</div><div className="font-medium text-secondary truncate" title={machine.usedNylonWithoutCrate}><bdi dir="auto">{machine.usedNylonWithoutCrate || '-'}</bdi></div>
                  <div className="text-tertiary text-xs">Nylon (w/ Crate):</div><div className="font-medium text-secondary truncate" title={machine.usedNylonWithCrate}><bdi dir="auto">{machine.usedNylonWithCrate || '-'}</bdi></div>
                  <div className="text-tertiary text-xs">Used Crate:</div><div className="font-medium text-secondary truncate" title={machine.usedCrate}><bdi dir="auto">{machine.usedCrate || '-'}</bdi></div>
                  <div className="text-tertiary text-xs">Used Handle:</div><div className="font-medium text-secondary truncate"><bdi dir="auto">{machine.usedHandle || '-'}</bdi></div>
                  <div className="text-tertiary text-xs">Pkg of Handle:</div><div className="font-medium text-secondary truncate"><bdi dir="auto">{machine.packageOfHandle || '-'}</bdi></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-canvas border border-divider rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-divider flex justify-between items-center bg-surface/30 shrink-0">
              <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                <Factory className="w-5 h-5 text-blue-500" />
                {currentMachine.id && machines.some(m => m.id === currentMachine.id) ? 'Edit Machine' : 'Add Machine'}
              </h2>
              <button type="button" onClick={handleCloseModal} className="p-1 hover:bg-surface-elevated rounded-full transition-colors text-tertiary hover:text-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-tertiary mb-1">Machine ID <span className="text-red-500">*</span></label>
                  <select required name="name" value={currentMachine.name} onChange={handleChange} className="w-full bg-surface-elevated border border-divider rounded-lg px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-shadow">
                    <option value="" disabled>Select Machine ID</option>
                    {prodMachines.map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-tertiary mb-1">Machine Name</label>
                  <input name="description" value={currentMachine.description || ''} onChange={handleChange} placeholder="e.g., MK 2 - 1700 Sulaymani" className="w-full bg-surface-elevated border border-divider rounded-lg px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-shadow" />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-tertiary mb-1">Used Material</label>
                  <input name="usedMaterial" value={currentMachine.usedMaterial} onChange={handleChange} placeholder="e.g., EP54su" className="w-full bg-surface-elevated border border-divider rounded-lg px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-shadow" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-tertiary mb-1">Filler (if used)</label>
                  <input name="filler" value={currentMachine.filler} onChange={handleChange} placeholder="e.g., HP500" className="w-full bg-surface-elevated border border-divider rounded-lg px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-shadow" />
                </div>
                
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-medium text-tertiary mb-1">Mold</label>
                  <input name="mold" value={currentMachine.mold} onChange={handleChange} placeholder="e.g., 1500 or 1700 Sulaymani" className="w-full bg-surface-elevated border border-divider rounded-lg px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-shadow" />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-tertiary mb-1">Quantity in Plastic Bag</label>
                  <input type="number" name="quantityInPlasticBag" value={currentMachine.quantityInPlasticBag} onChange={handleChange} placeholder="e.g., 150" className="w-full bg-surface-elevated border border-divider rounded-lg px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-shadow" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-tertiary mb-1">Quantity in Carton</label>
                  <input type="number" name="quantityInCarton" value={currentMachine.quantityInCarton} onChange={handleChange} placeholder="e.g., 288" className="w-full bg-surface-elevated border border-divider rounded-lg px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-shadow" />
                </div>
                
                <div className="col-span-1 md:col-span-2 opacity-50 flex items-center gap-2 my-2">
                  <div className="h-px flex-1 bg-divider"></div>
                  <span className="text-[10px] uppercase tracking-widest">Packaging Specifics</span>
                  <div className="h-px flex-1 bg-divider"></div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-tertiary mb-1">Used Nylon (Without Crate)</label>
                  <input name="usedNylonWithoutCrate" value={currentMachine.usedNylonWithoutCrate} onChange={handleChange} placeholder="e.g., 50*100 without crate" className="w-full bg-surface-elevated border border-divider rounded-lg px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-shadow" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-tertiary mb-1">Used Nylon (With Crate)</label>
                  <input name="usedNylonWithCrate" value={currentMachine.usedNylonWithCrate} onChange={handleChange} placeholder="e.g., 132*116 with crate" className="w-full bg-surface-elevated border border-divider rounded-lg px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-shadow" />
                </div>
                
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-medium text-tertiary mb-1">Used Crate</label>
                  <input name="usedCrate" value={currentMachine.usedCrate} onChange={handleChange} placeholder="e.g., كارتون ارض الهمة كبير" className="w-full bg-surface-elevated border border-divider rounded-lg px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-shadow" />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-tertiary mb-1">Used Handle</label>
                  <input name="usedHandle" value={currentMachine.usedHandle} onChange={handleChange} placeholder="e.g., ()" className="w-full bg-surface-elevated border border-divider rounded-lg px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-shadow" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-tertiary mb-1">Package of the Handle</label>
                  <input name="packageOfHandle" value={currentMachine.packageOfHandle} onChange={handleChange} placeholder="e.g., 6800 or 2500" className="w-full bg-surface-elevated border border-divider rounded-lg px-4 py-2.5 text-primary focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-shadow" />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 pb-2">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary hover:bg-surface-elevated rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Save Machine Details</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isGameOpen && <MemoryGameModal machines={machines} onClose={() => setIsGameOpen(false)} />}
    </div>
  );
}

// Memory Game Component
function MemoryGameModal({ machines, onClose }: { machines: InjectionMachine[], onClose: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameMachines, setGameMachines] = useState<InjectionMachine[]>([]);
  const [currentMachineIndex, setCurrentMachineIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  
  // Quiz state
  const [questionField, setQuestionField] = useState<keyof InjectionMachine>('mold');
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const fieldsForQuiz: { key: keyof InjectionMachine; label: string }[] = [
    { key: 'usedMaterial', label: 'Used Material' },
    { key: 'filler', label: 'Filler' },
    { key: 'mold', label: 'Mold' },
    { key: 'usedCrate', label: 'Used Crate' },
    { key: 'packageOfHandle', label: 'Package of Handle' }
  ];

  const startGame = () => {
    if (machines.length < 2) {
      alert("You need at least 2 machines added to play the memory game!");
      return;
    }
    const shuffled = [...machines].sort(() => 0.5 - Math.random()).slice(0, Math.min(10, machines.length));
    setGameMachines(shuffled);
    setCurrentMachineIndex(0);
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
    generateTurn(shuffled, 0);
  };

  const generateTurn = (machineList: InjectionMachine[], currentIndex: number) => {
    // Pick a random field to ask about
    const randomField = fieldsForQuiz[Math.floor(Math.random() * fieldsForQuiz.length)];
    setQuestionField(randomField.key);
    
    const currentMachine = machineList[currentIndex];
    const correctAnswer = String(currentMachine[randomField.key] || 'None/Empty');
    
    // Generate 3 wrong options from other machines
    const wrongOptionsSet = new Set<string>();
    machines.forEach(m => {
      const val = String(m[randomField.key] || 'None/Empty');
      if (val !== correctAnswer) wrongOptionsSet.add(val);
    });
    
    let wrongOptions = Array.from(wrongOptionsSet);
    wrongOptions = wrongOptions.sort(() => 0.5 - Math.random()).slice(0, 3);
    
    // Fill with random strings if not enough unique options
    let backupCounter = 1;
    while(wrongOptions.length < 3) {
       wrongOptions.push(`Dummy Option ${backupCounter++}`);
    }

    const allOptions = [...wrongOptions, correctAnswer].sort(() => 0.5 - Math.random());
    setOptions(allOptions);
    setSelectedAnswer(null);
  };

  const handleAnswer = (option: string) => {
    if (selectedAnswer !== null) return; // Prevent double clicking
    
    const currentMachine = gameMachines[currentMachineIndex];
    const correctAnswer = String(currentMachine[questionField] || 'None/Empty');
    
    const correct = option === correctAnswer;
    setSelectedAnswer(option);
    
    if (correct) {
      setScore(s => s + 1);
    }

    setTimeout(() => {
      if (currentMachineIndex + 1 < gameMachines.length) {
        setCurrentMachineIndex(i => i + 1);
        generateTurn(gameMachines, currentMachineIndex + 1);
      } else {
        setGameOver(true);
      }
    }, 1500);
  };

  const activeFieldLabel = fieldsForQuiz.find(f => f.key === questionField)?.label;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-canvas border border-divider rounded-xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-divider flex justify-between items-center bg-purple-500/10 shrink-0">
          <h2 className="text-lg font-bold text-purple-400 flex items-center gap-2">
            <BrainCircuit className="w-5 h-5" />
            Machine Memory Game
          </h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-surface-elevated rounded-full transition-colors text-tertiary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center">
          {!isPlaying && !gameOver ? (
            <div className="text-center py-8">
              <BrainCircuit className="w-20 h-20 text-purple-500 mx-auto mb-6 opacity-90 drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]" />
              <h3 className="text-2xl font-bold mb-3 text-primary">Test your knowledge!</h3>
              <p className="text-sm text-tertiary mb-10 max-w-[280px] mx-auto leading-relaxed">
                Practice remembering the materials, molds, and configurations for your injection machines.
              </p>
              <button type="button" 
                onClick={startGame}
                className="flex items-center gap-2 px-8 py-3.5 bg-purple-600 text-white rounded-full hover:bg-purple-500 transition-colors font-bold shadow-lg shadow-purple-500/25"
              >
                <Play className="w-5 h-5 fill-current" />
                Start Training
              </button>
            </div>
          ) : gameOver ? (
            <div className="text-center py-8 w-full">
              <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-blue-500 mb-4 drop-shadow-sm">
                {score} / {gameMachines.length}
              </div>
              <p className="text-lg text-secondary font-medium mb-10">
                {score === gameMachines.length ? 'Perfect Memory! Outstanding.' : 'Good effort! Keep practicing your specs.'}
              </p>
              <div className="flex justify-center gap-4">
                <button type="button" 
                  onClick={startGame}
                  className="flex items-center gap-2 px-6 py-3 bg-surface-elevated border border-divider text-primary rounded-lg hover:bg-surface-strong transition-colors font-medium text-sm"
                >
                  <RefreshCw className="w-4 h-4" /> Play Again
                </button>
                <button type="button" 
                  onClick={onClose}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm shadow-sm"
                >
                  Back to Directory
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full">
              <div className="flex justify-between items-center mb-8">
                <div className="text-xs text-tertiary uppercase tracking-wider font-semibold bg-surface-elevated px-4 py-2 rounded-lg">
                  Machine {currentMachineIndex + 1} of {gameMachines.length}
                </div>
                <div className="text-sm font-bold text-purple-400 bg-purple-500/10 px-4 py-2 rounded-lg">
                  Score: {score}
                </div>
              </div>
              
              <div className="text-center mb-10">
                <div className="text-sm text-tertiary mb-2">What is the <span className="font-bold text-blue-400">{activeFieldLabel}</span> for</div>
                <div className="text-3xl font-black text-primary bg-surface border-2 border-divider py-5 px-8 rounded-2xl inline-block shadow-sm">
                  {gameMachines[currentMachineIndex]?.name}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {options.map((option, i) => {
                  let btnStateClass = "bg-surface border-2 border-divider hover:border-purple-500/60 hover:bg-purple-500/5 cursor-pointer";
                  let Icon = null;
                  
                  if (selectedAnswer !== null) {
                    const isTheCorrectOption = option === String(gameMachines[currentMachineIndex][questionField] || 'None/Empty');
                    if (isTheCorrectOption) {
                      btnStateClass = "bg-emerald-500/10 border-2 border-emerald-500/50 text-emerald-500 z-10";
                      Icon = <CheckCircle className="w-5 h-5 text-emerald-500" />;
                    } else if (selectedAnswer === option) {
                      btnStateClass = "bg-red-500/10 border-2 border-red-500/50 text-red-500 z-10";
                      Icon = <XCircle className="w-5 h-5 text-red-500" />;
                    } else {
                      btnStateClass = "bg-surface opacity-40 border-2 border-divider cursor-default";
                    }
                  }

                  return (
                    <button type="button"
                      key={i}
                      disabled={selectedAnswer !== null}
                      onClick={() => handleAnswer(option)}
                      className={`p-4 rounded-xl transition-all font-medium flex justify-between items-center shadow-sm ${btnStateClass}`}
                    >
                      <span className={selectedAnswer === null ? "text-secondary" : ""}>{option}</span>
                      {Icon}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
