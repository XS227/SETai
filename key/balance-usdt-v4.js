'use strict';
const LocalWalletBalance = (() => {
  const RPC_URL = 'https://ethereum-rpc.publicnode.com';
  // Ethereum mainnet USD₮ contract published by Tether.
  const USDT_CONTRACT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
  function formatUnits(hex, decimals) {
    if (typeof hex !== 'string' || !/^0x[0-9a-f]+$/i.test(hex) || hex.length > 66 || !Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw new Error('Ugyldig saldo fra nettverket.');
    const value = BigInt(hex);
    const unit = 10n ** BigInt(decimals);
    const fraction = (value % unit).toString().padStart(decimals, '0').replace(/0+$/, '');
    return (value / unit).toString() + (fraction ? '.' + fraction : '');
  }
  function parseResponse(data, asset) {
    if (!['eth','usdt'].includes(asset)) throw new Error('Ukjent valuta.');
    const expectedLength = asset === 'usdt' ? 3 : 2;
    if (!Array.isArray(data) || data.length !== expectedLength || new Set(data.map(item => item?.id)).size !== expectedLength) throw new Error('Uventet svar fra nettverket.');
    const chain = data.find(item => item?.id === 1);
    const balance = data.find(item => item?.id === 2);
    if (chain?.jsonrpc !== '2.0' || balance?.jsonrpc !== '2.0' || chain.error || balance.error || chain.result !== '0x1') throw new Error('Kunne ikke bekrefte Ethereum-saldoen.');
    if (asset === 'usdt') {
      const decimals = data.find(item => item?.id === 3);
      if (decimals?.jsonrpc !== '2.0' || decimals.error || !/^0x[0-9a-f]{64}$/i.test(decimals.result) || BigInt(decimals.result) !== 6n || !/^0x[0-9a-f]{64}$/i.test(balance.result)) throw new Error('Kunne ikke bekrefte USDT-kontrakten.');
    }
    return formatUnits(balance.result, asset === 'usdt' ? 6 : 18);
  }
  async function fetchBalance(address, asset, signal) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(address) || !['eth','usdt'].includes(asset)) throw new Error('Ugyldig adresse eller valuta.');
    const calls = [{jsonrpc:'2.0',id:1,method:'eth_chainId',params:[]}];
    if (asset === 'usdt') {
      calls.push({jsonrpc:'2.0',id:2,method:'eth_call',params:[{to:USDT_CONTRACT,data:'0x70a08231'+address.slice(2).toLowerCase().padStart(64,'0')},'latest']});
      calls.push({jsonrpc:'2.0',id:3,method:'eth_call',params:[{to:USDT_CONTRACT,data:'0x313ce567'},'latest']});
    } else calls.push({jsonrpc:'2.0',id:2,method:'eth_getBalance',params:[address,'latest']});
    const response = await fetch(RPC_URL, {
      method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal,body:JSON.stringify(calls)
    });
    if (!response.ok) throw new Error('Saldooppslaget er utilgjengelig akkurat nå.');
    return parseResponse(await response.json(), asset);
  }
  return {formatUnits,parseResponse,fetchBalance};
})();
