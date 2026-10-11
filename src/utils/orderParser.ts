import { ProductionMachine } from '../pages/ProductionOrders';

export interface ParsedProductionOrder {
  machineName: string;
  itemName: string;
  granulesType: string;
  colorant: string;
  packagingDetails: string;
  unit: string;
  cratesQuantity: string;
  looseQuantity: string;
  quantity: number;
  cycleTime?: number;
  cavities?: number;
  hourlyRate?: number;
  rateMethod: 'cycle' | 'hourly';
  notes: string;
}

/**
 * Intelligent parser for Arabic and English production order specifications
 * Example input:
 * ماكنة 12
 * سطل لبن مطبوع البتول لبن جاموس 1400 غرام 
 * حبيبات Pe546
 * لون ابيض 006-10
 * تعبئة كارتون 342 عدد
 * الكمية 62 كارتون + 296 عدد
 */
export function parseOrderText(text: string, machines: ProductionMachine[] = []): ParsedProductionOrder | null {
  if (!text || typeof text !== 'string') return null;

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const result: ParsedProductionOrder = {
    machineName: '',
    itemName: '',
    granulesType: '',
    colorant: '',
    packagingDetails: '',
    unit: 'bags',
    cratesQuantity: '',
    looseQuantity: '',
    quantity: 0,
    cycleTime: undefined,
    cavities: undefined,
    hourlyRate: undefined,
    rateMethod: 'cycle',
    notes: ''
  };

  const unassignedLines: string[] = [];

  for (const line of lines) {
    let matched = false;

    // 1. Machine: ماكنة 12, ماكينة 12, مكينة 12, MK 12, Line 12, Machine 12
    const machMatch = line.match(/(?:ماكن[ةه]|ماكين[ةه]|مكين[ةه]|خط|لاين|machine|line|mk|blow|label)\s*[:=\-]?\s*(.+)/i);
    if (machMatch) {
      const rawMachStr = machMatch[1].trim();
      const numMatch = rawMachStr.match(/\d+/);
      const isBlow = /blow|نفخ/i.test(line);
      const isLabel = /label|ليبل/i.test(line);

      let found: ProductionMachine | undefined;
      if (numMatch) {
        const num = numMatch[0];
        if (isBlow) {
          found = machines.find(m => m.type === 'blow' && (m.m === num || m.name.toLowerCase().includes(num)));
        } else if (isLabel) {
          found = machines.find(m => m.type === 'label' && (m.m === num || m.name.toLowerCase().includes(num)));
        } else {
          found = machines.find(m => m.m === num || m.name.toLowerCase() === `mk ${num}` || m.name.toLowerCase() === num);
        }
      }

      if (!found) {
        found = machines.find(m => m.name.toLowerCase() === rawMachStr.toLowerCase() || m.name.toLowerCase().includes(rawMachStr.toLowerCase()));
      }

      if (found) {
        result.machineName = found.name;
        result.cycleTime = found.cycleTime;
        result.cavities = found.cavities;
        result.hourlyRate = found.hourlyRate;
        result.rateMethod = found.rateMethod || (found.type === 'blow' || found.type === 'label' ? 'hourly' : 'cycle');
      } else {
        if (numMatch) {
          result.machineName = isBlow ? `BLOW ${numMatch[0]}` : isLabel ? `LABEL ${numMatch[0]}` : `MK ${numMatch[0]}`;
        } else {
          result.machineName = rawMachStr;
        }
      }
      matched = true;
      continue;
    }

    // 2. Granules / Raw Material: حبيبات Pe546
    const granMatch = line.match(/(?:حبيبات|مادة\s*اولية|مادة\s*أولية|خام|مادة\s*خام|granules|resin|raw\s*material)\s*[:=\-]?\s*(.+)/i);
    if (granMatch) {
      let rawVal = granMatch[1].trim();
      // If formatted like Pe546, space cleanly to "Pe 546"
      rawVal = rawVal.replace(/^([a-zA-Z]+)(\d+)$/, '$1 $2');
      result.granulesType = rawVal;
      matched = true;
      continue;
    }

    // 3. Color / Masterbatch: لون ابيض 006-10
    const colorMatch = line.match(/(?:لون|اللون|ماسترباتش|صبغة|color(?:ant)?|masterbatch)\s*[:=\-]?\s*(.+)/i);
    if (colorMatch) {
      result.colorant = colorMatch[1].trim();
      matched = true;
      continue;
    }

    // 4. Packaging: تعبئة كارتون 342 عدد
    const packMatch = line.match(/(?:تعبئة|تعبئه|التعبئة|التعبئه|بكينج|pack(?:ing|aging)?)\s*[:=\-]?\s*(.+)/i);
    if (packMatch) {
      const packVal = packMatch[1].trim();
      const numInPack = packVal.match(/\b\d+\b/);
      if (numInPack) {
        result.packagingDetails = numInPack[0];
      } else {
        result.packagingDetails = packVal;
      }
      if (/كيس|bag/i.test(line)) {
        result.unit = 'bags';
      } else if (/كارتون|كرتون|box/i.test(line)) {
        result.unit = 'bags';
      }
      matched = true;
      continue;
    }

    // 5. Quantity: الكمية 62 كارتون + 296 عدد
    const qtyMatch = line.match(/(?:الكمية|الكميه|كمية|كميه|الطلب|quantity|qty)\s*[:=\-]?\s*(.+)/i);
    if (qtyMatch) {
      const qtyVal = qtyMatch[1].trim();

      const cratesM = qtyVal.match(/(\d+)\s*(?:كارتون|كرتون|كرتونة|صندوق|box|boxes|crate|crates|كيس|bag|bags)/i);
      if (cratesM) {
        result.cratesQuantity = cratesM[1];
      }

      const looseM = qtyVal.match(/(?:\+\s*|\bو\s*)?(\d+)\s*(?:عدد|قطعة|قطعه|حبه|حبة|فرط|pcs|pieces)?$/i) 
                  || qtyVal.match(/\+\s*(\d+)/);
      if (looseM && (!cratesM || looseM[1] !== cratesM[1])) {
        result.looseQuantity = looseM[1];
      }

      if (!cratesM && !looseM) {
        const plainNum = qtyVal.match(/\b\d+\b/);
        if (plainNum) {
          result.quantity = parseInt(plainNum[0], 10);
        }
      }

      matched = true;
      continue;
    }

    // 6. Direct line with pure boxes + loose: e.g. "62 كارتون + 296 عدد"
    const directQtyLine = line.match(/(\d+)\s*(?:كارتون|كرتون|كيس|box)\s*\+\s*(\d+)/i);
    if (directQtyLine) {
      result.cratesQuantity = directQtyLine[1];
      result.looseQuantity = directQtyLine[2];
      matched = true;
      continue;
    }

    if (!matched) {
      unassignedLines.push(line);
    }
  }

  // From unassigned lines, assign Item Name
  if (!result.itemName && unassignedLines.length > 0) {
    const itemPrefixLine = unassignedLines.find(l => /^(?:المادة|الماده|مادة|ماده|المنتج|منتج|item|product)\s*[:=\-]?/i.test(l));
    if (itemPrefixLine) {
      result.itemName = itemPrefixLine.replace(/^(?:المادة|الماده|مادة|ماده|المنتج|منتج|item|product)\s*[:=\-]?\s*/i, '').trim();
    } else {
      result.itemName = unassignedLines[0];
    }
  }

  // Calculate target quantity: (crates * packPcs) + loose
  const cQty = parseInt(result.cratesQuantity || '0', 10);
  const lQty = parseInt(result.looseQuantity || '0', 10);
  const packPcs = parseInt(result.packagingDetails || '0', 10);

  if (cQty > 0 && packPcs > 0) {
    result.quantity = (cQty * packPcs) + lQty;
  } else if (!result.quantity && (cQty > 0 || lQty > 0)) {
    result.quantity = lQty > 0 ? lQty : cQty;
  }

  return result;
}
