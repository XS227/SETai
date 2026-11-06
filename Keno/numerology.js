/* SETAEI Keno numerology engine (setaei-keno-numerology-v1).
 * Thin wrapper: the algorithm lives in the shared engine (/forskning/engine.js), pool = 70.
 * Output is byte-identical to the original standalone version (see tests/forskning_engine.test.js). */
(function(root){
 'use strict';
 var E=(typeof module!=='undefined'&&module.exports)?require('../forskning/engine.js'):root.SETAEI_ENGINE;
 if(!E)throw Error('Mangler /forskning/engine.js');
 var api=E.numerology(70,'setaei-keno-numerology-v1');
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KENO_NUMEROLOGY=api;
})(typeof window!=='undefined'?window:globalThis);
