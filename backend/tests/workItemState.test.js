const { validateTransition, isCompleteRca } = require('../src/patterns/workItemState');
test('rejects closing without RCA', ()=>{ expect(()=>validateTransition('RESOLVED','CLOSED', null)).toThrow(/RCA/); });
test('accepts closing with complete RCA', ()=>{ expect(validateTransition('RESOLVED','CLOSED',{incident_start:'2026-05-01T00:00:00Z', incident_end:'2026-05-01T00:10:00Z', root_cause_category:'DB', fix_applied:'Restarted primary', prevention_steps:'Add read replica'})).toBe(true); });
test('validates RCA completeness', ()=>{ expect(isCompleteRca({incident_start:'a'})).toBe(false); });
