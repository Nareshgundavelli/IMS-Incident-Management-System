const allowed = { OPEN:['INVESTIGATING'], INVESTIGATING:['RESOLVED'], RESOLVED:['CLOSED','INVESTIGATING'], CLOSED:[] };
function isCompleteRca(rca){ return !!(rca && rca.incident_start && rca.incident_end && rca.root_cause_category && rca.fix_applied && rca.prevention_steps); }
function validateTransition(from, to, rca){ if(!allowed[from] || !allowed[from].includes(to)){ throw new Error(`Invalid transition ${from} -> ${to}`); } if(to === 'CLOSED' && !isCompleteRca(rca)){ throw new Error('Cannot close incident without complete RCA'); } return true; }
module.exports = { validateTransition, isCompleteRca, allowed };
