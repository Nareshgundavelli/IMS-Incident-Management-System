class AlertStrategy { async send(workItem){ return { routed: false, workItemId: workItem.id }; } }
class P0DatabaseAlert extends AlertStrategy { async send(w){ console.log(`[ALERT:P0] Paging DB primary responder for ${w.component_id}`); return { routed:true, channel:'pagerduty-db', severity:'P0' }; } }
class P1ApiAlert extends AlertStrategy { async send(w){ console.log(`[ALERT:P1] Notifying API on-call for ${w.component_id}`); return { routed:true, channel:'slack-api-oncall', severity:'P1' }; } }
class P2CacheAlert extends AlertStrategy { async send(w){ console.log(`[ALERT:P2] Posting cache warning for ${w.component_id}`); return { routed:true, channel:'slack-platform', severity:'P2' }; } }
class DefaultAlert extends AlertStrategy { async send(w){ console.log(`[ALERT:${w.severity}] Default route for ${w.component_id}`); return { routed:true, channel:'slack-general', severity:w.severity }; } }
function strategyFor(componentType, severity){ if(componentType === 'RDBMS' || severity === 'P0') return new P0DatabaseAlert(); if(componentType === 'API' || severity === 'P1') return new P1ApiAlert(); if(componentType === 'CACHE' || severity === 'P2') return new P2CacheAlert(); return new DefaultAlert(); }
module.exports = { strategyFor };
