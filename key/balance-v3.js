'use strict';
const LocalWalletBalance = (() => {
  const RPC_URL = 'https://ethereum-rpc.publicnode.com';
  function formatWei(hex) {
    if (typeof hex !== 'string' || !/^0x[0-9a-f]+$/i.test(hex) || hex.length > 66) throw new Error('Ugyldig saldo fra nettverket.');
    const wei = BigInt(hex);
    const unit = 1000000000000000000n;
    const fraction = (wei % unit).toString().padStart(18, '0').replace(/0+$/, '');
    return (wei / unit).toString() + (fraction ? '.' + fraction : '');
  }
  function parseResponse(data) {
    if (!Array.isArray(data) || data.length !== 2) throw new Error('Uventet svar fra nettverket.');
    const chain = data.find(item => item?.id === 1);
    const balance = data.find(item => item?.id === 2);
    if (chain?.jsonrpc !== '2.0' || balance?.jsonrpc !== '2.0' || chain.error || balance.error || chain.result !== '0x1') throw new Error('Kunne ikke bekrefte Ethereum-saldoen.');
    return formatWei(balance.result);
  }
  async function fetchEthereumBalance(address, signal) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error('Ugyldig wallet-adresse.');
    const response = await fetch(RPC_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal,
      body: JSON.stringify([
        {jsonrpc:'2.0', id:1, method:'eth_chainId', params:[]},
        {jsonrpc:'2.0', id:2, method:'eth_getBalance', params:[address,'latest']}
      ])
    });
    if (!response.ok) throw new Error('Saldooppslaget er utilgjengelig akkurat nå.');
    return parseResponse(await response.json());
  }
  return { formatWei, parseResponse, fetchEthereumBalance };
})();
